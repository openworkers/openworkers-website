# Limits & Quotas

OpenWorkers enforces resource limits to ensure fair usage and protect against runaway code.

## CPU Time

**Limit:** 100ms of CPU time per request

CPU time measures actual computation, not wall-clock time. Waiting for `fetch()` or `setTimeout()` doesn't count.

```javascript
// This is fine - fetch wait time doesn't count
const response = await fetch('https://slow-api.com'); // 5 seconds wait
const data = await response.json(); // CPU: ~1ms

// This will hit the limit - pure computation
for (let i = 0; i < 1_000_000_000; i++) {
  // Heavy computation
}
```

**When exceeded:** Returns `429 Too Many Requests` with header `X-Termination-Reason: CpuTimeLimit`

---

## Wall Clock Timeout

**Limit:** 60 seconds total execution time

This is the maximum time a worker can run, including all waiting time.

```javascript
// This will timeout after 60 seconds
await new Promise((resolve) => setTimeout(resolve, 120_000)); // 2 minutes
```

**When exceeded:** Returns `408 Request Timeout` with header `X-Termination-Reason: WallClockTimeout`

---

## Memory

**Limits:**

- Initial heap: 1 MB
- Maximum heap: 128 MB

Memory includes all JavaScript objects, strings, arrays, and buffers.

```javascript
// This will hit the memory limit
const data = [];

for (let i = 0; i < 10_000_000; i++) {
  data.push({ index: i, value: 'x'.repeat(1000) });
}
```

**When exceeded:** Returns `503 Service Unavailable` with header `X-Termination-Reason: MemoryLimit`

---

## Response Headers

When a worker is terminated due to resource limits, the response includes:

| Header                 | Description               |
| ---------------------- | ------------------------- |
| `X-Termination-Reason` | Why the worker was killed |

Possible values:

| Value              | HTTP Status | Meaning                    |
| ------------------ | ----------- | -------------------------- |
| `CpuTimeLimit`     | 429         | Exceeded 100ms CPU time    |
| `WallClockTimeout` | 408         | Exceeded 60s total time    |
| `MemoryLimit`      | 503         | Exceeded memory allocation |
| `Exception`        | 500         | Unhandled JavaScript error |

---

## Best Practices

### Avoid CPU-intensive loops

```javascript
// Bad - blocks CPU
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}
fibonacci(45); // Will timeout

// Good - use memoization or iterative approach
function fibonacciIterative(n) {
  let a = 0,
    b = 1;

  for (let i = 0; i < n; i++) {
    [a, b] = [b, a + b];
  }

  return a;
}
```

### Stream large responses

```javascript
// Bad - loads everything in memory
const data = await fetchLargeFile();
return new Response(data);

// Good - stream the response
const response = await fetch('https://example.com/large-file');
return new Response(response.body, {
  headers: response.headers
});
```

### Set timeouts on external requests

```javascript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10_000); // 10s timeout

try {
  const response = await fetch('https://api.example.com', {
    signal: controller.signal
  });
  clearTimeout(timeout);
  return response;
} catch (err) {
  if (err.name === 'AbortError') {
    return new Response('External API timeout', { status: 504 });
  }
  throw err;
}
```

### Avoid large in-memory processing

```javascript
// Bad - stores all results in memory
const results = [];

for (const item of largeDataset) {
  results.push(await processItem(item));
}

return new Response(JSON.stringify(results));

// Good - process and stream incrementally
const stream = new ReadableStream({
  async start(controller) {
    const encoder = new TextEncoder();
    controller.enqueue(encoder.encode('['));

    let first = true;

    for (const item of largeDataset) {
      const result = await processItem(item);
      const prefix = first ? '' : ',';
      controller.enqueue(encoder.encode(prefix + JSON.stringify(result)));
      first = false;
    }

    controller.enqueue(encoder.encode(']'));
    controller.close();
  }
});

return new Response(stream, {
  headers: { 'Content-Type': 'application/json' }
});
```

---

## Limits Summary

| Resource   | Limit  | On Exceed |
| ---------- | ------ | --------- |
| CPU Time   | 100ms  | 429       |
| Wall Clock | 60s    | 408       |
| Memory     | 128 MB | 503       |

These limits apply to both `fetch` events (HTTP requests) and `scheduled` events (cron jobs).
