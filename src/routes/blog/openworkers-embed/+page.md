---
title: 'OpenWorkers Embed: SvelteKit inside your Rust app'
date: '2026-10-30'
description: A Rust library that gives your Axum, hyper or actix app its own worker pool to render SvelteKit. One process, no Node container, and your load functions call Rust.
---

A lot of SvelteKit apps with a Rust backend run two things: the Rust API, and a
Node or Bun container that renders the pages and calls the API over HTTP. We
removed the second one.

OpenWorkers Embed is a Rust library. It gives your web app its own pool of
workers, running the same runtime as OpenWorkers, to render your SvelteKit
server code. Your backend and your SvelteKit app live in the same process. And
your `load` functions call Rust directly, the way a Tauri frontend calls its
commands:

```ts
export const load = async ({ platform }) => ({
  user: await platform.invoke('get_user', { id: 42 })
});
```

On the Rust side, `get_user` is a function you register by name:

```rust
use openworkers_embed::Embed;

#[derive(serde::Deserialize)]
struct GetUser {
    id: u32,
}

let embed = Embed::builder(std::fs::read_to_string("build/_worker.js")?)
    .assets("build/assets")
    .command_sync("get_user", |args: GetUser| {
        Ok::<_, String>(find_user(args.id))
    })
    .build()?;

let app = openworkers_embed::backend::axum::router(embed);
```

That is a complete server. `build/` is the output of
`@openworkers/adapter-sveltekit`: `_worker.js` is your SSR code and `assets/`
is your static files.

## Commands, not bindings

Embed has no storage or database bindings. Your Rust code owns those, and it
decides what a route may ask for. A command is a Rust function with a name.
Arguments and results are JSON. If the function returns an `Err`, the worker
gets an exception.

`platform.invoke` is a small piece of the adapter. Since 0.6.2,
`@openworkers/adapter-sveltekit` builds it for each request from the `EMBED`
binding that Embed gives its worker. A worker that is not an Embed one has no
such binding, and calling `platform.invoke` throws a clear error. To type it,
extend the platform in `src/app.d.ts`:

```ts
import type { Platform as OpenWorkersPlatform } from '@openworkers/adapter-sveltekit';

declare global {
  namespace App {
    interface Platform extends OpenWorkersPlatform {}
  }
}

export {};
```

A plain worker, with no SvelteKit, calls `env.EMBED.invoke(name, args)`.

## How it works

Embed starts one thread per CPU. Each thread runs a single-threaded async
runtime, because a JavaScript engine keeps its state on the thread that made
it. On V8, the isolates stay warm in a pool, and requests go to the threads in
turn.

`Embed::fetch` takes a request and returns a response, so it fits any web
framework. Modules for Axum, hyper and actix convert the requests and the
responses for you. They use the conversions that `openworkers-core` already
has for the runner.

A few things the runner does, Embed does too:

- **Static files.** Rust serves the files of `assets/` for GET and HEAD
  requests, before the worker runs. A hashed file under `_app/immutable/` gets
  a cache header of one year, marked immutable.
- **Outbound `fetch`.** The worker's `fetch` goes out through the same client
  settings as the runner's: five seconds to connect, ten seconds without a byte
  from the server, and a redirect is the answer, not a hop.
- **Streaming.** A response body streams out as the worker makes it, and a
  response from `fetch` streams in. If the runtime stops a worker while its
  body streams (a CPU limit, for example), the body ends with an error. It does
  not stay open for ever.

## Three engines

The engine is a Cargo feature, and exactly one is active, as in the runner.

| feature | engine         | what to know                                                            | example server, release, stripped |
| ------- | -------------- | ----------------------------------------------------------------------- | --------------------------------- |
| `v8`    | V8             | The default. Isolates stay warm in a pool.                              | 61 MB                             |
| `jsc`   | JavaScriptCore | The system framework of macOS. A worker per request. Host binding only. | 8.5 MB                            |
| `nova`  | Nova           | Pure Rust, experimental. A worker per request. No global `fetch`.       | 15 MB                             |

The sizes are the example server of the repository, with Axum, built in
release mode and stripped. JavaScriptCore costs nothing to ship on macOS,
because the engine is already on the machine. The same SvelteKit build renders
on all three.

## What it is not

Embed runs your own code in your own process. There is no isolation between
workers, no per-tenant limits, and the worker's `fetch` has no egress filter,
so it can call a service on the same machine. If you run code you do not
trust, use the OpenWorkers runner, which has all of that.

## Rough edges

This is an early alpha. Expect things to break.

- **Not on crates.io.** Use a Git dependency for now.
- **One worker per `Embed`.** To change the code, build a new `Embed`. There
  is no hot reload yet.
- **Files are read whole.** The static files of `assets/` are not streamed.
- **A leak in V8 context recycling.** While we benchmarked it, we found that the
  runtime keeps about 350 KB for each context it retires. By default a context
  serves 1,000 requests. A worker thread that serves roughly 330,000 requests
  reaches the 128 MB heap limit, and requests start to fail. It is tracked, and
  not fixed yet.
- **TLS needs a C compiler and CMake.** The `fetch` feature, on by default, brings
  `reqwest` and its TLS stack. Turn it off if the worker does not call out.

## Try it

Add the library, and the adapter to your SvelteKit app:

```toml
[dependencies]
openworkers-embed = { git = "https://github.com/openworkers/openworkers-embed", features = ["axum"] }
```

```bash
bun add -d @openworkers/adapter-sveltekit
```

The repository has a complete example: an Axum server and a SvelteKit app that
calls two Rust commands.

```bash
cargo run --features axum --example server examples/sveltekit-app/build
```

The code is on GitHub, under the MIT license:
[openworkers-embed](https://github.com/openworkers/openworkers-embed) and
[adapter-sveltekit](https://github.com/openworkers/adapter-sveltekit). We would
love your feedback, so please open an issue if something breaks.
