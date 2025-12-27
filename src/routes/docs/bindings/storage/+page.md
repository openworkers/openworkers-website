# Storage Binding

Blob storage for files and binary data. Backed by S3-compatible object storage (AWS S3, Cloudflare R2, MinIO, etc.).

## Usage

```javascript
addEventListener('fetch', async (event) => {
  const { pathname } = new URL(event.request.url);

  if (event.request.method === 'GET') {
    const data = await env.STORAGE.get(pathname);

    if (!data) {
      event.respondWith(new Response('Not found', { status: 404 }));
      return;
    }

    event.respondWith(new Response(data));
    return;
  }

  if (event.request.method === 'PUT') {
    const body = await event.request.text();
    await env.STORAGE.put(pathname, body);
    event.respondWith(new Response('Uploaded', { status: 201 }));
    return;
  }

  if (event.request.method === 'DELETE') {
    await env.STORAGE.delete(pathname);
    event.respondWith(new Response('Deleted', { status: 200 }));
    return;
  }
});
```

## Operations

### get(key)

Read a file. Returns `null` if the key doesn't exist.

```javascript
const data = await env.STORAGE.get('uploads/image.png');

if (!data) {
  console.log('File not found');
}
```

### put(key, value)

Write a file. Accepts string or `Uint8Array`.

```javascript
// Text file
await env.STORAGE.put('data/config.json', JSON.stringify({ version: 1 }));

// Binary file
const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
await env.STORAGE.put('images/icon.png', bytes);
```

### head(key)

Get file metadata without downloading the content.

```javascript
const meta = await env.STORAGE.head('uploads/large-file.zip');

console.log(meta.size); // File size in bytes
console.log(meta.etag); // ETag for caching
```

| Property | Type     | Description          |
| -------- | -------- | -------------------- |
| `size`   | `number` | File size in bytes   |
| `etag`   | `string` | ETag hash (optional) |

### list(options?)

List files in the storage.

```javascript
// List all files
const result = await env.STORAGE.list();
console.log(result.keys); // Array of file keys
console.log(result.truncated); // true if more results exist

// With prefix filter
const uploads = await env.STORAGE.list({ prefix: 'uploads/' });

// With limit
const firstTen = await env.STORAGE.list({ limit: 10 });
```

| Option   | Type     | Description                                 |
| -------- | -------- | ------------------------------------------- |
| `prefix` | `string` | Only return keys starting with this prefix. |
| `limit`  | `number` | Maximum number of keys to return.           |

### delete(key)

Delete a file.

```javascript
await env.STORAGE.delete('uploads/old-file.txt');
```

---

## Use Cases

### File upload API

```javascript
addEventListener('fetch', async (event) => {
  if (event.request.method !== 'POST') {
    event.respondWith(new Response('Method not allowed', { status: 405 }));
    return;
  }

  const formData = await event.request.formData();
  const file = formData.get('file');

  if (!file) {
    event.respondWith(new Response('No file', { status: 400 }));
    return;
  }

  const key = `uploads/${Date.now()}-${file.name}`;
  const buffer = await file.arrayBuffer();

  await env.STORAGE.put(key, new Uint8Array(buffer));

  event.respondWith(
    new Response(JSON.stringify({ key }), {
      headers: { 'Content-Type': 'application/json' }
    })
  );
});
```

### Check file exists before processing

```javascript
const meta = await env.STORAGE.head('reports/daily.pdf');

if (!meta) {
  // Generate report
  const report = await generateReport();
  await env.STORAGE.put('reports/daily.pdf', report);
}
```

### List and cleanup old files

```javascript
const result = await env.STORAGE.list({ prefix: 'temp/' });

for (const key of result.keys) {
  await env.STORAGE.delete(key);
}
```

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

Request: env.STORAGE.get("/data/file.json")
Path: openworkers-shared/space_a1b2c3/data/file.json
```

Both AWS S3 and Cloudflare R2 support prefix-scoped tokens, ensuring isolation between tenants:

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
```

---

## Configuration

| Field    | Description                             |
| -------- | --------------------------------------- |
| Bucket   | S3/R2 bucket name                       |
| Prefix   | Path prefix for isolation (shared mode) |
| Endpoint | S3/R2 endpoint URL                      |
| Region   | AWS region (for S3)                     |

---

## Assets vs Storage

| Feature  | Assets                         | Storage                       |
| -------- | ------------------------------ | ----------------------------- |
| Access   | Read-only                      | Read/Write                    |
| Use case | Static files (images, CSS, JS) | Dynamic files (uploads, data) |
| API      | `env.ASSETS.fetch(path)`       | `env.STORAGE.get/put/delete`  |

Use **Assets** for static content that doesn't change. Use **Storage** when you need to write or delete files.
