<script>
  import Tabs from '$lib/components/Tabs.svelte';
</script>

# KV Binding

Key-value storage for small data with low latency. Ideal for caching, sessions, feature flags, and configuration.

KV stores values as JSON natively — you can put strings, numbers, booleans, objects, and arrays directly without manual serialization.

## Setup

<Tabs tabs={['Dashboard', 'CLI', 'API']}>
  {#snippet children(active)}
    {#if active === 0}
      <div>
        <p>Go to <strong>KV</strong> in the sidebar and click <strong>New KV Namespace</strong>.</p>
        <p>Enter a name (e.g., <code>my-cache</code>).</p>
        <p>Then go to your worker's <strong>Environment</strong>, click <strong>Add Binding</strong> → select <strong>KV</strong>.</p>
        <p>Set binding name (e.g., <code>KV</code>) and select your namespace.</p>
      </div>
    {:else if active === 1}
      <div>

```bash
# Create KV namespace
ow kv create my-cache

# Create environment if needed
ow env create my-env

# Bind KV to environment
ow env bind my-env KV my-cache --type kv

# Link environment to worker
ow workers link my-worker --env my-env
```

      </div>
    {:else}
      <div>

```bash
# Create KV namespace
curl -X POST https://dash.openworkers.com/api/v1/kv \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "my-cache"}'

# Add binding to environment
curl -X PATCH https://dash.openworkers.com/api/v1/environments/my-env \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "values": [{
      "key": "KV",
      "value": "<kv-id>",
      "valueType": "kv"
    }]
  }'
```

      </div>
    {/if}
  {/snippet}
</Tabs>

## Usage

```javascript
export default {
  async fetch(request, env) {
    // Read a value
    const user = await env.KV.get('user:123');

    if (!user) {
      return new Response('Not found', { status: 404 });
    }

    return Response.json(user);
  }
};
```

## Operations

### get(key)

Read a value by key. Returns `null` if the key doesn't exist or has expired.

```javascript
// Returns the parsed value directly
const user = await env.KV.get('user:123');
// user is { name: 'John', role: 'admin' } — already an object

if (user === null) {
  console.log('Key not found');
}
```

**TypeScript:** Use the generic type parameter for type inference:

```typescript
interface User {
  name: string;
  role: 'admin' | 'user';
}

const user = await env.KV.get<User>('user:123');
// user is User | null
```

### put(key, value, options?)

Store a JSON-serializable value. Optionally set an expiration time.

```javascript
// Store an object
await env.KV.put('user:123', { name: 'John', role: 'admin' });

// Store a string
await env.KV.put('greeting', 'Hello, World!');

// Store a number
await env.KV.put('counter', 42);

// With expiration (TTL in seconds)
await env.KV.put('session:abc', { userId: 123 }, { expiresIn: 3600 }); // Expires in 1 hour
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

List all keys in the namespace. Returns an array of key names.

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
export default {
  async fetch(request, env) {
    const sessionId = request.headers.get('Cookie')?.match(/session=(\w+)/)?.[1];

    if (!sessionId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const session = await env.KV.get(`session:${sessionId}`);

    if (!session) {
      return new Response('Session expired', { status: 401 });
    }

    // Refresh session TTL on activity
    await env.KV.put(`session:${sessionId}`, session, { expiresIn: 1800 });

    return new Response('OK');
  }
};
```

### Feature flags

```javascript
const flags = await env.KV.get('feature-flags') || {};

if (flags.newCheckout) {
  // Show new checkout flow
}
```

### Rate limiting with auto-expiration

```javascript
const ip = request.headers.get('CF-Connecting-IP');
const key = `ratelimit:${ip}`;
const count = (await env.KV.get(key)) || 0;

if (count > 100) {
  return new Response('Too many requests', { status: 429 });
}

// Auto-reset after 1 minute
await env.KV.put(key, count + 1, { expiresIn: 60 });
```

### List and cleanup

```javascript
// Find all sessions
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
| Value size         | 100 KB    |
| Keys per namespace | Unlimited |

---

## Supported Value Types

KV stores JSON-serializable values. The following types are supported:

| Type      | Example                           |
| --------- | --------------------------------- |
| `string`  | `'hello'`                         |
| `number`  | `42`, `3.14`                      |
| `boolean` | `true`, `false`                   |
| `null`    | `null`                            |
| `array`   | `[1, 2, 3]`                       |
| `object`  | `{ name: 'John', age: 30 }`       |

> **Note:** Binary data (`Uint8Array`, `ArrayBuffer`) is not supported. Use the [Storage binding](/docs/bindings/storage) for binary data.

---

## KV vs Storage

| Feature    | KV                      | Storage                 |
| ---------- | ----------------------- | ----------------------- |
| Data model | JSON values             | Files/blobs             |
| Latency    | Low (~ms)               | Medium (~100ms)         |
| Max value  | 100 KB                  | Unlimited               |
| Expiration | Built-in TTL            | Manual                  |
| Binary     | No                      | Yes                     |
| Use case   | Cache, sessions, config | Files, uploads, backups |

Use **KV** for small, frequently accessed JSON data with optional expiration. Use **Storage** for larger files or binary data.
