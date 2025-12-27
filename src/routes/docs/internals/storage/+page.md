# Storage Bindings

OpenWorkers supports storage bindings that allow workers to access static assets and object storage without exposing credentials to the worker code.

## Binding Types

### Assets (Static Files)

Read-only access to static files (images, JS, CSS, etc.).

```javascript
// Worker code
const response = await env.ASSETS.fetch("/images/logo.png");
const data = await response.arrayBuffer();
```

### Storage (Object Storage)

Full read/write access to S3-compatible storage.

```javascript
// Worker code
await env.STORAGE.fetch("/data/user.json", {
  method: "PUT",
  body: JSON.stringify({ name: "John" })
});
```

## Deployment Modes

### Shared S3 (Platform-Provisioned)

**Use case:** Default mode, cost-effective for most users.

- Platform provides a shared S3/R2 bucket
- Each binding gets an allocated **prefix** for isolation
- Token is **scoped to that prefix only**

```
Config:
  endpoint: NULL (uses platform default)
  bucket: "openworkers-shared"
  prefix: "usr_abc123"
  token: <prefix-scoped-token>

URL built: https://platform-s3.../openworkers-shared/usr_abc123/images/logo.png
```

**Security:** Both AWS S3 and Cloudflare R2 support prefix-scoped tokens:

- **AWS S3:** IAM policies with `Resource: "arn:aws:s3:::bucket/prefix/*"` or S3 Access Points
- **Cloudflare R2:** API tokens with prefix restrictions

This is a standard multi-tenant isolation pattern used by many platforms.

### Dedicated S3 (User-Provided)

**Use case:** Premium users, compliance requirements, specific regions.

- User provides their own S3/R2 endpoint
- Full bucket access (no prefix)
- User manages their own credentials

```
Config:
  endpoint: "https://my-bucket.s3.eu-west-1.amazonaws.com"
  bucket: "my-assets"
  prefix: NULL
  token: <full-access-token>

URL built: https://my-bucket.s3.eu-west-1.amazonaws.com/my-assets/images/logo.png
```

## Security Model

Workers **never see credentials**. They only know the binding name.

```
┌─────────────────────────────────────────────────────────────────┐
│  Worker (untrusted)                                             │
│  env.ASSETS.fetch("/logo.png")                                  │
│  ↓                                                              │
│  Only knows: binding name "ASSETS", path "/logo.png"            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Runner (trusted)                                               │
│  1. Lookup config by binding name                               │
│  2. Build full S3 URL: endpoint + bucket + prefix + path        │
│  3. Inject auth header: Bearer <token>                          │
│  4. Execute HTTP request                                        │
│  5. Stream response back to worker                              │
└─────────────────────────────────────────────────────────────────┘
```

Even if a worker is compromised or buggy, it cannot leak credentials because it never has access to them.

## Database Schema

```sql
CREATE TABLE assets_configs (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL,
    name varchar(255) NOT NULL,        -- "my-cdn", "static-assets"
    bucket varchar(255) NOT NULL,      -- "openworkers-shared" or "user-bucket"
    prefix varchar(255),               -- NULL for dedicated, "usr_abc" for shared
    token varchar(255) NOT NULL,       -- scoped or full access
    endpoint varchar(255),             -- NULL for platform default, or custom URL
    public_url varchar(255),           -- optional CDN URL for public access
    UNIQUE (user_id, name)
);

-- In environment_values:
-- type = 'assets'
-- value = UUID pointing to assets_configs.id
```

## References

- [AWS S3 IAM Policies](https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-policies-s3.html)
- [AWS S3 Access Points](https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-points.html)
- [Cloudflare R2 API Tokens](https://developers.cloudflare.com/r2/api/tokens/)
- [Cloudflare Workers Bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/)
