---
title: Running workers-rs without JavaScript
date: '2026-08-20'
description: A Cloudflare workers-rs app, one Cargo rename, zero JS glue - served as a native WASM component. Then Go, and what its numbers teach.
---

<svelte:head>

  <title>Running workers-rs without JavaScript - OpenWorkers Blog</title>
  <meta name="description" content="A Cloudflare workers-rs app, one Cargo rename, zero JS glue - served as a native WASM component. Then Go, and what its numbers teach." />
</svelte:head>

<div class="mx-auto max-w-7xl">
<div class="max-w-3xl px-6 py-16 markdown-body">

# Running workers-rs without JavaScript

_2026-08-20_

Rust on Cloudflare Workers is Rust compiled to WASM, wrapped in generated
JavaScript glue, executed inside V8. The `worker` crate talks to the platform
through `wasm-bindgen`, which means a JS engine sits between your Rust and
every I/O call. We wanted the other path: Rust workers as **native WASM
components** on wasmtime, no JS glue, no JS engine - without asking anyone to
rewrite their app.

## The contract is WIT, not an SDK

The runtime's contract is deliberately not ours. HTTP in and out is the
standard `wasi:http/proxy` world - which has a useful corollary we test in
CI: a stock component built against the upstream `wasi` crate, zero
OpenWorkers types, serves HTTP on our runtime unmodified. Anything
`componentize-js` or TinyGo emits for `wasi:http` is already a valid worker.

Platform bindings live in a small WIT package beside it: a D1-shaped
`database` interface whose parameter variants map one-to-one onto the host's
typed SQL values (nothing stringly-typed crosses the boundary), a `kv`
interface storing JSON documents, and an R2-shaped `storage` interface moving
raw bytes. The binding name is the first argument of every call, so the host
resolves and validates names - a guest cannot reach a binding its worker does
not declare.

## The one-line migration

On top of that contract sits `openworkers-worker`, a guest SDK
API-compatible with `worker` 0.8. Migration is a Cargo rename:

```toml
# before
worker = { version = "0.8", features = ["d1"] }
# after
worker = { package = "openworkers-worker", version = "0.1", features = ["d1"] }
```

Same `#[event(fetch)]` macros, same `Request`/`Response`/`Env`, same D1
prepared-statement API. Two details made real apps port instead of demos.
First, shim modules: existing apps reference `wasm_bindgen`, `js_sys::Date`,
`spawn_local` - the SDK re-exports equivalents under the same paths, so those
call sites compile unchanged. Second, an executor: workers-rs handlers are
`async`, but WASI 0.2 exports are synchronous and a component has exactly one
thread, so `block_on` (which parks the thread) can never wake. The SDK runs a
no-op-waker poll loop instead; every WASI 0.2 host call has a blocking form,
so a guest future never actually needs a wakeup from the host.

The proof: an existing production workers-rs application - a status page
using two D1 bindings and a cron trigger - compiled and served through the
runtime with **four edits, none in handler logic**: drop
`console_error_panic_hook`, drop `wasm-bindgen-futures`, drop chrono's
`wasmbind` feature (the clock now comes from `std` via WASI), and the rename
itself.

That port also found the SDK's best bug. A spawned task _finishing_ emptied
the cooperative task queue, which the executor misread as "nothing can wake
the handler" and aborted the request - precisely the oneshot-bridge shape
real apps use and 14 integration tests had not. Nothing audits an SDK like an
application.

## Go, and what its numbers teach

The point of a WIT contract is that the second language is cheap. A thin Go
package over the same WIT, compiled with TinyGo to a wasip2 component, passes
the same tests: HTTP, cron, and all three bindings with typed SQL parameters,
goroutines included, multiplexed on the single thread.

The numbers are the interesting part:

| guest                             | size   | min CPU budget to serve once |
| --------------------------------- | ------ | ---------------------------- |
| Rust                              | 140 KB | 3 ms                         |
| Go, default build                 | 539 KB | 605 ms                       |
| Go, `-gc=leaking -scheduler=none` | 352 KB | 34 ms                        |

That 605 ms is not the handler: it is Go runtime initialization, charged on
every request because the runtime currently instantiates a fresh component
per event. A _smaller_ handler measured worse (839 ms) - less data section
means more heap to initialize. Go fits the default budget only by giving up
its GC and goroutines, which is not a trade to hide in a README. The honest
fix is structural - warm instances per worker - and it is the same item that
tops the runtime's backlog for Rust cold starts too.

Two happy findings closed old workarounds: on wasip2, `getrandom` and
`std::time` just work (no `wasm_js` backends, no `wasm-bindgen` features),
and the `inventory` crate's link-time registration survives componentization,
because the linker lowers constructors into explicit calls before the
componentizer ever sees them.

And one contract lesson we only learned from the second language: we had
pinned our world to `wasi:http@0.2.12`, TinyGo's runtime targets `0.2.0`, and
the component tooling refuses imports the world does not declare. The
resolvers happily run older imports against newer implementations - so the
version you declare in a WIT world is a floor for your guests, and the lower
you can declare it, the more toolchains can target you unmodified.

</div>
</div>
