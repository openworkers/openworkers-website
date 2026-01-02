<script lang="ts">
  import Console from '$lib/components/Console.svelte';

  let { data } = $props();
</script>

<svelte:head>
  <title>Introducing OpenWorkers – Self-hosted Cloudflare Workers in Rust</title>
</svelte:head>

<div class="min-h-screen py-16">
  <article class="mx-auto max-w-3xl px-6">
    <div class="mb-12 text-center">
      <h1 class="mb-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">Introducing OpenWorkers</h1>
      <p class="text-xl text-slate-600">Self-hosted Cloudflare Workers in Rust</p>
    </div>

    <div class="prose prose-slate prose-lg max-w-none">
      <p class="lead">
        OpenWorkers is an open-source runtime for executing JavaScript in V8 isolates. 
        It brings the Cloudflare Workers programming model to your own infrastructure.
      </p>

      <h2 class="text-2xl font-bold text-slate-900 mt-12 mb-6">What works today</h2>
      
      <div class="not-prose my-8 -mx-6 sm:mx-0">
        <Console title="worker.ts" content={data.workerHtml} />
      </div>

      <h2 class="text-2xl font-bold text-slate-900 mt-12 mb-6">Features</h2>
      
      <div class="grid gap-6 sm:grid-cols-2">
        <div class="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h3 class="mt-0 text-lg font-semibold text-slate-900">Bindings</h3>
          <ul class="my-4 space-y-2 text-sm text-slate-600">
            <li>• KV storage (get, put, delete, list)</li>
            <li>• PostgreSQL database</li>
            <li>• S3/R2-compatible storage</li>
            <li>• Service bindings</li>
            <li>• Environment variables & secrets</li>
          </ul>
        </div>
        
        <div class="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h3 class="mt-0 text-lg font-semibold text-slate-900">Web APIs</h3>
          <ul class="my-4 space-y-2 text-sm text-slate-600">
            <li>• fetch, Request, Response</li>
            <li>• ReadableStream</li>
            <li>• crypto.subtle</li>
            <li>• TextEncoder/Decoder, Blob</li>
            <li>• setTimeout, AbortController</li>
          </ul>
        </div>
      </div>

      <h2 class="text-2xl font-bold text-slate-900 mt-12 mb-6">Architecture</h2>

      <div class="my-8 -mx-6 overflow-x-auto bg-slate-50 ring-y ring-slate-200 sm:mx-0 sm:rounded-lg sm:ring-1">
        <pre class="hidden w-max p-4 font-mono text-xs leading-relaxed text-slate-700 lg:block">{`                         ┌─────────────────┐
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
                └─────────────────┘           └──────────────┘`}</pre>
        <pre class="w-max p-4 font-mono text-xs leading-relaxed text-slate-700 lg:hidden">{`
            +-------------+
            | nginx proxy |
            +------+------+
                   |
   +-------+-------+-------+--------+
   |       |       |                |
+--+--+ +--+--+ +--+---+ +----------+-+
| dash| | api | |logs *| | runner * x3|
+-----+ +--+--+ +--+---+ +-----+------+
           |       |           |
     +-----+----+  |    +------+-----+
     |postgate *|  +----+    nats    |
     +-----+----+       +------+-----+
           |                   |
     +-----+------+     +------+-----+
   *-| PostgreSQL |     | scheduler *|
     +------------+     +------------+`}</pre>
      </div>

      <ul class="space-y-2">
        <li><strong>V8 Isolates:</strong> Sandboxing with CPU (100ms) and memory (128MB) limits per worker.</li>
        <li><strong>Cron Scheduling:</strong> Built-in support for 5 or 6-field cron syntax.</li>
        <li><strong>Compatibility:</strong> Cloudflare Workers syntax compatible.</li>
      </ul>

      <h2 class="text-2xl font-bold text-slate-900 mt-12 mb-6">Self-hosting</h2>
      <p>
        Deployment is designed to be simple. A single PostgreSQL database and a single Docker Compose file is all you need.
      </p>

      <div class="not-prose my-8 -mx-6 sm:mx-0">
        <Console title="terminal" content={data.selfHostHtml} />
      </div>

      <h2 class="text-2xl font-bold text-slate-900 mt-12 mb-6">Why I built this</h2>
      <p>
        This project has been evolving for about 7 years. I started experimenting with vm2 for sandboxing JS,
        then Cloudflare launched Workers and I got hooked on the model. When Deno came out, I switched to deno-core
        and ran on that for two years. Recently, with Claude's help, I rewrote everything on top of rusty_v8 directly.
      </p>
      <p>
        The goal has always been the same: run JavaScript on your own servers,
        with the same DX as Cloudflare Workers but without vendor lock-in.
      </p>

      <div class="mt-8 grid gap-4 sm:grid-cols-3">
        <div class="text-center">
            <div class="font-bold text-slate-900">Your Data</div>
            <div class="text-sm text-slate-600">Never leaves your infrastructure</div>
        </div>
        <div class="text-center">
            <div class="font-bold text-slate-900">Predictable Costs</div>
            <div class="text-sm text-slate-600">No per-request pricing</div>
        </div>
        <div class="text-center">
            <div class="font-bold text-slate-900">No Lock-in</div>
            <div class="text-sm text-slate-600">Cloudflare Workers compatible</div>
        </div>
      </div>

      <div class="mt-16 rounded-2xl bg-blue-50 p-8 text-center ring-1 ring-blue-100">
        <p class="mb-4 font-semibold text-blue-900">
          Next up: Execution recording & replay for deterministic debugging.
        </p>
        <div class="flex justify-center gap-6">
          <a href="https://github.com/openworkers" class="font-medium text-blue-600 hover:text-blue-500 hover:underline">GitHub</a>
          <span class="text-blue-200">|</span>
          <a href="/docs" class="font-medium text-blue-600 hover:text-blue-500 hover:underline">Docs</a>
          <span class="text-blue-200">|</span>
          <a href="/docs/self-hosting" class="font-medium text-blue-600 hover:text-blue-500 hover:underline">Self-hosting Guide</a>
        </div>
      </div>
    </div>
  </article>
</div>
