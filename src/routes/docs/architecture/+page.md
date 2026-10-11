# Architecture

OpenWorkers runs JavaScript and TypeScript workers in V8 isolates. This section documents the internal architecture for contributors and auditors.

## Components

```
  clients, dashboard, CLI deploys
               |
               v
  +----------------------------------+        +-------------+
  |              Runner              |        |     CLI     |
  |              (Rust)              |        |   (Rust)    |
  |  HTTP and HTTPS, crons, logs     |        | infra/admin |
  |  +----------------------------+  |        +-------------+
  |  |  V8 runtime: isolates,     |  |               |
  |  |  Web APIs, bindings        |  |               |
  |  |  API worker (TypeScript)   |  |               |
  |  +----------------------------+  |               |
  +----------------------------------+               |
               |                                     |
               v                                     v
  +------------------------------------------------------------+
  |                        PostgreSQL                          |
  |       Workers, environments, bindings, users, logs         |
  +------------------------------------------------------------+
```

One runner serves all the traffic, the API worker included. The runner also
runs the crons, and stores and streams the console logs.

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
- Network access only through `fetch()` and bindings

### 3. Single Source of Truth

PostgreSQL is the single source of truth. All components read from/write to the same database. No local state.

### 4. CLI is the Only Infra Tool

The API runs as a worker on the platform (dogfooding). If the platform is down, the API is down. All infrastructure operations go through the CLI with direct DB access.

### 5. Logs in the Runner

Workers emit logs with `console.log`. The flow:

1. Worker calls `console.log('message')`
2. Runner sends the line to the live log streams at once
3. Runner writes the lines to the `logs` table in batches
4. Dashboard reads the live lines over SSE or WebSocket

A log client that falls 1024 lines behind is disconnected and must connect
again.

### 6. Unified Database Access via Postgate

[Postgate](https://github.com/openworkers/postgate) is a PostgreSQL HTTP proxy with token-based authentication. It serves two purposes:

1. **Worker bindings**: the runner embeds Postgate as a library for `env.DB.query()` calls. The API worker reaches the platform database through such a binding.
2. **HTTP access**: the API, when it runs as a plain Bun process in development, queries the platform database through Postgate HTTP.

Both share the same database and token system via PostgreSQL views:

```
┌─────────────────────────────────────────────────────────────────┐
│                         PostgreSQL                              │
├─────────────────────────────────────────────────────────────────┤
│  database_configs          │  database_tokens                   │
│  ─────────────────         │  ────────────────                  │
│  - API database            │  - API token                       │
│  - User databases          │  - User tokens (future)            │
│         ▲                  │         ▲                          │
│         │                  │         │                          │
│  ┌──────┴──────────────────┴─────────┴───────┐                  │
│  │              Postgate Views               │                  │
│  │  postgate_databases  ←→  database_configs │                  │
│  │  postgate_tokens     ←→  database_tokens  │                  │
│  └───────────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
```

This architecture means:

- **Single database** — No separate Postgate database needed
- **Unified tokens** — Same system for API and user databases
- **Future: HTTP access for users** — User databases will be accessible via Postgate HTTP (for debugging, migrations, CI/CD)

---

## Dogfooding

The **API** runs as a worker on OpenWorkers, and serves the **dashboard** UI:

- Same deployment model as user workers
- The CLI stays the only infra tool, for recovery when the platform is down

---

## Deep Dives

| Topic                                                         | Description                              |
| ------------------------------------------------------------- | ---------------------------------------- |
| [Bindings](/docs/architecture/bindings)                       | How bindings work internally             |
| [HTTP Flow](/docs/architecture/http-flow)                     | Request/response flow, streaming support |
| [Event Loop](/docs/architecture/event-loop)                   | V8 ↔ Rust async communication            |
| [Stream Cancellation](/docs/architecture/stream-cancellation) | Client disconnect during streaming       |
| [Security](/docs/architecture/security)                       | Isolation, limits, threat model          |

---

## Source Code

OpenWorkers is open source. Contributions welcome!

| Repository                                                                      | Description                                 |
| ------------------------------------------------------------------------------- | ------------------------------------------- |
| [openworkers-runner](https://github.com/openworkers/openworkers-runner)         | Core runtime, executes workers              |
| [openworkers-runtime-v8](https://github.com/openworkers/openworkers-runtime-v8) | V8 isolate integration                      |
| [openworkers-core](https://github.com/openworkers/openworkers-core)             | Shared types and operations                 |
| [openworkers-api](https://github.com/openworkers/openworkers-api)               | REST API and dashboard (TypeScript)         |
| [openworkers-cli](https://github.com/openworkers/openworkers-cli)               | Admin/infra tool                            |
| [postgate](https://github.com/openworkers/postgate)                             | PostgreSQL proxy for DB bindings            |
| [openworkers-infra](https://github.com/openworkers/openworkers-infra)           | Docker Compose setup for self-hosting       |
