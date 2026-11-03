# Code Execution Engine

A TypeScript backend for managing programming problems, accepting source-code submissions, and evaluating each submission against stored test cases in isolated Docker containers. The system separates problem management, submission tracking, and code execution into three services, and uses PostgreSQL for durable records and Redis with BullMQ for asynchronous evaluation.

A submission request is validated against the ProblemService API, persisted with a `pending` status, and placed on a BullMQ queue. EvaluationService consumes the job, runs the submitted program for each test case in a constrained container, determines the result, and calls SubmissionService to persist the final status.

## What the system provides

- Problem authoring with sanitized Markdown statements and editorials.
- Test cases stored as rows related to their problem.
- Problem listing, search by title or description, and difficulty filtering.
- Submission records with a clear evaluation status lifecycle.
- Asynchronous evaluation through Redis and BullMQ, so code execution does not run in the submission HTTP request.
- Python and C++ execution in short-lived Docker containers with CPU, memory, process-count, and network restrictions.
- Postman collection and environment files for exercising the HTTP routes.

## Services and responsibilities

| Service | Responsibility | Local HTTP port | State / dependency |
| --- | --- | ---: | --- |
| ProblemService | Creates, reads, searches, updates, and deletes problems and test cases. | `3000` | PostgreSQL database `problemDB`, host port `5433` |
| SubmissionService | Validates submissions, verifies the problem through ProblemService, persists submissions, publishes evaluation jobs, and exposes submission query/status routes. | `3001` | PostgreSQL database `submissionDB`, host port `5434`; Redis host port `6380` |
| EvaluationService | Runs a BullMQ worker, executes test cases in Docker, decides the verdict, and updates SubmissionService. | `3002` | Redis host port `6380`; Docker daemon and language images |

EvaluationService starts an Express server for its process lifecycle and worker startup, but it does not register HTTP routes. Clients use ProblemService and SubmissionService directly. There is no API Gateway in this repository.

## Architecture

```mermaid
flowchart LR
    Client[Postman or client]
    ProblemAPI[ProblemService HTTP API :3000]
    SubmissionAPI[SubmissionService HTTP API :3001]
    Evaluation[EvaluationService worker :3002]
    ProblemDB[(Problem PostgreSQL problemDB :5433)]
    SubmissionDB[(Submission PostgreSQL submissionDB :5434)]
    Redis[(Redis :6380 BullMQ queue)]
    Docker[Short-lived Docker containers]

    Client -->|Problem CRUD and search| ProblemAPI
    ProblemAPI --> ProblemDB
    Client -->|Create and inspect submissions| SubmissionAPI
    SubmissionAPI -->|GET /problems/:id| ProblemAPI
    SubmissionAPI --> SubmissionDB
    SubmissionAPI -->|enqueue evaluate-submission| Redis
    Redis -->|submission-queue| Evaluation
    Evaluation --> Docker
    Evaluation -->|PATCH /submissions/:submissionId/status| SubmissionAPI
```

ProblemService owns problem definitions and test cases. SubmissionService owns submission records. The `problemId` in a submission is a logical cross-service reference; it is verified by calling ProblemService when a submission is created. There is no cross-database foreign key.

## Data model

### Problem database

```mermaid
erDiagram
    PROBLEMS ||--|{ TESTCASES : contains

    PROBLEMS {
        uuid id PK
        varchar title UK
        text description
        enum difficulty "easy, medium, hard"
        text editorial "nullable"
        timestamptz created_at
        timestamptz updated_at
    }
    TESTCASES {
        uuid id PK
        uuid problem_id FK
        text input
        text output
    }
```

- A problem title is unique and can contain up to 100 characters.
- Difficulty is `easy`, `medium`, or `hard`; it defaults to `easy` when omitted.
- Each test case belongs to one problem. Deleting a problem cascades to its test cases.
- Inputs and expected outputs are stored as text. Evaluation compares the program output with the expected output after trimming the captured container logs.

### Submission database

```mermaid
erDiagram
    SUBMISSIONS {
        uuid id PK
        uuid problem_id "logical reference to Problem DB"
        text code
        enum language "python, cpp"
        enum status "pending, accepted, wrong_answer, time_limit_exceeded, runtime_error"
        timestamptz created_at
        timestamptz updated_at
    }
```

A new submission starts as `pending`. The Submission database stores the problem UUID, submitted source, language, and lifecycle status. ProblemService remains the source of truth for the problem and its test cases.

