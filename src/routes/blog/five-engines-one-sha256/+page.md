---
title: Five engines, one page, one sha256
date: '2026-08-19'
description: How a conformance oracle made five JavaScript engines render the same SvelteKit page byte-for-byte, and what it caught along the way.
---

OpenWorkers runs workers on more than one JavaScript engine: V8 in production,
plus JavaScriptCore, QuickJS, Boa and Nova behind the same `Worker` trait.
"Compatible" is easy to claim across five engines and hard to define. So we
stopped defining it and started measuring it: take a real application, record
what the reference engine produces, and diff every other engine against those
bytes.

## The oracle

The fixture is a real SvelteKit server bundle, 303 KB of ESM, lowered to a
354 KB classic script by the same SWC pass every backend uses. The reference
run on V8 records the response: status, headers in emission order, and the
body, 2615 bytes, sha256 `2ccbe4f9...`. That file is the oracle. A backend
passes when it produces the same bytes, not when its unit tests are green.

All five engines now render it byte-identically. That sentence took a week of
fixes, and every fix was something a unit-test suite had missed.

## What the oracle caught

**The same silent failure, four times.** Every alternative engine shipped a
hand-rolled, regex-based `URL`. SvelteKit calls `new URL(urlObject)` inside a
hook wrapped in a bare `catch`, so the resulting `TypeError` never reached a
log: the symptom was a blank 500 with nothing on the console. Four engines,
four authors, one identical bug. All four now back `URL` with the `url` crate.

**`request.formData()` did not exist anywhere.** A second fixture with 17
dynamic scenarios (cookies, form actions, redirects, a JSON API) found that
every form action returned a 500 on three engines, for the same missing
method. One fixture, one gap, found three times in an afternoon.

**Duplicate `Set-Cookie` headers were collapsed.** Two engines joined repeated
headers with a comma, which is correct for `link` and destructive for
`Set-Cookie`. Seven of the 17 scenarios emit two or three cookies, so the
oracle showed exactly which cookie disappeared and where.

**The reference itself was wrong.** The 17th scenario decodes `+` in a form
body. V8, our reference, did not decode it as a space; the three other engines
did, correctly. Two independent implementations disagreeing with the oracle in
the same direction is a strong signal the oracle is broken. We fixed V8's
urlencoded parser and re-recorded. A conformance suite that cannot indict its
own reference just launders the reference's bugs.

**A dependency-tracking heisenbug.** Boa's `URLSearchParams` read
`url.search` through the instance. SvelteKit's reactivity wraps `search` in a
tracking accessor, so reading a single query parameter marked the whole URL as
a dependency, which changed the serialized payload by six bytes and flipped
the ETag. No API-level test can see that; a framework running for real can.

## Separating framework noise from runtime bugs

Before trusting the 17-scenario oracle, we replayed all scenarios under Bun.
Sixteen of seventeen bodies matched V8 byte-for-byte, which told us two
things: SvelteKit's output is deterministic, and any divergence from the
oracle is a runtime bug, not framework noise. The one mismatch was the `+`
bug above.

## The scoreboard

The same philosophy now runs as a 448-assertion suite grounded in the
WinterTC Minimum Common API, with one scoreboard per engine. The first run
put V8 at 320/448, Boa at 319, QuickJS at 270 and JavaScriptCore at 268 - and
84 assertions failed on all four, which is the most useful number of all:
that is the part of the platform nobody ever implemented, starting with
`EventTarget`.

The suite exits non-zero only when the harness itself breaks. Failing guest
assertions are the product, not an error: a scoreboard you can only look at
when it is green is a scoreboard you will never look at.

