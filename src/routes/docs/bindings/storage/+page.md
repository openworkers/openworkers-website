# Storage Binding

Full read/write access to S3-compatible object storage (AWS S3, Cloudflare R2, MinIO, etc.).

## Usage

```javascript
addEventListener('fetch', async (event) => {
  const { pathname } = new URL(event.request.url);

  if (event.request.method === 'GET') {
    const file = await env.STORAGE.fetch(pathname);
    event.respondWith(file);
    return;
  }

  if (event.request.method === 'PUT') {
    const body = await event.request.arrayBuffer();

    await env.STORAGE.fetch(pathname, {
      method: 'PUT',
      body: body
    });

    event.respondWith(new Response('Uploaded', { status: 201 }));
    return;
  }

  if (event.request.method === 'DELETE') {
    await env.STORAGE.fetch(pathname, { method: 'DELETE' });
    event.respondWith(new Response('Deleted', { status: 200 }));
    return;
  }
});
```

## Operations

| Method | Description |
|--------|-------------|
| `GET` | Read file |
| `PUT` | Write/overwrite file |
| `DELETE` | Delete file |
| `HEAD` | Get file metadata |

## Use Cases

- User uploads
- Generated files (reports, exports, invoices)
- Cache storage
- Data persistence
- Backup storage

---

## Deployment Modes

### Shared Storage (Platform-Provisioned)

Default mode, cost-effective for most users.

- Platform provides a shared S3/R2 bucket
- Each binding gets an isolated **prefix**
- Token is **scoped to that prefix only**

```
Config:
  endpoint: NULL (uses platform default)
  bucket: "openworkers-shared"
  prefix: "space_a1b2c3"
  token: <prefix-scoped-token>

Request: env.STORAGE.fetch("/data/file.json")
URL built: https://s3.../openworkers-shared/space_a1b2c3/data/file.json
```

Each binding has its own prefix, so you can have multiple storage bindings with different isolated spaces.

Both AWS S3 and Cloudflare R2 support prefix-scoped tokens:

- **AWS S3:** IAM policies with `Resource: "arn:aws:s3:::bucket/prefix/*"`
- **Cloudflare R2:** API tokens with prefix restrictions

### Dedicated Storage (User-Provided)

For premium users, compliance requirements, or specific regions.

- You provide your own S3/R2 endpoint
- Full bucket access (no prefix restriction)
- You manage credentials

```
Config:
  endpoint: "https://my-bucket.s3.eu-west-1.amazonaws.com"
  bucket: "my-assets"
  prefix: NULL
  token: <full-access-token>

Request: env.STORAGE.fetch("/data/file.json")
URL built: https://my-bucket.s3.eu-west-1.amazonaws.com/my-assets/data/file.json
```

---

## Configuration

| Field | Description |
|-------|-------------|
| Bucket | S3/R2 bucket name |
| Prefix | Path prefix for isolation (shared mode) |
| Endpoint | S3/R2 endpoint URL |
| Region | AWS region (for S3) |

---

## Assets vs Storage

| Feature | Assets | Storage |
|---------|--------|---------|
| Access | Read-only | Read/Write |
| Use case | Static files (images, CSS, JS) | Dynamic files (uploads, data) |
| API | `env.ASSETS.fetch(path)` | `env.STORAGE.fetch(path, options)` |

Use **Assets** for static content that doesn't change. Use **Storage** when you need to write or delete files.
