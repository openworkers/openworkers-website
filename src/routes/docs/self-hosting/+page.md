# Self-Hosting

Run OpenWorkers on your own infrastructure.

---

## Requirements

- Docker + Docker Compose
- TLS certificate and key (the proxy terminates HTTPS)
- The [`ow` CLI](/docs/cli), for migrations and platform administration
- GitHub OAuth app, for dashboard sign-in

---

## Quick Start

```bash
# Clone the infra repo
git clone https://github.com/openworkers/openworkers-infra.git
cd openworkers-infra

# Configure environment
cp .env.example .env
# Edit .env with your values

# Start the database
docker compose -f compose.yml -f compose.dev.yml up -d postgres

# Run migrations over a direct database connection
ow alias set infra --db postgres://openworkers:<password>@localhost:5432/openworkers
ow infra migrate status
ow infra migrate run

# Generate the Postgate token for the platform database (id: the nil UUID)
docker compose up -d postgate
docker compose exec postgate postgate gen-token \
  00000000-0000-0000-0000-000000000000 api \
  --permissions SELECT,INSERT,UPDATE,DELETE
# Copy the token to .env as POSTGATE_TOKEN=pg_xxx...

# Start all services
docker compose up -d
```

`compose.dev.yml` publishes port 5432 on the host, which the CLI needs for the migration step.

The REST API and the dashboard are one worker deployed on the platform itself, so the stack is not complete until that worker is uploaded. Claiming the system user, configuring platform storage, and deploying the API worker are covered in [GETTING_STARTED.md](https://github.com/openworkers/openworkers-infra/blob/main/GETTING_STARTED.md).

---

## Stack

| Service | Description |
| ------- | ----------- |
| postgres | PostgreSQL database |
| nats | Message queue for logs and scheduled events |
| [postgate](https://github.com/openworkers/postgate) | HTTP proxy for PostgreSQL |
| [openworkers-runner](https://github.com/openworkers/openworkers-runner) | Worker runtime (V8 isolates), 3 replicas |
| [openworkers-logs](https://github.com/openworkers/openworkers-logs) | Log ingestion and SSE streaming |
| [openworkers-scheduler](https://github.com/openworkers/openworkers-scheduler) | Cron job scheduler |
| openworkers-proxy | Nginx reverse proxy, terminates TLS |

The REST API and the dashboard are not services here: [openworkers-api](https://github.com/openworkers/openworkers-api) is deployed as a worker and served by the runner, like any other worker.

---

## Architecture

```
                     ┌─────────────────┐
                     │  nginx (proxy)  │
                     └────────┬────────┘
                              │
               ┌──────────────┴──────────────┐
               │                             │
      ┌────────┴────────┐          ┌─────────┴─────────┐
      │  runner (x3) *  │          │      logs *       │
      │                 │          │                   │
      │  every worker,  │          │  SSE log stream   │
      │  API included   │          │                   │
      └────────┬────────┘          └─────────┬─────────┘
               │                             │
               └──────────────┬──────────────┘
                              │
                    ┌─────────┴─────────┐
                    │       nats        │
                    └─────────┬─────────┘
                              │
                    ┌─────────┴─────────┐
                    │    scheduler *    │
                    └───────────────────┘

  * = also reads and writes PostgreSQL, directly or through postgate
```

**Single database:** All components share one PostgreSQL database. Postgate uses views that map to OpenWorkers tables.

---

## Configuration

### Required Environment Variables

| Variable                       | Description                                       |
| ------------------------------ | ------------------------------------------------- |
| `POSTGRES_USER`                | Database user                                     |
| `POSTGRES_PASSWORD`            | Database password                                 |
| `POSTGRES_DB`                  | Database name                                     |
| `DATABASE_URL`                 | Connection string for runner, logs and scheduler  |
| `NATS_SERVERS`                 | NATS URL                                          |
| `POSTGATE_URL`                 | Postgate endpoint                                 |
| `POSTGATE_TOKEN`               | Token for the platform database (generated above) |
| `POSTGATE_SYSTEM_TOKEN_SECRET` | Secret used to derive tokens for user databases   |
| `GITHUB_CLIENT_ID`             | OAuth app client ID                               |
| `GITHUB_CLIENT_SECRET`         | OAuth app secret                                  |
| `JWT_ACCESS_SECRET`            | JWT signing key (min 32 chars)                    |
| `JWT_REFRESH_SECRET`           | JWT refresh key (min 32 chars)                    |
| `HTTP_TLS_CERTIFICATE`         | Path to TLS certificate                           |
| `HTTP_TLS_KEY`                 | Path to TLS private key                           |

The GitHub, JWT and Postgate secrets are consumed by the API worker. Set them on its environment with `ow env set`, as described in the infra walkthrough.

---

## Updating

```bash
# Pull latest images
docker compose pull

# Restart services
docker compose up -d

# Apply new migrations (if any)
ow infra migrate run
```

---

## Resources

- [openworkers-infra](https://github.com/openworkers/openworkers-infra) - Docker Compose setup
- [GETTING_STARTED.md](https://github.com/openworkers/openworkers-infra/blob/main/GETTING_STARTED.md) - End-to-end walkthrough, including the API worker
- [openworkers-cli](https://github.com/openworkers/openworkers-cli) - Migrations and platform administration
