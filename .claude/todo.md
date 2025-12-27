# Documentation TODO

## Priority 1: Runtime API Reference ✅

La page `/docs/runtime` a été complètement réécrite avec :

- [x] Fetch API (fetch, Request, Response, Headers)
- [x] URL & URLSearchParams
- [x] Text Encoding (TextEncoder, TextDecoder, btoa, atob)
- [x] Binary Data (Blob, File, FormData)
- [x] Streams (ReadableStream avec exemples SSE)
- [x] Crypto (randomUUID, getRandomValues, digest, HMAC)
- [x] Timers (setTimeout, setInterval, queueMicrotask)
- [x] AbortController
- [x] Console
- [x] Other (structuredClone, performance.now, global aliases)
- [x] Limitations section

---

## Priority 2: Bindings ✅

Nouvelle page `/docs/bindings` créée avec :

- [x] Variables - plain text env vars
- [x] Secrets - hidden in logs
- [x] Assets - read-only S3/R2 avec `env.ASSETS.fetch()`
- [x] Storage - read/write S3/R2 avec `env.STORAGE.fetch()`
- [x] KV - coming soon (get/put/delete)
- [x] Security model - credential isolation diagram
- [x] Binding types summary table

---

## Priority 3: Limits & Quotas ✅

Nouvelle page `/docs/limits` créée avec :

- [x] CPU Time - 100ms max (429)
- [x] Wall Clock - 60s timeout (408)
- [x] Memory - 128 MB heap (503)
- [x] Response headers `X-Termination-Reason`
- [x] Best practices (streaming, timeouts, memoization)
- [x] Summary table

---

## Priority 4: REST API Reference ⏭️

Skipped - API is internal (used by dashboard only)

---

## Priority 5: Scheduled Tasks ✅

Page enrichie avec :

- [x] Cron syntax détaillée (5 et 6 champs, diagrammes ASCII)
- [x] Table d'exemples de cron expressions
- [x] Special characters (*, */n, n-m, n,m)
- [x] ScheduledEvent interface
- [x] Exemples pratiques (daily cleanup, hourly sync, health check)
- [x] Setup via dashboard et API
- [x] Limites (100ms CPU, 60s wall, 128MB)
- [x] Tips

---

## Priority 6: Self-Hosting Guide

Nouvelle page `/docs/self-hosting` :

- [ ] Requirements (PostgreSQL, NATS, S3/R2)
- [ ] Docker Compose setup
- [ ] Environment variables
- [ ] Reverse proxy (Caddy/nginx)
- [ ] Custom domains configuration

---

## Priority 7: CLI Documentation

Nouvelle section `/docs/cli/` :

- [ ] Installation
- [ ] `openworkers login`
- [ ] `openworkers deploy`
- [ ] `openworkers logs`
- [ ] Configuration profiles

---

## Priority 8: Internals (enrichir)

### Architecture

- [ ] Request flow diagram
- [ ] Components overview (Runner, API, Scheduler, Dashboard)
- [ ] Database schema overview

### Runtime

- [ ] V8 isolate model
- [ ] Why V8 (not QuickJS, Deno, etc.)
- [ ] Snapshot support

### Security

- [ ] Isolation model
- [ ] Resource limits enforcement
- [ ] Binding credential isolation

---

## Améliorations diverses

### Pages existantes

- [ ] **Introduction** - Ajouter architecture diagram
- [ ] **Runtime** - Réorganiser en catégories (Fetch, Encoding, Crypto, Streams)
- [ ] **Examples** - Ajouter plus d'exemples (auth, caching, rate-limiting)

### Navigation

- [ ] Ajouter icônes aux catégories
- [ ] Ajouter search (Algolia ou local)
- [ ] Ajouter breadcrumbs

### UX

- [ ] Dark mode support
- [ ] Copy button sur code blocks
- [ ] Playground intégré (exécuter du code)

---

## Notes

- Runtime = **runtime-v8 uniquement** (pas deno, quickjs, etc.)
- API docs basées sur openworkers-api (Hono/Bun)
- Scheduler utilise croner pour le parsing cron
