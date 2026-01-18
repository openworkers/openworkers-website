# Bindings

Bindings connect your worker to external resources. They're injected via the `env` global object, and your worker never sees the underlying credentials.

## Variables & Secrets

Environment variables for configuration. Set them in the **Environments** tab of the dashboard.

```javascript
const apiUrl = env.API_URL; // Variable (visible in logs)
const apiKey = env.API_KEY; // Secret (hidden in logs)
```

**Variables** are visible in logs. **Secrets** are masked.

---

## Resource Bindings

| Binding                             | Access     | Description                                                      |
| ----------------------------------- | ---------- | ---------------------------------------------------------------- |
| [Storage](/docs/bindings/storage)   | Read/Write | Blob storage (S3/R2) with `get`, `put`, `head`, `list`, `delete` |
| [KV](/docs/bindings/kv)             | Read/Write | Key-value store with TTL support                                 |
| [Database](/docs/bindings/database) | Read/Write | PostgreSQL database with parameterized queries                   |

---

## Security Model

Workers **never see credentials**. The runner injects authentication server-side.

```
┌─────────────────────────────────────────────────────┐
│  Worker                                             │
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
