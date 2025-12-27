# Architecture

OpenWorkers is built for security, performance, and extensibility. This section documents the internal architecture for contributors and auditors.

## Components

```
┌──────────────────────────────────────────────────────────────────┐
│                         Dashboard                                │
│                    (Angular + Tailwind)                          │
└───────────────────────────┬──────────────────────────────────────┘
                            │                              │
                         REST                             SSE
                            │                              │
                            ▼                              ▼
┌──────────────────────────────────────────┐      ┌─────────────────┐
│                   API                    │      │      Logs       │
│            (TypeScript / Bun)            │      │     (Rust)      │
│   User-facing REST API, CRUD operations  │      │                 │
└──────────────────────────────────────────┘      │ - NATS → DB     │
                            │                     │ - SSE streaming │
                            ▼                     └─────────────────┘
┌──────────────────────────────────────────┐              │
│               Postgate                   │              │
│                (Rust)                    │              │
│   PostgreSQL proxy, row-level security   │              │
└──────────────────────────────────────────┘              │
                            │                             │
                            ▼                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                         PostgreSQL                               │
│              Workers, environments, bindings, users, logs        │
└──────────────────────────────────────────────────────────────────┘
          │                             │               │
          │                             │               │
          ▼                             ▼               ▼
┌─────────────────────────────┐   ┌───────────┐   ┌───────────┐
│           Runner            │◄──│ Scheduler │   │    CLI    │
│           (Rust)            │   │  (Rust)   │   │  (Rust)   │
│                             │   │           │   │           │
│  ──► HTTP requests          │   │           │   │           │
│  ──► Scheduler signal       │   │  Watches  │   │  Infra/   │
│  ┌────────────────────────┐ │   │   crons   │   │   admin   │
│  │      V8 Runtime        │ │   │           │   │           │
│  │  Isolates, Web APIs,   │ │   │   NATS    │   │           │
│  │    native bindings     │ │   │  events   │   │           │
│  └────────────────────────┘ │   └───────────┘   └───────────┘
└─────────────────────────────┘
```

## Key Principles

### 1. Workers Never See Credentials

Bindings inject resources without exposing secrets. The runner authenticates requests server-side.

```
Worker: env.STORAGE.get('file.txt')
    ↓
Runner: Look up binding config → Sign S3 request → Execute → Return data
    ↓
Worker: Receives file content (never sees S3 credentials)
```

### 2. Isolate-Based Sandboxing

Each worker runs in a V8 isolate with:

- Memory limits
- CPU time limits
- No filesystem access
- No network access except via bindings

### 3. Single Source of Truth

PostgreSQL is the single source of truth. All components read from/write to the same database. No local state.

### 4. CLI is the Only Infra Tool

The API is designed to run as a worker (dogfooding). If the platform is down, the API is down. All infrastructure operations go through the CLI with direct DB access.

### 5. Logs via NATS

Workers emit logs via `console.log`. The flow:

1. Worker calls `console.log('message')`
2. Runner publishes to NATS (`logs.<worker_id>`)
3. Logs service subscribes, writes to PostgreSQL
4. Dashboard connects via SSE for live streaming

This decouples log ingestion from request handling.

---

## Future Work

### Dogfooding

Both **API** and **Dashboard** will run as OpenWorkers workers:

- Proves the platform can host production apps
- Same deployment model as users
- CLI remains the only infra tool (for recovery when platform is down)

---

## Deep Dives

| Topic                                     | Description                            |
| ----------------------------------------- | -------------------------------------- |
| [Bindings](/docs/architecture/bindings)   | How bindings work internally           |
| [HTTP Flow](/docs/architecture/http-flow) | Request/response flow, streaming support |

---

## Source Code

OpenWorkers is open source. Contributions welcome!

| Repository                                                                      | Description                                 |
| ------------------------------------------------------------------------------- | ------------------------------------------- |
| [openworkers-runner](https://github.com/openworkers/openworkers-runner)         | Core runtime, executes workers              |
| [openworkers-runtime-v8](https://github.com/openworkers/openworkers-runtime-v8) | V8 isolate integration                      |
| [openworkers-core](https://github.com/openworkers/openworkers-core)             | Shared types and operations                 |
| [openworkers-api](https://github.com/openworkers/openworkers-api)               | REST API (TypeScript)                       |
| [openworkers-scheduler](https://github.com/openworkers/openworkers-scheduler)   | Cron job execution                          |
| [openworkers-logs](https://github.com/openworkers/openworkers-logs)             | Log ingestion (NATS → DB) and SSE streaming |
| [openworkers-cli](https://github.com/openworkers/openworkers-cli)               | Admin/infra tool                            |
| [openworkers-dash](https://github.com/openworkers/openworkers-dash)             | Dashboard (Angular)                         |
| [postgate](https://github.com/openworkers/postgate)                             | PostgreSQL proxy for DB bindings (planned)  |