### Service ownership

```mermaid
flowchart LR
    subgraph ProblemDB[ProblemService PostgreSQL]
        P[problems]
        T[testcases]
        P -->|problem_id foreign key with cascade delete| T
    end
    subgraph SubmissionDB[SubmissionService PostgreSQL]
        S[submissions]
    end
    P -. "problem UUID checked through ProblemService API" .-> S
```

The dashed relationship is enforced by application calls, not by a database constraint spanning the two PostgreSQL databases.

## Submission and evaluation lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant Submission as SubmissionService
    participant Problem as ProblemService
    participant SDB as Submission PostgreSQL
    participant Redis as Redis BullMQ
    participant Worker as EvaluationService worker
    participant Docker as Docker container

    Client->>Submission: POST /submissions
    Submission->>Problem: GET /problems/:problemId
    Problem-->>Submission: Problem and test cases
    Submission->>SDB: Insert submission with pending status
    Submission->>Redis: Add evaluate-submission job to submission-queue
    Submission-->>Client: 201 submission record (pending)
    Redis-->>Worker: Deliver queued job
    loop Each problem test case
        Worker->>Docker: Create constrained container and run code with input
        Docker-->>Worker: Exit status and captured output
    end
    Worker->>Worker: Determine accepted, wrong_answer, runtime_error, or time_limit_exceeded
    Worker->>Submission: PATCH /submissions/:submissionId/status
    Submission->>SDB: Persist final status and updatedAt
```

The status callback is asynchronous. The create-submission response normally contains `pending`; clients can poll `GET /submissions/:submissionId` until EvaluationService updates it.

### Queue contract

- BullMQ queue name: `submission-queue`.
- Job name: `evaluate-submission`.
- SubmissionService publishes jobs to Redis on port `6380`.
- EvaluationService consumes from the same Redis instance and queue name.
- Jobs are configured for three attempts with exponential backoff beginning at two seconds.
- The job carries the submission ID, problem details and test cases, source code, and language.

SubmissionService saves the submission before it publishes the queue job. If publishing fails, the API reports an error while the already-inserted record may remain `pending`; check service logs when diagnosing a submission that never advances.

## Code execution model

EvaluationService supports the `python` and `cpp` language values:

| Language | Docker image | Time limit |
| --- | --- | ---: |
| Python | `python:3.8-slim` | 4 seconds per test case |
| C++ | `gcc:14` | 1 second per test case |

The EvaluationService start script pulls both images before compiling and starting its Node process. For each test case, the worker creates a container, writes the source and input, runs the program, captures stdout and stderr, and removes the container afterward. Test cases for one submission are started concurrently.

Container configuration includes a 1 GB memory limit, a 100-process limit, a CPU quota of 50,000 over a 100,000 period, `no-new-privileges`, and `NetworkMode: none`.

Verdict mapping:

| Evaluation result | Submission status |
| --- | --- |
| All test cases exit successfully and output matches | `accepted` |
| At least one successful execution has output that differs | `wrong_answer` |
| Program exits non-zero, including a C++ compile failure | `runtime_error` |
| A test case exceeds its configured time limit | `time_limit_exceeded` |

The manual status endpoint also accepts those four final statuses. New records are created as `pending` by the database default.

## HTTP API

Base URLs in the local Postman environment:

- ProblemService: `http://localhost:3000`
- SubmissionService: `http://localhost:3001`

All request bodies use JSON. Successful responses follow `{ "success": true, "message": "...", "data": ... }`. Error responses follow `{ "success": false, "message": "..." }`.

### ProblemService routes

| Method | Path | Purpose | Success response |
| --- | --- | --- | --- |
| GET | `/problems` | List problems and total count. List rows do not include their test cases. | 200 — `Problems fetched successfully` |
| GET | `/problems/search?query={query}` | Case-insensitive partial search over title and description. | 200 — `Problems fetched successfully` |
| GET | `/problems/difficulty/:difficulty` | Filter by `easy`, `medium`, or `hard`. | 200 — `Problems fetched successfully` |
| GET | `/problems/:id` | Fetch a problem with its test cases. | 200 — `Problem fetched successfully` |
| POST | `/problems` | Create a problem and its test cases. | 201 — `Problem created successfully` |
| PATCH | `/problems/:id` | Partially update problem fields and optionally replace test cases. | 200 — `Problem updated successfully` |
| DELETE | `/problems/:id` | Delete a problem and its test cases. | 200 — `Problem deleted successfully` |

