---
title: The control plane is just another worker
date: '2026-08-22'
description: With 0.15, the OpenWorkers API and dashboard run as a worker on OpenWorkers. What dogfooding-only changes, and what it deliberately forbids.
---

As of 0.15, the REST API and the dashboard that manage OpenWorkers are
served by OpenWorkers. The control plane is a worker, deployed with the
same CLI command any user runs, subject to the same limits, paying the
same latency budget. There is no standalone API server anymore - not in
production, not in the docs. The only non-worker pieces left are the
runner itself, the scheduler, and the database they share.

## What serves your requests now

The API is one TypeScript app that answers both `api.` and `dash.`
hostnames: REST routes on one side, the dashboard's static assets on the
other, served through its assets binding. It talks to Postgres through
the database binding - the same D1-shaped interface every worker gets.
Its row in the workers table looks like anyone else's.

The proxy in front has no special case for it. Every hostname takes the same
path: nginx forwards to the runner, the runner resolves the worker from
the request, executes it, returns the response. The upstream blocks that
used to special-case the API and the dashboard are deleted.

## Custom domains, resolved by a worker

Routing a custom domain needs an answer to "whose domain is this?" That
lookup is an API endpoint - which means nginx asks a worker how to route
to workers. The proxy sends an auth subrequest to `/api/domain/$host`,
the API worker answers with a `Worker-Id` header, nginx caches it for 30
seconds and forwards. The recursion terminates because the API's own
hostnames are static: the runner resolves those directly from the
database, no subrequest involved.

## Why run it this way

The platform team now lives on the product. If cold starts hurt, we feel
them on every dashboard load before any user writes in. If the API needs
streaming responses, the runtime has to support streaming responses -
features stop being demo-grade the moment the control plane depends on
them. It also removes an entire always-on service from operations: no
API deployment pipeline, no API host, just a worker version to roll
forward or back.

## What it deliberately forbids

A control plane that runs on the platform cannot repair the platform.
If the runner is down, the API is down with it - so nothing
infrastructural is allowed to depend on the API. Migrations, setup and
recovery go through the CLI, which talks to Postgres directly. The
database is the single source of truth: the runner and the scheduler
read it without the API in the path, so the control plane going away
degrades administration, never execution.

## Also in 0.15

The release that carries the switch also ships typed byte parameters
and results in the SQL binding - blobs cross the boundary as bytes,
not strings.

The next step is already on branches: one runner binary serving both
worker species side by side, JavaScript in V8 and Rust as native WASM
components. That story - and why porting a Cloudflare `workers-rs` app
to it took a Cargo rename and three deletions - is in
[Running workers-rs without JavaScript](/blog/workers-rs-without-javascript).
