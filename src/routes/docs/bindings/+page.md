# Bindings

Bindings connect your worker to external resources. They're injected via the `env` global object, and your worker never sees the underlying credentials.

## Variables & Secrets

Environment variables for configuration.

```javascript
const apiUrl = env.API_URL;        // Variable (visible)
const apiKey = env.API_KEY;        // Secret (hidden in logs)
```

Configure in **Environments** in the dashboard.

See [Environment Variables](/docs/environment-variables) for setup.

---

## Resource Bindings

| Binding | Access | Description |
|---------|--------|-------------|
| [Storage](/docs/bindings/storage) | Read/Write | S3-compatible object storage |
| [KV](/docs/bindings/kv) | Read/Write | Key-value store |
| [Database](/docs/bindings/database) | Read/Write | SQL database (WIP) |

---

## Security Model

Workers **never see credentials**. The runner injects authentication server-side.

```
┌─────────────────────────────────────────────────────┐
│  Worker (untrusted code)                            │
│                                                     │
│  env.STORAGE.fetch('/data.json')                    │
│       ↓                                             │
│  Only knows: binding name + path                    │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│  Runner (trusted)                                   │
│                                                     │
│  1. Look up binding config by name                  │
│  2. Build full URL with credentials                 │
│  3. Sign request                                    │
│  4. Stream response back to worker                  │
└─────────────────────────────────────────────────────┘
```

**Benefits:**

- Workers can't leak credentials (they don't have them)
- Credentials rotate without code changes
- Multi-tenant isolation via scoped tokens
- Full audit trail at runner level