Create problem request:

```http
POST http://localhost:3000/problems
Content-Type: application/json
```

```json
{
  "title": "Echo an Integer",
  "description": "Read one integer and print it unchanged.",
  "difficulty": "easy",
  "editorial": "Read the input value and print it.",
  "testcases": [
    { "input": "3", "output": "3" }
  ]
}
```

Problem titles must be unique. `testcases` is required on create and must contain at least one entry; each entry needs non-empty `input` and `output`. `editorial` is optional. Markdown in the description and editorial is converted, sanitized, and stored as safe Markdown.

Partial update example:

```json
{
  "difficulty": "medium"
}
```

When changing test cases, include the replacement array in the PATCH body. At least one update field is required.

### SubmissionService routes

| Method | Path | Purpose | Success response |
| --- | --- | --- | --- |
| POST | `/submissions` | Verify the problem, create a pending submission, and queue evaluation. | 201 — `Submission created successfully` |
| GET | `/submissions/problem/:problemId` | List submissions for a problem. | 200 — `Submissions fetched successfully` |
| GET | `/submissions/:submissionId` | Fetch one submission and its current status. | 200 — `Submission fetched successfully` |
| DELETE | `/submissions/:submissionId` | Delete a submission record. | 200 — `Submission deleted successfully` |
| PATCH | `/submissions/:submissionId/status` | Update the submission status. | 200 — `Submission status updated successfully` |

Create a submission for the Echo an Integer example using the ID returned by ProblemService:

```http
POST http://localhost:3001/submissions
Content-Type: application/json
```

```json
{
  "problemId": "{{problemId}}",
  "code": "print(input())",
  "language": "python"
}
```

A deliberately incorrect program for the same test case is:

```json
{
  "problemId": "{{problemId}}",
  "code": "print(0)",
  "language": "python"
}
```

The first should evaluate as `accepted`; the second should evaluate as `wrong_answer` when the test case input is `3` and expected output is `3`.

Manual status update example:

```json
{
  "status": "accepted"
}
```

Accepted values are `accepted`, `wrong_answer`, `time_limit_exceeded`, and `runtime_error`.

### EvaluationService

EvaluationService has no client HTTP routes. Its worker consumes jobs from Redis and updates SubmissionService using `PATCH /submissions/:submissionId/status`.

## Validation and error responses

ProblemService request validation:

- Problem ID path parameters must be UUIDs.
- Search requires a non-empty `query` parameter.
- Difficulty must be `easy`, `medium`, or `hard`.
- Request-body validation errors return HTTP 400 with `Invalid req body`.
- Invalid route parameters return HTTP 400 with `Route params are invalid`.

SubmissionService request validation:

- `problemId` and `submissionId` must be UUIDs.
- `code` must contain at least one character.
- `language` must be `python` or `cpp`.
- Status updates must use one of the four final statuses listed above.

Common error statuses:

| Status | Meaning |
| ---: | --- |
| 400 | Invalid request body, query, or route parameter. |
| 404 | Problem, submission, or referenced problem does not exist. |
| 409 | A problem title is already in use. |
| 500 | Unexpected server or infrastructure error. |

Unexpected errors are logged and returned with the generic message `Internal server error`; application errors return their defined message. HTTP requests receive correlation IDs in service logs. Evaluation logs include job and submission IDs to trace asynchronous work.

## Local setup

### Prerequisites

- Node.js and npm.
- Docker Desktop or another running Docker daemon.
- PostgreSQL and Redis through the included Compose files.

There is no root-level package manifest or combined Compose file. Install and run each service from its own directory. Local `.env` files are already present in the checkout; keep database credentials and other secrets out of source control.

### Start the databases and Redis

In one terminal:

```bash
cd ProblemService
docker compose up -d
```

In another terminal:

```bash
cd SubmissionService
docker compose up -d
```

The ProblemService Compose file publishes PostgreSQL on host port `5433`. The SubmissionService Compose file publishes PostgreSQL on `5434` and Redis on `6380`.

### Install dependencies and migrate databases

From the repository root, install each service independently:

```bash
cd ProblemService
npm install
npx drizzle-kit migrate
```

```bash
cd SubmissionService
npm install
npx drizzle-kit migrate
```

```bash
cd EvaluationService
npm install
```

### Start services

Start ProblemService:

```bash
cd ProblemService
npm start
```

Start SubmissionService:

