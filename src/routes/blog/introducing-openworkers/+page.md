---
title: Introducing OpenWorkers
date: '2026-01-01'
description: Self-hosted Cloudflare Workers in Rust.
---

OpenWorkers is an open-source runtime for executing JavaScript in V8
isolates. It brings the Cloudflare Workers programming model to your own
infrastructure.

## What works today

```typescript
export default {
  async fetch(request, env) {
    const data = await env.KV.get("key");
    const rows = await env.DB.query(
      "SELECT * FROM users WHERE id = $1",
      [1]
    );
    return Response.json({ data, rows });
  }
};
```

## Features

**Bindings**

- KV storage (get, put, delete, list)
- PostgreSQL database
- S3/R2-compatible storage
- Service bindings
- Environment variables & secrets

**Web APIs**

- fetch, Request, Response
- ReadableStream
- crypto.subtle
- TextEncoder/Decoder, Blob
- setTimeout, AbortController

## Architecture

```text
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

- **V8 Isolates:** Sandboxing with CPU (100ms) and memory (128MB) limits per worker.
- **Cron Scheduling:** Built-in support for 5 or 6-field cron syntax.
- **Compatibility:** Cloudflare Workers syntax compatible.

## Self-hosting

Deployment is designed to be simple. A single PostgreSQL database and a
single Docker Compose file is all you need.

```bash
git clone https://github.com/openworkers/openworkers-infra
cd openworkers-infra && cp .env.example .env
docker compose up -d postgres
# Run migrations, generate token
docker compose up -d
```

## Why I built this

This project has been evolving for about 7 years. I started experimenting
with vm2 for sandboxing JS, then Cloudflare launched Workers and I got
hooked on the model. When Deno came out, I switched to deno-core and ran
on that for two years. Recently, with Claude's help, I rewrote everything
on top of rusty_v8 directly.

The goal has always been the same: run JavaScript on your own servers,
with the same DX as Cloudflare Workers but without vendor lock-in.

- **Your Data** - Never leaves your infrastructure
- **Predictable Costs** - No per-request pricing
- **No Lock-in** - Cloudflare Workers compatible

Next up: Execution recording & replay for deterministic debugging.

[GitHub](https://github.com/openworkers) | [Docs](/docs) | [Self-hosting Guide](/docs/self-hosting)
