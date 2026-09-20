# Code Execution Engine

A TypeScript microservice backend for authoring programming problems, accepting code submissions, and evaluating them asynchronously in isolated Docker containers.

The repository contains three independently deployable Express services:

- **Problem Service** — CRUD, search, validation, and Markdown sanitization for problems and test cases.
- **Submission Service** — persists submissions, verifies the referenced problem, and publishes evaluation jobs.
- **Evaluation Service** — consumes jobs, executes Python or C++ against every test case, and records the final verdict.

> This README describes the implementation in this repository. It intentionally calls out current operational and security limitations rather than presenting them as production-ready behavior.

## Contents

- [Architecture](#architecture)
- [How a submission is evaluated](#how-a-submission-is-evaluated)
- [Technology](#technology)
- [Repository layout](#repository-layout)
- [Prerequisites](#prerequisites)
- [Local setup](#local-setup)
- [Configuration](#configuration)
- [API reference](#api-reference)
- [Example end-to-end flow](#example-end-to-end-flow)
- [Data model](#data-model)
- [Execution model](#execution-model)
- [Error handling and observability](#error-handling-and-observability)

## Architecture

```mermaid
flowchart LR
    Client[Client / API Consumer]

    subgraph PS[Problem Service]
      ProblemAPI[Express REST API]
      ProblemDB[(PostgreSQL\nproblemDB)]
      ProblemAPI <--> ProblemDB
    end

    subgraph SS[Submission Service]
      SubmissionAPI[Express REST API]
      SubmissionDB[(PostgreSQL\nsubmissionDB)]
      Queue[Redis + BullMQ\nsubmission queue]
      SubmissionAPI <--> SubmissionDB
      SubmissionAPI --> Queue
    end

    subgraph ES[Evaluation Service]
      Worker[BullMQ evaluation worker]
      Docker[Ephemeral Docker containers\nPython 3.8 / GCC 14]
      Worker --> Docker
    end

    Client -->|Manage problems| ProblemAPI
    Client -->|Submit source code| SubmissionAPI
    SubmissionAPI -->|GET problem details| ProblemAPI
    Queue -->|Consumes jobs| Worker
    Worker -->|PATCH final verdict| SubmissionAPI
```

Each service owns its own boundary. Problem and Submission data are stored in separate PostgreSQL databases; Redis is the transport layer for background work. The evaluator does not expose public REST routes—it starts a BullMQ worker when its Express process starts.

## How a submission is evaluated

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant S as Submission Service
    participant P as Problem Service
    participant R as Redis / BullMQ
    participant E as Evaluation Worker
    participant D as Docker

    C->>S: POST /submissions
    S->>P: GET /problems/:problemId
    P-->>S: Problem + test cases
    S->>S: Insert submission (pending)
    S->>R: Enqueue submission job
    S-->>C: 201 Created (pending)
    R->>E: Deliver job
    loop Every test case (currently parallel)
      E->>D: Create, run, collect logs, remove container
      D-->>E: Exit status + output
    end
    E->>E: Determine final verdict
    E->>S: PATCH /submissions/:id/status
    S-->>E: Updated submission
```

The write path is asynchronous: a successful `POST /submissions` means the row was stored and the job was accepted by BullMQ, **not** that the solution has passed. Read the submission later to see the terminal status.

## Technology

| Concern | Implementation |
| --- | --- |
| Language/runtime | TypeScript, Node.js, ESM |
| HTTP | Express 5 |
| Validation | Zod |
| Persistence | PostgreSQL 18, Drizzle ORM / Drizzle Kit |
| Async processing | Redis 7, BullMQ |
| Sandbox runtime | Docker via Dockerode |
| Supported languages | Python (`python:3.8-slim`), C++ (`gcc:14`) |
| Logging | Winston with daily rotation |

## Repository layout

```text
.
├── ProblemService/                 # Problem CRUD and test-case ownership
│   ├── src/controllers/
│   ├── src/repositories/
│   ├── src/models/schemas/         # problems and testcases tables
│   └── docker-compose.yml          # PostgreSQL on localhost:5433
├── SubmissionService/              # Submission API and BullMQ producer
│   ├── src/apis/problem.api.ts     # Internal Problem Service client
│   ├── src/producers/
│   ├── src/queues/
│   └── docker-compose.yml          # PostgreSQL :5434 and Redis :6380
└── EvaluationService/              # BullMQ consumer and Docker runner
    ├── src/workers/
    ├── src/utils/containers/
    └── docker-compose.yml          # Redis :6380 (use one shared instance)
```

## Prerequisites

- Node.js compatible with the project dependencies (use a current LTS release).
- Docker Desktop or Docker Engine. The Evaluation Service must be able to access the Docker daemon/socket.
- Docker Compose.
- The `python:3.8-slim` and `gcc:14` images (pulled by the evaluator command below).
- One shared Redis instance and two PostgreSQL databases.

## Local setup

### 1. Install dependencies

Run this once in each service directory:

```bash
cd ProblemService && npm ci
cd ../SubmissionService && npm ci
cd ../EvaluationService && npm ci
```

### 2. Start infrastructure

The provided Compose files overlap on Redis port `6380`. Start the PostgreSQL stacks, then start **only one** Redis service:

```bash
cd ProblemService && docker compose up -d
cd ../SubmissionService && docker compose up -d postgres redis
# Do not additionally start EvaluationService/docker-compose.yml unless you use another port.
```

This creates:

| Resource | Host port | Database |
| --- | ---: | --- |
| Problem PostgreSQL | `5433` | `problemDB` |
| Submission PostgreSQL | `5434` | `submissionDB` |
| Redis | `6380` | — |

### 3. Configure environment files

Create a `.env` file in each service folder using the values in [Configuration](#configuration). These files are ignored by Git and must not contain real production secrets in source control.

### 4. Generate and apply database migrations

The repository includes `drizzle.config.ts` and schema definitions but no committed `drizzle/` migrations. Generate then apply them for each database before starting services:

```bash
cd ProblemService
npx drizzle-kit generate
npx drizzle-kit migrate

cd ../SubmissionService
npx drizzle-kit generate
npx drizzle-kit migrate
```

Review generated SQL before using it outside local development.

### 5. Pull evaluator images

```bash
cd EvaluationService
npm run pull-images
```

### 6. Start services in dependency order

Use separate terminals:

```bash
# Terminal 1
cd ProblemService && npm start

# Terminal 2
cd SubmissionService && npm start

# Terminal 3
cd EvaluationService && npm start
```

`ProblemService` and `SubmissionService` compile with `tsc` and run their built output in watch mode. The Evaluation Service's `start` script runs `dist/index.js`, but this repository's server entry point is `src/server.ts` and no build script is defined. For local development, compile it explicitly and run the actual emitted server entry, or add a build/dev script before relying on the documented command.

For example, after confirming the output path from `tsconfig.json`:

```bash
cd EvaluationService
npx tsc
node dist/server.js
```

## Configuration

### `ProblemService/.env`

```dotenv
PORT=3001
DATABASE_URL=postgresql://postgres:admin@localhost:5433/problemDB
```

### `SubmissionService/.env`

```dotenv
PORT=3002
DATABASE_URL=postgresql://postgres:admin@localhost:5434/submissionDB
REDIS_HOST=localhost
REDIS_PORT=6380
PROBLEM_SERVICE_URL=http://localhost:3001
```

### `EvaluationService/.env`

```dotenv
PORT=3003
REDIS_HOST=localhost
REDIS_PORT=6380
PROBLEM_SERVICE_URL=http://localhost:3001
SUBMISSION_SERVICE_URL=http://localhost:3002
```

`PROBLEM_SERVICE_URL` is declared by the Evaluation Service but is not currently used by its worker; the job contains problem data supplied by the Submission Service.

## API reference

All successful API responses use this envelope:

```json
{
  "success": true,
  "message": "Human-readable outcome",
  "data": {}
}
```

Validation and application errors use:

```json
{
  "success": false,
  "message": "Reason for failure"
}
```

Every request is assigned a correlation ID by middleware for log tracing. No authentication or authorization middleware exists at present.

### Problem Service — `http://localhost:3001/problems`

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/` | Create a problem and its test cases. |
| `GET` | `/` | List all problems, newest first; test cases are omitted. |
| `GET` | `/search?query={query}` | Search title or description, case-insensitively. |
| `GET` | `/difficulty/:difficulty` | List `easy`, `medium`, or `hard` problems. |
| `GET` | `/:id` | Fetch a problem including test cases. |
| `PATCH` | `/:id` | Update any supplied fields; supplied test cases replace all existing test cases. |
| `DELETE` | `/:id` | Delete the problem; PostgreSQL cascades to its test cases. |

#### Create a problem

```bash
curl -X POST http://localhost:3001/problems \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Add Two Integers",
    "description": "Read two integers and print their sum.",
    "difficulty": "easy",
    "editorial": "Read the two values and add them.",
    "testcases": [
      { "input": "2 3", "output": "5" },
      { "input": "-4 10", "output": "6" }
    ]
  }'
```

Request fields:

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `title` | string | Yes | Trimmed, 1–100 characters. |
| `description` | string | Yes | Trimmed, non-empty; sanitized Markdown. |
| `difficulty` | enum | No | `easy` (default), `medium`, or `hard`. |
| `editorial` | string | No | Trimmed; sanitized Markdown. |
| `testcases` | array | Yes | At least one `{ input, output }`; both fields are trimmed, non-empty strings. |

Example response (`201 Created`):

```json
{
  "success": true,
  "message": "Problem created successfully",
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "title": "Add Two Integers",
    "description": "Read two integers and print their sum.",
    "difficulty": "easy",
    "editorial": "Read the two values and add them.",
    "createdAt": "2026-09-20T12:00:00.000Z",
    "updatedAt": "2026-09-20T12:00:00.000Z"
  }
}
```

#### Fetch one problem

```bash
curl http://localhost:3001/problems/11111111-1111-4111-8111-111111111111
```

Example response (`200 OK`):

```json
{
  "success": true,
  "message": "Problem fetched successfully",
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "title": "Add Two Integers",
    "description": "Read two integers and print their sum.",
    "difficulty": "easy",
    "editorial": "Read the two values and add them.",
    "testcases": [
      {
        "id": "22222222-2222-4222-8222-222222222222",
        "problemId": "11111111-1111-4111-8111-111111111111",
        "input": "2 3",
        "output": "5"
      }
    ],
    "createdAt": "2026-09-20T12:00:00.000Z",
    "updatedAt": "2026-09-20T12:00:00.000Z"
  }
}
```

#### List, filter, search, update, delete

```bash
# List — returns { problems: [...], total: number }
curl http://localhost:3001/problems

# Filter by enum value
curl http://localhost:3001/problems/difficulty/easy

# Search title and description
curl --get http://localhost:3001/problems/search --data-urlencode 'query=integer'

# Partial update — a provided testcases array replaces the entire set
curl -X PATCH http://localhost:3001/problems/11111111-1111-4111-8111-111111111111 \
  -H 'Content-Type: application/json' \
  -d '{"difficulty":"medium"}'

curl -X DELETE http://localhost:3001/problems/11111111-1111-4111-8111-111111111111
```

### Submission Service — `http://localhost:3002/submissions`

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/` | Verify the problem, create a `pending` submission, and enqueue it. |
| `GET` | `/problem/:problemId` | List submissions for a problem. |
| `GET` | `/:submissionId` | Fetch one submission. |
| `PATCH` | `/:submissionId/status` | Set a valid status; used internally by the evaluator. |
| `DELETE` | `/:submissionId` | Delete a submission. |

#### Create a submission

```bash
curl -X POST http://localhost:3002/submissions \
  -H 'Content-Type: application/json' \
  -d '{
    "problemId": "11111111-1111-4111-8111-111111111111",
    "language": "python",
    "code": "a, b = map(int, input().split())\nprint(a + b)"
  }'
```

Request fields:

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `problemId` | UUID | Yes | Must reference a problem that the Problem Service can fetch. |
| `code` | string | Yes | Non-empty source text. |
| `language` | enum | Yes | `python` or `cpp`. |

Example immediate response (`201 Created`):

```json
{
  "success": true,
  "message": "Submission created successfully",
  "data": {
    "id": "33333333-3333-4333-8333-333333333333",
    "problemId": "11111111-1111-4111-8111-111111111111",
    "code": "a, b = map(int, input().split())\nprint(a + b)",
    "language": "python",
    "status": "pending",
    "createdAt": "2026-09-20T12:05:00.000Z",
    "updatedAt": "2026-09-20T12:05:00.000Z"
  }
}
```

#### Poll for the final result

```bash
curl http://localhost:3002/submissions/33333333-3333-4333-8333-333333333333
```

Example terminal result (`200 OK`):

```json
{
  "success": true,
  "message": "Submission fetched successfully",
  "data": {
    "id": "33333333-3333-4333-8333-333333333333",
    "problemId": "11111111-1111-4111-8111-111111111111",
    "code": "a, b = map(int, input().split())\nprint(a + b)",
    "language": "python",
    "status": "accepted",
    "createdAt": "2026-09-20T12:05:00.000Z",
    "updatedAt": "2026-09-20T12:05:01.000Z"
  }
}
```

Allowed statuses are `pending`, `accepted`, `wrong_answer`, `time_limit_exceeded`, and `runtime_error`.

The status endpoint is callable over HTTP today:

```bash
curl -X PATCH http://localhost:3002/submissions/33333333-3333-4333-8333-333333333333/status \
  -H 'Content-Type: application/json' \
  -d '{"status":"accepted"}'
```

Treat that route as an internal-only operation in a real deployment; it is not yet protected in the codebase.

## Example end-to-end flow

1. Create a problem and retain its returned `data.id`.
2. Submit code referencing that problem ID.
3. Receive a `pending` submission record immediately.
4. Poll `GET /submissions/:submissionId` until it reaches a terminal verdict.

Expected Python submission JSON:

```json
{
  "problemId": "11111111-1111-4111-8111-111111111111",
  "language": "python",
  "code": "a, b = map(int, input().split())\nprint(a + b)"
}
```

Equivalent C++ submission JSON:

```json
{
  "problemId": "11111111-1111-4111-8111-111111111111",
  "language": "cpp",
  "code": "#include <iostream>\nusing namespace std;\nint main() { long long a, b; cin >> a >> b; cout << a + b << '\\n'; }"
}
```

## Data model

```mermaid
erDiagram
    PROBLEMS ||--o{ TESTCASES : contains
    PROBLEMS {
        uuid id PK
        varchar title
        text description
        difficulty difficulty
        text editorial
        timestamptz created_at
        timestamptz updated_at
    }
    TESTCASES {
        uuid id PK
        uuid problem_id FK
        text input
        text output
    }
    SUBMISSIONS {
        uuid id PK
        uuid problem_id "logical reference across services"
        text code
        submission_language language
        submission_status status
        timestamptz created_at
        timestamptz updated_at
    }
```

`submissions.problem_id` is intentionally not a database foreign key because the referenced problem lives in a separate service/database. The Submission Service validates it synchronously via the Problem Service before inserting.

## Execution model

For each test case, the evaluator creates a fresh container, supplies test input through a generated file redirected to stdin, waits for completion, reads the combined Docker logs, and removes the container.

| Language | Image | Timeout | Command behavior |
| --- | --- | --- |
| Python | `python:3.8-slim` | 4,000 ms | Writes `code.py`, then runs `python3 code.py < input.txt`. |
| C++ | `gcc:14` | 1,000 ms | Writes `code.cpp`, compiles with `g++`, then executes `./run < input.txt`. |

Configured container restrictions:

- 1 GiB memory limit.
- 100-process limit.
- CPU quota of 50 ms per 100 ms period (about half a CPU).
- `no-new-privileges` security option.
- Network disabled with `NetworkMode: "none"`.

Verdict precedence is deterministic: **time limit exceeded** takes precedence over **runtime error**, which takes precedence over **wrong answer**; the evaluator returns **accepted** only if every run exits successfully and every trimmed log output exactly equals the expected output.

Jobs use three total BullMQ attempts with exponential backoff beginning at two seconds.

## Error handling and observability

- Zod validates route parameters, query values, and request bodies before controllers run.
- Unknown UUIDs produce a `404` application error for individual problem/submission reads and deletes.
- Problems are persisted with their test cases in a database transaction. Updating test cases replaces their complete set in a transaction.
- Problem descriptions and editorials are converted through Markdown → sanitized HTML → Markdown before storage.
- Winston logs and correlation-ID middleware are included in each service.
- Redis connection and BullMQ worker errors are logged.

Example invalid request response:

```json
{
  "success": false,
  "message": "Invalid req body"
}
```

Exact validation wording is produced by the shared request-validation middleware and should be treated as an implementation detail by API clients.

## License

The package manifests currently declare the `ISC` license. Add a repository-level `LICENSE` file if you intend to distribute the project.