```bash
cd SubmissionService
npm start
```

Start EvaluationService:

```bash
cd EvaluationService
npm start
```

ProblemService and SubmissionService compile TypeScript and run their server with Node watch mode. EvaluationService first pulls the Python and C++ images, compiles the service, starts its server, and registers the worker. Each process should run in its own terminal.

### Local configuration reference

| Service | Variables used |
| --- | --- |
| ProblemService | `PORT`, `DATABASE_URL` |
| SubmissionService | `PORT`, `DATABASE_URL`, `REDIS_HOST`, `REDIS_PORT`, `PROBLEM_SERVICE_URL` |
| EvaluationService | `PORT`, `REDIS_HOST`, `REDIS_PORT`, `SUBMISSION_SERVICE_URL` |

Create one `.env` file in each service directory. These examples use the local ports from the service configuration. Replace `DB_USER` and `DB_PASSWORD` with the credentials configured for the corresponding PostgreSQL container.

ProblemService `.env`:

```dotenv
PORT=3000
DATABASE_URL=postgresql://DB_USER:DB_PASSWORD@127.0.0.1:5433/problemDB
```

SubmissionService `.env`:

```dotenv
PORT=3001
DATABASE_URL=postgresql://DB_USER:DB_PASSWORD@127.0.0.1:5434/submissionDB
REDIS_HOST=127.0.0.1
REDIS_PORT=6380
PROBLEM_SERVICE_URL=http://localhost:3000
```

EvaluationService `.env`:

```dotenv
PORT=3002
REDIS_HOST=127.0.0.1
REDIS_PORT=6380
SUBMISSION_SERVICE_URL=http://localhost:3001
```

The current local ports are ProblemService `3000`, SubmissionService `3001`, EvaluationService process `3002`, Postgres `5433` and `5434`, and Redis `6380`. The EvaluationService port is for the process; the service does not expose an API route.

## Postman

The repository includes:

- `postman/collections/code-execution-engine-api-checks.collection.json`
- `postman/environments/code-execution-engine-local.environment.json`

Import both files into Postman and select **Code Execution Engine Local**. The environment provides ProblemService and SubmissionService base URLs and variables for `problemId`, `submissionId`, and `problemTitle`.

Suggested route-check order:

1. Create a problem and save its returned ID.
2. List, search, filter, fetch, and update the problem.
3. Create a submission for that problem.
4. Poll the submission route until evaluation changes its status from `pending`.
5. List submissions for the problem and test the status update route.
6. Use cleanup requests only after finishing other checks; deletes remove records.

Evaluation is asynchronous. A successful `POST /submissions` means the record was created and the job was queued; check EvaluationService logs and poll the submission to see the final status.

## Repository layout

```text
code-execution-engine/
├── ProblemService/
│   ├── drizzle/                     # Problem DB migration files
│   └── src/
│       ├── config/                   # PostgreSQL and logger configuration
│       ├── controllers/              # HTTP response handlers
│       ├── dtos/                     # Inferred request DTO types
│       ├── middlewares/              # Correlation IDs, validation, errors
│       ├── models/schemas/            # problems and testcases tables
│       ├── repositories/             # Drizzle data access
│       ├── routers/                  # Problem HTTP routes
│       ├── services/                 # Problem use cases and sanitization
│       ├── validators/               # Zod body, query, and path schemas
│       └── utils/
├── SubmissionService/
│   ├── drizzle/                     # Submission DB migration files
│   └── src/
│       ├── apis/                     # ProblemService HTTP client
│       ├── config/                   # PostgreSQL, Redis, logger settings
│       ├── controllers/              # Submission response handlers
│       ├── dtos/                     # Submission and BullMQ job types
│       ├── middlewares/              # Correlation IDs, validation, errors
│       ├── models/schemas/            # submissions table
│       ├── producers/                # BullMQ job publishing
│       ├── queues/                   # BullMQ queue configuration
│       ├── repositories/             # Drizzle data access
│       ├── routers/                  # Submission HTTP routes
│       ├── services/                 # Submission use cases
│       └── validators/               # Zod request schemas
├── EvaluationService/
│   └── src/
│       ├── apis/                     # Submission status callback
│       ├── config/                   # Redis, language, logger settings
│       ├── workers/                  # BullMQ evaluation worker
│       ├── utils/containers/          # Docker setup and execution commands
│       └── types/                    # Job, test case, container types
└── postman/
    ├── collections/
    └── environments/
```
