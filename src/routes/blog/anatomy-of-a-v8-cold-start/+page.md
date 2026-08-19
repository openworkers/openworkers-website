---
title: Anatomy of a V8 cold start
date: '2026-08-20'
description: Startup snapshots save 6%, per-script code caches save 62%. Where the time actually goes when a worker wakes to render a page.
---

The workload that matters for a workers platform is not a benchmark loop. It
is: wake a worker, server-side render a page, return the bytes, go back to
sleep. We measured that cycle on a real 303 KB SvelteKit server bundle,
because the two mechanisms V8 offers against cold starts - startup snapshots
and code caches - attack different costs, and the only way to know which one
matters is to measure your own workload.

## Two different costs, two different tools

A **startup snapshot** serializes the runtime's own heap: the `URL`,
`Headers`, `Response` and stream classes the platform evaluates into every
fresh isolate. Ours is 444 KB. A **code cache** serializes the compiled
bytecode of one specific worker script, so waking that worker skips parsing
and compiling it.

Measured on the SSR cycle (create worker + render once), interleaved A/B
runs:

| configuration              | cold cycle |
| -------------------------- | ---------- |
| no snapshot, no code cache | 6.02 ms    |
| snapshot only              | 5.60 ms    |
| code cache only            | 2.61 ms    |
| both                       | 2.30 ms    |

The snapshot saves about 6%. The code cache saves 57-62%. The asymmetry is
the size ratio: the runtime's platform code is small and V8 evaluates it
fast, while the user bundle is 354 KB after lowering. Against a "hello world"
worker the proportions flip - which is exactly why measuring someone else's
workload misleads.

Two non-obvious details. First, the code cache helps the render, not just
the startup: it saves 1.7 ms on worker creation but 3.4 ms on the full
cycle, because caching with eager compilation also covers the inner functions
that lazy compilation would otherwise compile mid-render. Anyone measuring
only "time to create a worker" understates the cache by half. Second, the
cache is not free: the packed blob is 715 KB for a 303 KB bundle, 2.3x the
source, and it is specific to the engine configuration it was compiled under:
a cache built with a snapshot present differs from one built without.

Parsing itself is cheaper than folklore says: V8 pre-parses and defers inner
functions, so parse-plus-compile of the 354 KB script is about 3.3 ms. The
cache does not rescue you from a catastrophic parser; it amortizes a modest
cost across every wake.

## The GC detour: reproduce, then tune

Cloudflare published that relaxing decade-old young-generation settings bought
them ~25% on CPU-heavy workers, and that GC ate 10-25% of Next.js SSR time.
Our defaults had the same smell: deriving the young generation from a small
per-worker heap cap left 4 MB semi-spaces where modern V8 defaults to 16 MB.

So we instrumented GC around the SSR fixture first. Result: the cold path
does **zero** collections, and a warm render allocates 70 KB - about 6% GC
share, below the noise floor of a 0.09 ms render. We swept twelve heap
configurations; none moved anything. On this workload there was nothing to
win.

Then we built a handler that allocates 1.5 MB per request, the shape of a
heavier SSR framework - and Cloudflare's number reproduced almost exactly:
0.340 ms to 0.254 ms per request (-25%), GC share from 31% to 6.5%, by
letting the young generation grow to 8 MB. Idle memory per worker did not
move.

Both halves are the lesson. The published finding was real, and it did not
apply to our workload; it applied to a workload we could construct. Tuning
what you have not measured is how settings from 2017 survive until 2026.

## Where this leaves density

With both mechanisms on, the full wake-render-sleep cycle is 2.3 ms, and an
idle worker holds about 2.2 MB of resident memory. At those numbers the
bottleneck is not wake latency any more - it is memory per sleeping worker.
Optimizing cold starts further buys little; the next fight is footprint.

