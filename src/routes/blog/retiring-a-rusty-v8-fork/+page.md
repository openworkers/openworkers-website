---
title: Retiring a rusty_v8 fork
date: '2026-08-19'
description: Upstream landed the isolate locker our fork existed for. What migrating six V8 majors actually broke, and what a fork should shrink to.
---

OpenWorkers pools V8 isolates across threads: an isolate is created once,
parked, and locked by whichever thread serves the next request. Upstream
rusty_v8 removed its `v8::Locker` bindings years ago, so we carried a fork
adding `Locker` and an unentered-isolate mode. Forking a crate that wraps a
C++ engine is not like forking a normal library: every release means merging
upstream, rebuilding V8, and re-publishing binaries.

In August 2026, upstream landed its own take: `SharedIsolate`, an
`Arc`-shaped isolate with a `lock()` guard, panic-safe teardown, and native
deferred `Global` resets. Better than ours on every axis. The fork's reason
to exist was gone, so we migrated - six V8 majors at once, 146 to 152.

## What actually broke

**A restriction we had "verified" as harmless.** Shared isolates reject weak
handles, and we had grepped our code for `v8::Weak`: zero uses, all clear.
Then 19 tests failed. `v8::Context::set_slot` - which we called on every
context - hangs a `v8::Weak` finalizer internally. The lesson generalizes:
auditing your own source for an API tells you nothing about what the APIs you
call do behind the curtain. The fix was a plain Rust map, keyed by `TypeId`,
whose address rides in a private property on the context's global. Ownership
became explicit: the state dies with the context instead of waiting for GC.

**A use-after-free the old version was hiding.** We cached a raw isolate
pointer across lock acquisitions. In V8 146 that pointer happened to stay
valid; in 152, `Locker::deref_mut` hands out a reference into a cell that
lives inside the guard, and our cached pointer read a dead stack frame on the
warm path. The bug existed all along - the upgrade just removed the luck.
Fixing it also deleted twelve `unsafe` blocks that no longer had a reason to
exist.

**206 lines of dead machinery.** Our deferred-destruction queue existed
because dropping a `Global` without holding the lock was unsound. Upstream
now defers those resets natively on lock, unlock and teardown - and a check
showed our queue had no callers left at all. The best line of a migration
diff is the deleted one.

The payoff, measured on our SSR benchmark: worker creation 3.24 to 2.97 ms,
cold cycle with code cache 2.16 to 1.99 ms, steady-state rendering unchanged.
Six engine majors show up at compile time and startup, not in JS execution. And
the render stayed byte-identical to the recorded oracle at every step, which
is what let us do this migration in a day instead of a month.

## What a fork should shrink to

Of the eleven commits our fork carried, exactly one survived: the CI matrix.
Upstream publishes prebuilt binaries for the common configurations, but not
for `aarch64-linux` with pointer compression, and no sandbox variant at all.
Those are configurations we run, so the fork's whole job is now: upstream's
tag, plus one workflow that builds the missing artifacts, published under the
same naming scheme so the build script's mirror mechanism
(`RUSTY_V8_MIRROR` with fallback) fetches only what upstream lacks.

Being first through an unbuilt path finds things. The sandbox configuration
had never been exercised by upstream CI, and it turned out to reference two
source dependencies (`disarm`, `fadec`) that V8's dependency manifest pins
but rusty_v8's `.gitmodules` never listed - invisible until someone actually
builds the sandbox configuration. That is now fixed and worth an upstream report.

One recurring cost remains: V8 152 embeds ICU 78, and the `icudtl.dat` you
ship must match the `set_common_data_NN` symbol of the ICU your engine links.
Every engine bump now includes a data-file bump. Written down here so the
next one is a step, not an investigation.

