# Self-Hosting

Run OpenWorkers on your own infrastructure.

---

## Requirements

- Docker and Docker Compose
- The [`ow` CLI](/docs/cli), for migrations and platform administration
- An S3-compatible bucket, for the static assets of the workers
- A TLS certificate and key, for the HTTPS listener of the runner
- A GitHub OAuth app, for the sign-in to the dashboard

---

## Quick Start

```bash
git clone https://github.com/openworkers/openworkers-infra.git
git clone https://github.com/openworkers/openworkers-runner.git
cd openworkers-infra

cp .env.example .env
# Set POSTGRES_PASSWORD, and the same password in DATABASE_URL

# Start the database
docker compose -f compose.yml -f compose.dev.yml up -d postgres

# Apply the migrations over a direct database connection
ow alias set infra --db postgres://openworkers:<password>@localhost:5432/openworkers
ow infra migrate run

# Start the stack
docker compose -f compose.yml -f compose.dev.yml up -d
```

`compose.dev.yml` publishes PostgreSQL on port 5432, for the CLI. It builds the
runner from the `openworkers-runner` checkout next to `openworkers-infra`.

Migration 28 fails under `ow migrate run` with
`unsafe use of new value "planetscale" of enum type`. Apply it with `psql`, as
[GETTING_STARTED.md](https://github.com/openworkers/openworkers-infra/blob/main/GETTING_STARTED.md#3-cli-alias-and-migrations)
shows, then run `ow infra migrate run` again.

The REST API and the dashboard are one worker, and the runner serves it. The
stack is not complete until you upload that worker. GETTING_STARTED.md gives
the steps: claim the system user, configure the platform storage, and deploy
the API worker.

---

## Stack

| Service                                                                  | Description                                                    |
| ------------------------------------------------------------------------ | -------------------------------------------------------------- |
| postgres                                                                 | Platform data and worker logs                                  |
| [openworkers-runner](https://github.com/openworkers/openworkers-runner) | Public HTTP and HTTPS, workers, crons, log storage and streams |
| [postgate](https://github.com/openworkers/postgate)                      | HTTP API to PostgreSQL, on the Compose network only            |

One runner serves all the traffic. It holds a PostgreSQL advisory lock, so a
second runner on the same database does not start. There is no rolling update
and no failover.

[openworkers-api](https://github.com/openworkers/openworkers-api) is not a
service here. It is a worker, and the runner serves it like any other worker.

---

## Architecture

```
            clients
               |
               v
  +-------------------------+
  |         runner          |
  |  every worker, the API  |
  |  worker included; crons |
  |  and logs               |
  +-------------------------+
               |
               v
  +-------------------------+        +----------+
  |       PostgreSQL        | <----- | postgate |
  +-------------------------+        +----------+
```

All the components use one PostgreSQL database. Postgate reads its databases
and tokens through views on the OpenWorkers tables.

---

## Configuration

The runner reads `.env`:

| Variable                                    | Description                                                     |
| ------------------------------------------- | --------------------------------------------------------------- |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`        | Database role                                                   |
| `POSTGRES_DB`                               | Database name                                                   |
| `DATABASE_URL`                              | Connection string of the runner                                 |
| `WORKER_DOMAINS`                            | Domains of the `{name}.{domain}` worker hosts                   |
| `DASHBOARD_HOSTS`                           | Hosts of the API worker                                         |
| `API_WORKER_NAME`                           | Name of the API worker; default `openworkers-api`               |
| `HTTP_TLS_CERTIFICATE`, `HTTP_TLS_KEY`      | TLS files on the host; add `-f compose.tls.yml` to mount them   |

The [runner README](https://github.com/openworkers/openworkers-runner#single-runner-deployment)
lists all the settings of the runner.

The API worker reads its own variables: the GitHub, JWT and storage secrets.
Set them on its environment with `ow env set`. The runner does not read them.

---

## Updating

```bash
docker compose -f compose.yml -f compose.dev.yml up -d --build --remove-orphans
ow infra migrate run
```

Compose stops the old runner before it starts the new one, so the traffic
stops for that time. In production, use `compose.prod.yml`; the
[infra README](https://github.com/openworkers/openworkers-infra#deploy) gives
the commands.

---

## Resources

- [openworkers-infra](https://github.com/openworkers/openworkers-infra): Docker Compose setup
- [GETTING_STARTED.md](https://github.com/openworkers/openworkers-infra/blob/main/GETTING_STARTED.md): full setup, the API worker included
- [openworkers-cli](https://github.com/openworkers/openworkers-cli): migrations and platform administration
