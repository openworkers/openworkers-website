# Bindings

Bindings connect your worker to external resources like environment variables, secrets, and object storage. They're injected into your worker via the `env` global object.

## Variables

Plain text environment variables accessible as strings.

```javascript
addEventListener('fetch', (event) => {
  const apiUrl = env.API_URL;
  const version = env.APP_VERSION;

  event.respondWith(new Response(`API: ${apiUrl}, Version: ${version}`));
});
```

Use variables for non-sensitive configuration: API endpoints, feature flags, version numbers, etc.

---

## Secrets

Secrets work exactly like variables but are hidden in logs and the dashboard.

```javascript
addEventListener('fetch', async (event) => {
  const response = await fetch('https://api.example.com/data', {
    headers: {
      'Authorization': `Bearer ${env.API_TOKEN}`
    }
  });

  event.respondWith(response);
});
```

Use secrets for: API keys, tokens, passwords, private keys, and any sensitive data.

---

## Assets

Read-only access to static files stored in S3 or R2.

```javascript
addEventListener('fetch', async (event) => {
  const { pathname } = new URL(event.request.url);

  // Fetch asset from storage
  const asset = await env.ASSETS.fetch(pathname);

  event.respondWith(asset);
});
```

### How it works

1. Your worker calls `env.ASSETS.fetch('/images/logo.png')`
2. The runner builds the full S3/R2 URL with your configured bucket and prefix
3. The runner signs the request with stored credentials
4. The file is streamed back to your worker

**Your worker never sees the storage credentials.** It only knows the binding name.

### Use cases

- Static file serving (images, CSS, JS)
- CDN origin
- Document storage

### Configuration

Assets bindings are configured in the dashboard with:

| Field | Description |
|-------|-------------|
| Bucket | S3/R2 bucket name |
| Prefix | Optional path prefix for isolation |
| Endpoint | S3/R2 endpoint URL |
| Public URL | Optional CDN URL for public access |

---

## Storage

Full read/write access to S3-compatible object storage.

```javascript
addEventListener('fetch', async (event) => {
  const { pathname } = new URL(event.request.url);

  if (event.request.method === 'GET') {
    // Read file
    const file = await env.STORAGE.fetch(pathname);
    event.respondWith(file);
    return;
  }

  if (event.request.method === 'PUT') {
    // Write file
    const body = await event.request.arrayBuffer();

    await env.STORAGE.fetch(pathname, {
      method: 'PUT',
      body: body
    });

    event.respondWith(new Response('Uploaded', { status: 201 }));
    return;
  }

  if (event.request.method === 'DELETE') {
    // Delete file
    await env.STORAGE.fetch(pathname, { method: 'DELETE' });
    event.respondWith(new Response('Deleted', { status: 200 }));
    return;
  }
});
```

### Supported operations

| Method | Description |
|--------|-------------|
| `GET` | Read file |
| `PUT` | Write/overwrite file |
| `DELETE` | Delete file |
| `HEAD` | Get file metadata |

### Use cases

- User uploads
- Generated files (reports, exports)
- Cache storage
- Data persistence

---

## KV (Coming Soon)

Key-value storage for small data with low latency.

```javascript
addEventListener('fetch', async (event) => {
  // Read
  const value = await env.KV.get('user:123');

  // Write
  await env.KV.put('user:123', JSON.stringify({ name: 'John' }));

  // Delete
  await env.KV.delete('user:123');

  event.respondWith(new Response(value));
});
```

---

## Security Model

OpenWorkers uses a credential isolation pattern for maximum security:

```
┌─────────────────────────────────────────────────────┐
│  Worker (untrusted code)                            │
│                                                     │
│  env.ASSETS.fetch('/logo.png')                      │
│       ↓                                             │
│  Only knows: binding name + path                    │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│  Runner (trusted)                                   │
│                                                     │
│  1. Look up binding config by name                  │
│  2. Build full URL: endpoint + bucket + prefix      │
│  3. Sign request with stored credentials            │
│  4. Execute request                                 │
│  5. Stream response back to worker                  │
└─────────────────────────────────────────────────────┘
```

**Why this matters:**

- Workers never see credentials, even if compromised
- Credentials can be rotated without updating worker code
- Multi-tenant isolation via prefix-scoped tokens
- Audit trail at the runner level

---

## Binding Types Summary

| Type | Access | Use Case |
|------|--------|----------|
| Variable | Read | Non-sensitive config |
| Secret | Read | Sensitive config (hidden in logs) |
| Assets | Read | Static files |
| Storage | Read/Write | Dynamic files |
| KV | Read/Write | Key-value data |

---

## Setting Up Bindings

1. Go to **Environments** in the dashboard
2. Create or select an environment
3. Add bindings with their configuration
4. Assign the environment to your worker

See [Environment Variables](/docs/environment-variables) for the dashboard walkthrough.
