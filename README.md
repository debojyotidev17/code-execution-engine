# Code Execution Engine

A TypeScript backend for managing programming problems, accepting code submissions, and evaluating them asynchronously against stored test cases. The repository contains three independently started services, two PostgreSQL databases, a Redis-backed BullMQ queue, and a Docker-based code runner for Python and C++.

The system is more than a CRUD API: it validates and sanitizes problem data, atomically stores problems with their test cases, persists submissions before scheduling evaluation, executes each test case in its own constrained container, classifies evaluation results, and updates the submission record asynchronously.

## Contents

- [Architecture](#architecture)
- [Services and responsibilities](#services-and-responsibilities)
- [Evaluation lifecycle](#evaluation-lifecycle)
- [Execution model](#execution-model)
- [Data model](#data-model)
- [Technology stack](#technology-stack)
- [Repository layout](#repository-layout)
- [Run locally from scratch](#run-locally-from-scratch)
- [HTTP API](#http-api)
- [End-to-end examples](#end-to-end-examples)
- [Validation, results, and edge cases](#validation-results-and-edge-cases)
- [Logging and operational behavior](#logging-and-operational-behavior)
- [Execution security boundaries](#execution-security-boundaries)
- [Troubleshooting](#troubleshooting)

## Architecture

```mermaid
flowchart LR
    Client[API client]

    subgraph ProblemDomain[Problem Service]
        PS[Express API :3001]
        PDB[(PostgreSQL problemDB)]
        PS --> PDB
    end

    subgraph SubmissionDomain[Submission Service]
        SS[Express API :3002]
        SDB[(PostgreSQL submissionDB)]
        SS --> SDB
    end

    Redis[(Redis 7 / BullMQ queue)]

    subgraph EvaluationDomain[Evaluation Service]
        EW[BullMQ evaluation worker]
        Runner[Dockerode runner]
        Engine[Docker Engine]
        Py[python:3.8-slim]
        Cpp[gcc:14]
        EW --> Runner --> Engine
        Engine --> Py
        Engine --> Cpp
    end

    Client -->|Problem API| PS
    Client -->|Submission API| SS
    SS -->|GET problem and test cases| PS
    SS -->|Persist pending submission| SDB
    SS -->|Enqueue evaluation job| Redis
    Redis -->|Deliver job| EW
    EW -->|PATCH final status| SS
```

The Problem Service owns problem metadata and test cases. The Submission Service owns submission records and coordinates problem lookup and queueing. The Evaluation Service is a background worker: it consumes jobs from Redis, runs submitted code through Dockerode and the local Docker Engine, then calls the Submission Service to persist the result.

The PostgreSQL databases are separate service-owned stores. A submission's `problem_id` is checked against the Problem Service when the submission is created; it is not a cross-database foreign key.

### Submission and evaluation sequence

```mermaid
sequenceDiagram
    actor Client
    participant Problem as Problem Service
    participant ProblemDB as problemDB
    participant Submission as Submission Service
    participant SubmissionDB as submissionDB
    participant Redis as Redis / BullMQ
    participant Worker as Evaluation worker
    participant Docker as Docker Engine

    Client->>Problem: POST /problems with test cases
    Problem->>ProblemDB: Transaction: insert problem and test cases
    Problem-->>Client: 201 Created with problem ID

    Client->>Submission: POST /submissions with problem ID, code, language
    Submission->>Problem: GET /problems/{problemId}
    Problem-->>Submission: Problem and test cases
    Submission->>SubmissionDB: Insert submission as pending
    Submission->>Redis: Add BullMQ job
    Submission-->>Client: 201 Created with submission ID and pending status

    Redis-->>Worker: Deliver evaluation job
    loop Each test case, concurrently
        Worker->>Docker: Create, run, collect logs, and remove container
        Docker-->>Worker: Exit status and captured output
    end
    Worker->>Submission: PATCH /submissions/{submissionId}/status
    Submission->>SubmissionDB: Update status and updated_at
    Client->>Submission: GET /submissions/{submissionId}
    Submission-->>Client: Current persisted status
```

## Services and responsibilities

| Service | Default port | Responsibility | Dependencies |
| --- | ---: | --- | --- |
| `ProblemService` | `3001` | Create, read, update, delete, filter, and search problems; sanitize Markdown; persist problems and test cases. | PostgreSQL `problemDB` |
| `SubmissionService` | `3002` | Validate submissions, verify the referenced problem, persist submissions, enqueue work, expose submission queries and status updates. | PostgreSQL `submissionDB`, Redis, Problem Service |
| `EvaluationService` | `3003` | Consume BullMQ jobs, run code for every test case, classify results, and update submission status. | Redis, Submission Service, Docker Engine |

The compose files start only infrastructure. The Node.js services run as separate host processes using their own `npm` scripts.

## Evaluation lifecycle

1. A problem is created with one or more `{ input, output }` test cases.
2. The client submits a problem UUID, source code, and `python` or `cpp` language to the Submission Service.
3. The Submission Service fetches the problem and its test cases from the Problem Service. If lookup returns no problem, submission creation fails.
4. The Submission Service inserts a `pending` row, then adds a job to the `submission` BullMQ queue. The job contains the submission ID, source code, language, and problem test cases.
5. The Evaluation Service consumes the job and starts one Docker container per test case. Test cases for the same submission are run concurrently with `Promise.all`.
6. Python runs with `python:3.8-slim`; C++ is compiled with `g++` and run using `gcc:14`.
7. The worker compares captured output with the expected output and calls `PATCH /submissions/{submissionId}/status` with the final status.
8. Clients read the current record with `GET /submissions/{submissionId}`. The initial create response is normally `pending`; evaluation completes asynchronously.

## Execution model

For each test case, the evaluator creates a fresh container, writes the submitted source and test input to files, redirects the input file to standard input, waits for completion, captures Docker logs, and removes the container on the normal completion paths. Test cases for one submission are started concurrently.

| Language | Image | Timeout | Command behavior |
| --- | --- | ---: | --- |
| Python | `python:3.8-slim` | 4,000 ms | Writes `code.py` and `input.txt`, then runs `python3 code.py < input.txt`. |
| C++ | `gcc:14` | 1,000 ms | Creates an `app` directory, writes `code.cpp` and `input.txt`, compiles with `g++ code.cpp -o run`, then executes `./run < input.txt`. |

Each container is configured with:

- 1 GiB memory limit.
- 100-process limit.
- CPU quota of 50 ms per 100 ms period (about half of one CPU core).
- `no-new-privileges` security option.
- Network disabled with `NetworkMode: "none"`.

The runner captures both stdout and stderr from Docker logs, removes control characters, and trims surrounding whitespace from the captured string before comparing it with the stored expected output.

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

`submissions.problem_id` is a logical reference, not a database foreign key: the referenced problem lives in a separate service and database. Before inserting a submission, the Submission Service synchronously fetches the problem from the Problem Service and rejects the request if no problem is returned.

### Problem database (`problemDB`)

`problems` stores a UUID, title, description, difficulty (`easy`, `medium`, or `hard`), optional editorial, and creation/update timestamps.

`testcases` stores a UUID, the owning `problem_id`, input text, and expected output text. The foreign key uses `ON DELETE CASCADE`.

### Submission database (`submissionDB`)

`submissions` stores a UUID, `problem_id`, source code, language (`python` or `cpp`), status, and creation/update timestamps. Status values are `pending`, `accepted`, `wrong_answer`, `time_limit_exceeded`, and `runtime_error`.

### Transaction boundaries

Problem creation inserts the problem and all its test cases inside one Drizzle transaction. If any insert fails, the transaction rolls back, so a partially created problem is not committed. Problem updates also use a transaction. If a `testcases` field is present in a PATCH request, existing cases are deleted and the supplied cases are inserted as part of that transaction; if the field is omitted, existing cases are retained. Deleting a problem cascades to its test cases.

Submission creation and queue insertion are separate operations: the row is inserted first, then the BullMQ job is added. There is no distributed transaction or outbox between PostgreSQL and Redis. If Redis is unavailable after the insert, the API can fail while leaving a `pending` row without a queued job. Problem deletion does not cascade to submission rows because the services have separate databases.

## Technology stack

| Area | Technology |
| --- | --- |
| Language and runtime | TypeScript, Node.js, ECMAScript modules |
| HTTP | Express 5 |
| Request validation | Zod |
| SQL access and schema | Drizzle ORM, Drizzle Kit, PostgreSQL 18, `pg` |
| Asynchronous jobs | BullMQ 6, Redis 7, `ioredis` |
| Code execution | Dockerode, Docker Engine, `python:3.8-slim`, `gcc:14` |
| Problem content | `marked`, `sanitize-html`, `turndown` |
| Logging | Winston, `winston-daily-rotate-file` |
| Local infrastructure | Docker Compose |

The installed dependency versions are recorded in each service's `package-lock.json`.

## Repository layout

```text
.
├── ProblemService/
│   ├── docker-compose.yml       # PostgreSQL for problemDB
│   ├── drizzle.config.ts
│   ├── src/
│   │   ├── controllers/ routers/ services/ repositories/
│   │   ├── models/ schemas/
│   │   ├── validators/ dtos/ middlewares/
│   │   └── utils/
│   └── package.json
├── SubmissionService/
│   ├── docker-compose.yml       # PostgreSQL for submissionDB and Redis
│   ├── drizzle.config.ts
│   └── src/
│       ├── controllers/ routers/ services/ repositories/
│       ├── producers/ queues/ apis/
│       ├── models/ schemas/
│       └── validators/ dtos/ middlewares/
├── EvaluationService/
│   └── src/
│       ├── workers/
│       ├── utils/containers/
│       ├── apis/ config/ types/
│       └── server.ts
└── README.md
```

## Run locally from scratch

### Prerequisites

- Node.js and npm
- Docker Engine or Docker Desktop with the Docker Compose plugin
- Docker access for the user running `EvaluationService` (Dockerode uses the local Docker Engine connection)
- Network access to pull `postgres:18`, `redis:7`, `python:3.8-slim`, and `gcc:14` when they are not already available locally

The examples below assume the repository root is the current directory and the listed ports are free.

### 1. Start PostgreSQL and Redis

```bash
docker compose -f ProblemService/docker-compose.yml up -d
docker compose -f SubmissionService/docker-compose.yml up -d
```

The compose configuration exposes:

| Dependency | Host port | Container port | Local database / credentials |
| --- | ---: | ---: | --- |
| Problem PostgreSQL | `5433` | `5432` | `problemDB`, user `postgres`, password `admin` |
| Submission PostgreSQL | `5434` | `5432` | `submissionDB`, user `postgres`, password `admin` |
| Redis | `6380` | `6379` | No password configured |

These credentials are for the supplied local compose setup. The compose files do not configure named persistent volumes or health checks.

### 2. Configure the services

Create or edit one `.env` file in each service directory. Keep `.env` files out of version control.

`ProblemService/.env`:

```dotenv
PORT=3001
DATABASE_URL=postgresql://postgres:admin@127.0.0.1:5433/problemDB
```

`SubmissionService/.env`:

```dotenv
PORT=3002
DATABASE_URL=postgresql://postgres:admin@127.0.0.1:5434/submissionDB
REDIS_HOST=127.0.0.1
REDIS_PORT=6380
PROBLEM_SERVICE_URL=http://127.0.0.1:3001
```

`EvaluationService/.env`:

```dotenv
PORT=3003
REDIS_HOST=127.0.0.1
REDIS_PORT=6380
PROBLEM_SERVICE_URL=http://127.0.0.1:3001
SUBMISSION_SERVICE_URL=http://127.0.0.1:3002
```

These variables are read directly by each service's configuration module. The repository does not define a separate runtime environment-validation step.

### 3. Install dependencies and create the database schema

Run `npm ci` once in each service directory. The Drizzle schemas live in TypeScript, and `drizzle-kit push` applies them to the configured local database.

```bash
cd ProblemService
npm ci
npx drizzle-kit push
cd ..

cd SubmissionService
npm ci
npx drizzle-kit push
cd ..

cd EvaluationService
npm ci
cd ..
```

### 4. Start the services

Run each command in a separate terminal from the repository root:

```bash
cd ProblemService
npm start
```

```bash
cd SubmissionService
npm start
```

```bash
cd EvaluationService
npm start
```

Each service's `start` script compiles TypeScript and runs `node --watch dist/server.js`. The Evaluation Service start script first runs `docker pull python:3.8-slim` and `docker pull gcc:14`; the first startup therefore downloads the execution images.

### 5. Check service availability

There are no dedicated health-check endpoints in the current HTTP APIs. Confirm startup from each service's console output. Check the infrastructure containers with:

```bash
docker compose -f ProblemService/docker-compose.yml ps
docker compose -f SubmissionService/docker-compose.yml ps
```

The services listen on `http://127.0.0.1:3001`, `http://127.0.0.1:3002`, and `http://127.0.0.1:3003`. The Evaluation Service currently exposes no HTTP routes; port `3003` is opened by its Express server while its worker runs.

### Stop local infrastructure

```bash
docker compose -f ProblemService/docker-compose.yml down
docker compose -f SubmissionService/docker-compose.yml down
```

No named volumes are declared. Use `down -v` only when intentionally removing compose-managed data volumes as well.

## HTTP API

All routes are mounted at `/problems` or `/submissions`. JSON endpoints use `Content-Type: application/json`. Successful responses use the common shape `{ "success": true, "message": "...", "data": ... }`.

### Problem Service (`http://localhost:3001`)

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/problems` | Create a problem with at least one test case. Returns `201`. |
| `GET` | `/problems` | List problems and a total count. Test cases are not included in this list response. |
| `GET` | `/problems/:id` | Fetch one problem with its test cases. |
| `PATCH` | `/problems/:id` | Partially update problem fields; replace test cases only when `testcases` is supplied. |
| `DELETE` | `/problems/:id` | Delete a problem; PostgreSQL cascades the delete to its test cases. |
| `GET` | `/problems/difficulty/:difficulty` | Filter by `easy`, `medium`, or `hard`. |
| `GET` | `/problems/search?query=...` | Case-insensitive substring search in title and description. |

Problem creation body:

```json
{
  "title": "Add Two Integers",
  "description": "Read two integers from standard input and print their sum.",
  "difficulty": "easy",
  "editorial": "Parse both integers and add them.",
  "testcases": [
    { "input": "2 3", "output": "5" }
  ]
}
```

`difficulty` defaults to `easy`; `editorial` is optional. `title` is limited to 100 characters. Description and editorial Markdown are rendered, sanitized, and converted back to Markdown before storage.

### Submission Service (`http://localhost:3002`)

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/submissions` | Validate, persist as `pending`, then queue evaluation. Returns `201`. |
| `GET` | `/submissions/:submissionId` | Fetch a submission and its current status. |
| `GET` | `/submissions/problem/:problemId` | List submissions for a problem. |
| `PATCH` | `/submissions/:submissionId/status` | Update a submission status. Used by the Evaluation Service. |
| `DELETE` | `/submissions/:submissionId` | Delete a submission record. |

Submission creation body:

```json
{
  "problemId": "<UUID returned by Problem Service>",
  "code": "a, b = map(int, input().split())\nprint(a + b)",
  "language": "python"
}
```

Accepted languages are `python` and `cpp`. Status updates accept `pending`, `accepted`, `wrong_answer`, `time_limit_exceeded`, and `runtime_error`.

### Error responses

Validation and malformed UUID errors use HTTP `400`; missing problems or submissions use HTTP `404`; unclassified errors use HTTP `500`. The response shape is:

```json
{
  "success": false,
  "message": "Invalid req body"
}
```

## End-to-end examples

For each example, first send the problem JSON to `POST http://localhost:3001/problems`. Copy `data.id` from the response into the paired submission JSON and send it to `POST http://localhost:3002/submissions`. The problem create response returns the problem row; use `GET /problems/{id}` when you want to read it together with the stored test cases.

The submission endpoint returns a submission row with `status: "pending"` after the job is queued. Poll `GET http://localhost:3002/submissions/{submissionId}` until evaluation updates the status. Successful outputs below produce `accepted`.

### Example 1: Add Two Integers

Problem Service request:

```json
{
  "title": "Add Two Integers",
  "description": "Read two integers and print their sum.",
  "difficulty": "easy",
  "editorial": "Parse the two integers and print their sum.",
  "testcases": [
    { "input": "2 3", "output": "5" },
    { "input": "-4 10", "output": "6" },
    { "input": "0 0", "output": "0" }
  ]
}
```

Submission Service request (replace the problem ID):

```json
{
  "problemId": "<problem UUID>",
  "language": "python",
  "code": "a, b = map(int, input().split())\nprint(a + b)"
}
```

Expected program output by test case:

```text
5
6
0
```

Final status: `accepted`.

### Example 2: Multiply Two Integers

Problem Service request:

```json
{
  "title": "Multiply Two Integers",
  "description": "Read two integers and print their product.",
  "difficulty": "easy",
  "editorial": "Parse the two integers and multiply them.",
  "testcases": [
    { "input": "3 4", "output": "12" },
    { "input": "-5 6", "output": "-30" },
    { "input": "0 100", "output": "0" },
    { "input": "-3 -7", "output": "21" }
  ]
}
```

Submission Service request:

```json
{
  "problemId": "<problem UUID>",
  "language": "python",
  "code": "a, b = map(int, input().split())\nprint(a * b)"
}
```

Expected program output by test case:

```text
12
-30
0
21
```

Final status: `accepted`.

### Example 3: Maximum of Two Integers

Problem Service request:

```json
{
  "title": "Maximum of Two Integers",
  "description": "Read two integers and print the larger value.",
  "difficulty": "easy",
  "editorial": "Compare the values and print the larger one.",
  "testcases": [
    { "input": "7 2", "output": "7" },
    { "input": "-3 -8", "output": "-3" },
    { "input": "4 4", "output": "4" }
  ]
}
```

Submission Service request:

```json
{
  "problemId": "<problem UUID>",
  "language": "python",
  "code": "a, b = map(int, input().split())\nprint(max(a, b))"
}
```

Expected program output by test case:

```text
7
-3
4
```

Final status: `accepted`.

### Send the examples with curl

Save one of the problem request bodies as `problem.json`, then create it and copy the returned problem UUID:

```bash
curl -sS -X POST http://localhost:3001/problems \
  -H 'Content-Type: application/json' \
  --data-binary @problem.json
```

Save the paired submission body as `submission.json`, replacing `<problem UUID>` with the UUID from the problem response, then submit and copy the returned submission UUID:

```bash
curl -sS -X POST http://localhost:3002/submissions \
  -H 'Content-Type: application/json' \
  --data-binary @submission.json
```

Read the result after the asynchronous worker has processed it:

```bash
curl -sS http://localhost:3002/submissions/<submission-uuid>
```

### Response behavior

A create-submission response has this shape; UUIDs and timestamps are generated dynamically:

```json
{
  "success": true,
  "message": "Submission created successfully",
  "data": {
    "id": "generated-submission-uuid",
    "problemId": "generated-problem-uuid",
    "code": "a, b = map(int, input().split())\nprint(a + b)",
    "language": "python",
    "status": "pending",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
}
```

After the worker finishes, `GET /submissions/{submissionId}` returns the same record with a final `status`, for example `accepted`. Actual `createdAt` and `updatedAt` values reflect the database timestamps.

## Validation, results, and edge cases

- Problem creation requires a non-empty title, description, and at least one test case. Each test case needs non-empty input and output strings.
- Problem PATCH fields are optional. Omitting `testcases` retains the current set; including it replaces the set atomically and still requires at least one case.
- An empty `testcases` array is rejected, so the API cannot remove every test case from a problem while keeping that problem.
- Problem IDs and submission IDs are validated as UUIDs. Difficulty and language values are restricted to their enums.
- Test-case input/output validation rejects strings that become empty after trimming. The parsed Zod value is not assigned back to `req.body`, so surrounding whitespace in non-empty test-case strings is retained in storage.
- Markdown sanitization applies to problem description and editorial, not to arbitrary source code.
- Captured container logs have control characters removed and surrounding whitespace trimmed before comparison. The comparison with the stored expected output is otherwise exact; internal whitespace differences are significant, and whitespace retained in an expected output can therefore cause a mismatch.
- Results are scanned in stored test-case order. For each test case, the evaluator checks `time_limit_exceeded`, then a failed process (`runtime_error`), then output mismatch (`wrong_answer`); the first non-passing result encountered determines the submission verdict. Therefore, when multiple test cases fail differently, the overall result depends on their stored order. The result is `accepted` only when every run succeeds and every processed log output exactly matches the stored expected output.
- Evaluation infrastructure failures (for example, Docker failing to create a container) reject the BullMQ job instead of being classified as a program runtime error. BullMQ retries failed jobs according to the configured policy.
- Jobs use three attempts with exponential backoff starting at 2,000 ms. The worker also throws if it cannot persist the final status, allowing the job to be retried.
- The submission row is committed before queue insertion. A Redis failure at that point can leave a `pending` record without an evaluation job.
- Problem lookup in Submission Service returns `null` for both a missing problem and a request/network failure; the current service layer reports either case as `Problem not found`.
- Test cases are returned by `GET /problems/:id` and are included in the job sent to the Evaluation Service. They are not hidden test cases in the current API.
- The status endpoint validates allowed status values but does not enforce a transition state machine.
- There is no pagination in the current list/search endpoints.

## Logging and operational behavior

All services use Winston JSON logs written to the console and rotating daily files under each service's `logs/` directory. Rotation is configured for a maximum size of 20 MB per file and 14 days of retention.

Problem and Submission Service HTTP requests receive a UUID correlation ID through `AsyncLocalStorage`, which is added to their log records. Evaluation worker records include BullMQ job IDs and submission IDs where available; request correlation IDs are not propagated through the queued job.

## Execution security boundaries

The Evaluation Service runs submitted programs in Docker with network access disabled and the CPU, memory, process-count, and time limits listed above. The HTTP services currently do not implement authentication, authorization, or rate limiting.

The current runner constructs `/bin/bash -c` command strings and interpolates submitted source and test input into shell `echo` commands. Container resource limits do not remove the risks of shell command construction. The implementation should be treated as a local/testing code runner, not as a hardened public multi-tenant sandbox.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| PostgreSQL connection refused | Confirm both compose projects are running, `.env` ports match `5433` and `5434`, and the databases are ready before running `drizzle-kit push`. |
| `relation` or enum does not exist | Run `npx drizzle-kit push` in the affected service directory with the correct `DATABASE_URL`. |
| Redis connection errors | Confirm the Submission Service compose project is up and `REDIS_HOST`/`REDIS_PORT` point to `127.0.0.1:6380` when services run on the host. |
| Docker reports no such image | Pull `python:3.8-slim` and `gcc:14`, or restart Evaluation Service (its `npm start` script pulls both images). |
| Job stays `pending` | Check Redis connectivity, Evaluation Service logs, Docker Engine availability, and whether the submission row was inserted before a queueing failure. |
| Code is accepted but status update fails | Check `SUBMISSION_SERVICE_URL`, port `3002`, the submission UUID in the job, and Submission Service logs. The job ID is for queue diagnostics; status updates address the submission UUID. |
| A correct-looking answer is `wrong_answer` | Compare the captured output with expected output, including internal spaces and newlines. Leading/trailing whitespace is trimmed, but internal whitespace is not normalized. |

No automated test script is defined in the service package manifests.
