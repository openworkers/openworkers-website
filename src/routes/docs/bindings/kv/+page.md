# KV Binding

Key-value storage for small data with low latency. Ideal for caching, sessions, feature flags, and configuration.

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

Read a value by key. Returns `null` if the key doesn't exist or has expired.

```javascript
const value = await env.KV.get('session:abc123');

if (value === null) {
  console.log('Key not found');
}
```

### put(key, value, options?)

Write a value. Optionally set an expiration time.

```javascript
// Simple put
await env.KV.put('user:123', JSON.stringify({ name: 'John', role: 'admin' }));

// With expiration (TTL in seconds)
await env.KV.put('session:abc', 'data', { expiresIn: 3600 }); // Expires in 1 hour
```

| Option      | Type     | Description                                                                 |
| ----------- | -------- | --------------------------------------------------------------------------- |
| `expiresIn` | `number` | Time-to-live in seconds. Key will be automatically deleted after this time. |

> **Note:** Updating a key without `expiresIn` removes any existing expiration.

### delete(key)

Delete a key.

```javascript
await env.KV.delete('session:expired');
```

### list(options?)

List all keys in the namespace.

```javascript
// List all keys
const keys = await env.KV.list();

// With prefix filter
const userKeys = await env.KV.list({ prefix: 'user:' });

// With limit
const firstTen = await env.KV.list({ limit: 10 });
```

| Option   | Type     | Description                                       |
| -------- | -------- | ------------------------------------------------- |
| `prefix` | `string` | Only return keys starting with this prefix.       |
| `limit`  | `number` | Maximum number of keys to return (default: 1000). |

---

## Use Cases

### Session storage with expiration

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

  // Refresh session TTL on activity
  await env.KV.put(`session:${sessionId}`, session, { expiresIn: 1800 });

  // Session valid, continue...
});
```

### Feature flags

```javascript
const flags = JSON.parse((await env.KV.get('feature-flags')) || '{}');

if (flags.newCheckout) {
  // Show new checkout flow
}
```

### Rate limiting with auto-expiration

```javascript
const ip = event.request.headers.get('CF-Connecting-IP');
const key = `ratelimit:${ip}`;
const count = parseInt((await env.KV.get(key)) || '0');

if (count > 100) {
  event.respondWith(new Response('Too many requests', { status: 429 }));
  return;
}

// Auto-reset after 1 minute
await env.KV.put(key, String(count + 1), { expiresIn: 60 });
```

### List and cleanup

```javascript
// Find all expired session markers
const sessions = await env.KV.list({ prefix: 'session:' });

for (const key of sessions) {
  const data = await env.KV.get(key);

  if (shouldCleanup(data)) {
    await env.KV.delete(key);
  }
}
```

---

## Limits

| Limit              | Value     |
| ------------------ | --------- |
| Key size           | 512 bytes |
| Value size         | 25 MB     |
| Keys per namespace | Unlimited |

---

## KV vs Storage

| Feature    | KV                      | Storage                 |
| ---------- | ----------------------- | ----------------------- |
| Data model | Key-value pairs         | Files/blobs             |
| Latency    | Low (~ms)               | Medium (~100ms)         |
| Max value  | 25 MB                   | Unlimited               |
| Expiration | Built-in TTL            | Manual                  |
| Use case   | Cache, sessions, config | Files, uploads, backups |

Use **KV** for small, frequently accessed data with optional expiration. Use **Storage** for larger files or binary data.
