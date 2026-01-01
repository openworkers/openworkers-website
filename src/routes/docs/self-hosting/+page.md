# Self-Hosting

Run OpenWorkers on your own infrastructure.

---

## Requirements

- Docker + Docker Compose
- TLS certificates (for HTTPS)
- GitHub OAuth app (for dashboard login)

---

## Quick Start

```bash
# Clone the infra repo
git clone https://github.com/openworkers/openworkers-infra.git
cd openworkers-infra

# Configure environment
cp .env.example .env
# Edit .env with your values

# Start database and run migrations
docker compose up -d postgres
git clone https://github.com/openworkers/openworkers-cli.git
for f in openworkers-cli/migrations/*.sql; do
  docker compose exec -T postgres psql -U $POSTGRES_USER -d $POSTGRES_DB < "$f"
done

# Generate API token
docker compose up -d postgate
docker compose exec postgate postgate gen-token \
  aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa api \
  --permissions SELECT,INSERT,UPDATE,DELETE
# Copy the token to .env as POSTGATE_TOKEN=pg_xxx...

# Start all services
docker compose up -d
```

---

## Stack

| Service | Description |
| ------- | ----------- |
| postgres | PostgreSQL database |
| nats | Message queue for worker communication |
| [postgate](https://github.com/openworkers/postgate) | HTTP proxy for PostgreSQL |
| [openworkers-api](https://github.com/openworkers/openworkers-api) | REST API |
| [openworkers-runner](https://github.com/openworkers/openworkers-runner) | Worker runtime (V8 isolates) |
| [openworkers-logs](https://github.com/openworkers/openworkers-logs) | Log aggregator |
| [openworkers-scheduler](https://github.com/openworkers/openworkers-scheduler) | Cron job scheduler |
| [openworkers-dash](https://github.com/openworkers/openworkers-dash) | Dashboard UI |
| openworkers-proxy | Nginx reverse proxy |

---

## Architecture

```
                         ┌─────────────────┐
                         │  nginx (proxy)  │
                         └────────┬────────┘
                                  │
         ┌───────────────┬────────┴──┬───────────────┐
         │               │           │               │
         │               │           │               │
┌────────┸────────┐ ┌────┸────┐ ┌────┸────┐ ┌────────┸────────┐
│   dashboard     │ │  api    │ │ logs *  │ │  runner (x3) *  │
└─────────────────┘ └────┬────┘ └────┰────┘ └────────┰────────┘
                         │           │               │
                         │           │               │
                ┌────────┸────────┐  │      ┌────────┸────────┐
                │   postgate *    │  └──────┥      nats       │
                └─────────────────┘         └────────┰────────┘
                                                     │
                                                     │
                ┌─────────────────┐           ┌──────┴───────┐
         * ─────┥   PostgreSQL    │           │ scheduler *  │
                └─────────────────┘           └──────────────┘
```

**Single database:** All components share one PostgreSQL database. Postgate uses views that map to OpenWorkers tables.

---

## Configuration

### Required Environment Variables

| Variable               | Description                     |
| ---------------------- | ------------------------------- |
| `POSTGRES_USER`        | Database user                   |
| `POSTGRES_PASSWORD`    | Database password               |
| `POSTGRES_DB`          | Database name                   |
| `GITHUB_CLIENT_ID`     | OAuth app client ID             |
| `GITHUB_CLIENT_SECRET` | OAuth app secret                |
| `JWT_ACCESS_SECRET`    | JWT signing key (min 32 chars)  |
| `JWT_REFRESH_SECRET`   | JWT refresh key (min 32 chars)  |
| `POSTGATE_TOKEN`       | API token (generated in step 4) |
| `HTTP_TLS_CERTIFICATE` | Path to TLS certificate         |
| `HTTP_TLS_KEY`         | Path to TLS private key         |

---

## Updating

```bash
# Pull latest images
docker compose pull

# Restart services
docker compose up -d

# Apply new migrations (if any)
for f in openworkers-cli/migrations/*.sql; do
  docker compose exec -T postgres psql -U $POSTGRES_USER -d $POSTGRES_DB < "$f" 2>/dev/null || true
done
```

---

## Resources

- [openworkers-infra](https://github.com/openworkers/openworkers-infra) - Full Docker Compose setup
- [openworkers-cli](https://github.com/openworkers/openworkers-cli) - Database migrations
