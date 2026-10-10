---
title: 'One binary: removing nginx, NATS and two services from OpenWorkers'
date: '2026-10-10'
description: With 1.15, one runner serves HTTP and HTTPS, starts the crons and stores the logs. Seven services became three, and what a single node gives up in return.
---

Until 0.15, a self-hosted OpenWorkers platform was seven services: nginx in
front, three runner replicas, NATS between them, a log service, a scheduler,
postgate and Postgres. With 1.15 it is three: Postgres, postgate and one
runner. The runner serves public HTTP and HTTPS itself, starts the crons, and
stores and streams the console logs.

```
before                                after

        nginx                          clients (HTTP, HTTPS)
          |                                    |
  +-------+-------+                         runner
  |               |                   workers, crons, logs
runner x3       logs                           |
  |               |                        PostgreSQL
  +------ nats ---+
          |
      scheduler
```

## What each removed service did

**nginx** terminated TLS, picked an upstream by hostname, and asked the API
worker how to route a custom domain (an auth subrequest to
`/api/domain/$host`, cached 30 seconds). The runner terminates TLS with
rustls, negotiates HTTP/2 through ALPN, and reads the `domains` table
itself. No subrequest, no cache to invalidate.

**NATS** carried two things: console lines from the runners to the log
service, and cron events from the scheduler to the runners. Both producers
and consumers are now in one process, so a channel replaces the broker.

**openworkers-logs** stored console lines and streamed them to the
dashboard. In the runner, each line goes to two places: a broadcast channel
for the live SSE and WebSocket streams, and a bounded queue of 10,000 lines
to a writer that inserts batches of up to 500 with one `UNNEST` statement.
When the database is slow and the queue is full, the runner drops lines and
counts them. It never slows down a worker to write a log.

**openworkers-scheduler** read the `crons` table and published due crons on
NATS. The runner reads the table and claims each due cron with a
compare-and-swap:

```sql
UPDATE crons SET next_run = $next, last_run = $previous
WHERE id = $id AND next_run = $previous AND deleted_at IS NULL
```

A cron that another claim moved does not match, so it does not run twice.

## The headers nginx used to own

Removing the proxy moved its duties into the runner, where they get tests:

- A public request cannot set `x-worker-id`, `x-worker-name`,
  `x-request-id`, the `x-openworkers-*` headers, or any of the forwarding
  headers. The runner removes them and sets its own.
- The client address is the TCP peer, unless `CLIENT_IP_HEADER` names a
  header and the peer is in the inbound allowlist. Behind Cloudflare:
  `cf-connecting-ip`, and the Cloudflare ranges in the allowlist.
- With `HTTPS_CLIENT_CA_FILE`, the HTTPS listener asks for a client cert.
  Behind a proxy that presents one to the origin, such as Cloudflare
  Authenticated Origin Pulls, nothing else can reach the runner and set the
  client address.
- A client has 30 seconds to send its request headers. A request body has a
  10 MiB limit, 30 MiB on the dashboard upload route.
- Paths that only a scanner asks for (`/.env`, `/.git/`, `id_rsa`,
  `*.php`) get a 404, and no worker starts for them.

Each rule is a pure function of the configuration and the request, so the
tests call it without a socket.

## One runner per database

The three replicas are gone on purpose. At start, the runner takes a
Postgres advisory lock on a connection of its own:

```sql
SELECT pg_try_advisory_lock(1869636974, 1) -- "open", the runner
```

A second runner on the same database fails to take it and exits. The runner
checks the session of the lock every second, and stops when it loses it, so
two runners never serve one platform.

This is what a single node gives up: a deploy stops the traffic while the
old runner stops and the new one starts, and one machine sets the capacity.
What it gains is that every piece of state a worker touches has one owner.
That is the property Durable Objects need, and the next step builds on it.

## What it costs a request

With nothing in front of it, a warm request is short. On a laptop, with a
release build, over HTTPS with a new connection for each request:

| worker              | runtime | warm request |
| ------------------- | ------- | ------------ |
| JavaScript          | V8      | 3.6 ms       |
| Rust (`workers-rs`) | wasm    | 3.1 ms       |

Most of that is the TLS handshake of the client.

## Upgrading

To update from 0.15, stop nginx, NATS, openworkers-logs and
openworkers-scheduler, then start the runner with `WORKER_DOMAINS` set, as it
has no default. Do not run the old log service or scheduler on the database
of a 1.15 runner. The
[infra repository](https://github.com/openworkers/openworkers-infra) has the
Compose files for both a local setup and production on port 443.
