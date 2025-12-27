# KV Binding

Key-value storage for small data with low latency. Ideal for caching, sessions, feature flags, and configuration.

> **Status:** Coming soon

## Usage

```javascript
addEventListener('fetch', async (event) => {
  // Read a value
  const value = await env.KV.get('user:123');

  if (!value) {
    event.respondWith(new Response('Not found', { status: 404 }));
    return;
  }

  event.respondWith(new Response(value));
});
```

## Operations

### get(key)

Read a value by key.

```javascript
const value = await env.KV.get('session:abc123');

// Returns null if key doesn't exist
if (value === null) {
  console.log('Key not found');
}
```

### put(key, value)

Write a value.

```javascript
await env.KV.put('user:123', JSON.stringify({ name: 'John', role: 'admin' }));
```

### delete(key)

Delete a key.

```javascript
await env.KV.delete('session:expired');
```

---

## Use Cases

### Session storage

```javascript
addEventListener('fetch', async (event) => {
  const sessionId = event.request.headers.get('Cookie')?.match(/session=(\w+)/)?.[1];

  if (!sessionId) {
    event.respondWith(new Response('Unauthorized', { status: 401 }));
    return;
  }

  const session = await env.KV.get(`session:${sessionId}`);

  if (!session) {
    event.respondWith(new Response('Session expired', { status: 401 }));
    return;
  }

  // Session valid, continue...
});
```

### Feature flags

```javascript
const flags = JSON.parse(await env.KV.get('feature-flags') || '{}');

if (flags.newCheckout) {
  // Show new checkout flow
}
```

### Rate limiting

```javascript
const ip = event.request.headers.get('CF-Connecting-IP');
const key = `ratelimit:${ip}`;
const count = parseInt(await env.KV.get(key) || '0');

if (count > 100) {
  event.respondWith(new Response('Too many requests', { status: 429 }));
  return;
}

await env.KV.put(key, String(count + 1));
```

---

## Limits

| Limit | Value |
|-------|-------|
| Key size | 512 bytes |
| Value size | 25 MB |
| Keys per namespace | Unlimited |

---

## KV vs Storage

| Feature | KV | Storage |
|---------|-----|---------|
| Data model | Key-value pairs | Files/objects |
| Latency | Low (~ms) | Medium (~100ms) |
| Max value | 25 MB | Unlimited |
| Use case | Cache, sessions, config | Files, uploads, backups |
| API | `get`, `put`, `delete` | `fetch` with HTTP methods |

Use **KV** for small, frequently accessed data. Use **Storage** for larger files or when you need file semantics.
