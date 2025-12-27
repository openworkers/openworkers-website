# Bindings Architecture

This document describes how bindings work internally. For usage documentation, see [Bindings](/docs/bindings).

## Overview

Bindings connect workers to external resources without exposing credentials. The worker only knows the binding name and operation — the runner handles authentication.

```
┌─────────────────────────────────────────────────────┐
│  Worker (untrusted code)                            │
│                                                     │
│  await env.KV.get('session:123')                    │
│       ↓                                             │
│  Knows: binding name + operation + params           │
└─────────────────────────────────────────────────────┘
                         ↓
                  SchedulerMessage
                         ↓
┌─────────────────────────────────────────────────────┐
│  Runner (trusted)                                   │
│                                                     │
│  1. Look up binding config by name                  │
│  2. Execute operation with credentials              │
│  3. Return result to worker                         │
└─────────────────────────────────────────────────────┘
```

## Binding Types

| Type      | Description               | Backend    |
| --------- | ------------------------- | ---------- |
| `var`     | Environment variable      | In-memory  |
| `secret`  | Hidden variable           | In-memory  |
| `assets`  | Static files (read-only)  | S3/R2      |
| `storage` | Blob storage (read/write) | S3/R2      |
| `kv`      | Key-value with TTL        | PostgreSQL |

## Database Schema

### Binding Configuration

```sql
-- Binding type enum
CREATE TYPE binding_type AS ENUM ('var', 'secret', 'assets', 'storage', 'kv');

-- Environment values (simple bindings)
CREATE TABLE environment_values (
  id UUID PRIMARY KEY,
  environment_id UUID NOT NULL,
  user_id UUID NOT NULL,
  key VARCHAR(255) NOT NULL,
  value TEXT,
  binding_type binding_type NOT NULL,
  config_id UUID  -- References config table for complex types
);

-- KV namespace configuration
CREATE TABLE kv_configs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  desc TEXT
);

-- KV data storage
CREATE TABLE kv_data (
  namespace_id UUID REFERENCES kv_configs(id),
  key VARCHAR(512) NOT NULL,
  value TEXT NOT NULL,
  expires_at TIMESTAMPTZ,  -- NULL = never expires
  PRIMARY KEY (namespace_id, key)
);
```

## Runtime Implementation

### Message Flow

The V8 runtime communicates with the runner via channels:

```rust
pub enum SchedulerMessage {
    Fetch(CallbackId, FetchRequest),              // globalThis.fetch
    BindingFetch(CallbackId, String, FetchRequest), // Assets binding
    BindingStorage(CallbackId, String, StorageOp),  // Storage binding
    BindingKv(CallbackId, String, KvOp),            // KV binding
    // ...
}
```

### Operation Enums

```rust
pub enum StorageOp {
    Get { key: String },
    Put { key: String, body: Vec<u8> },
    Head { key: String },
    List { prefix: Option<String>, limit: Option<u32> },
    Delete { key: String },
}

pub enum KvOp {
    Get { key: String },
    Put { key: String, value: String, expires_in: Option<u64> },
    Delete { key: String },
    List { prefix: Option<String>, limit: Option<u32> },
}
```

### Native Binding Injection

Bindings are injected as native V8 functions:

```javascript
// Generated JS for KV binding
env.KV = (function () {
  const __bindingName = 'KV';
  return {
    get: function (key) {
      return new Promise((resolve, reject) => {
        __nativeBindingKv(__bindingName, 'get', { key }, (result) => {
          if (!result.success) reject(new Error(result.error));
          else resolve(result.value);
        });
      });
    },
    put: function (key, value, options) {
      return new Promise((resolve, reject) => {
        const params = { key, value };
        if (options?.expiresIn) params.expiresIn = options.expiresIn;
        __nativeBindingKv(__bindingName, 'put', params, (result) => {
          if (!result.success) reject(new Error(result.error));
          else resolve();
        });
      });
    }
    // delete, list...
  };
})();
```

The `__nativeBindingKv` function is a native V8 function that:

1. Extracts parameters from JS objects
2. Builds a `KvOp` enum variant
3. Sends a `SchedulerMessage` to the runner
4. Stores the callback for later execution

### Runner Handler

```rust
pub async fn handle_binding_kv(&self, binding: &str, op: KvOp) -> KvResult {
    // Look up namespace ID from binding config
    let namespace_id = self.bindings.get(binding)?.config_id;

    match op {
        KvOp::Get { key } => {
            let value = sqlx::query_scalar::<_, String>(
                r#"SELECT value FROM kv_data
                   WHERE namespace_id = $1 AND key = $2
                   AND (expires_at IS NULL OR expires_at > NOW())"#
            )
            .bind(&namespace_id)
            .bind(&key)
            .fetch_optional(&self.db_pool)
            .await?;

            KvResult::Value(value)
        }
        KvOp::Put { key, value, expires_in } => {
            // UPSERT with optional TTL
            // expires_in=None sets expires_at=NULL (removes expiration)
        }
        // ...
    }
}
```

## Security Model

### Credential Isolation

Workers cannot access credentials:

1. Binding configs (with credentials) are stored in the database
2. Runner loads configs when worker starts
3. Worker only knows binding names
4. Runner injects credentials when executing operations

### Multi-tenant Isolation

**Storage/Assets:** Prefix-scoped S3 tokens

```yaml
bucket: 'openworkers-shared'
prefix: 'tenant_abc123/'
token: <prefix-scoped-token>
```

Both AWS S3 and Cloudflare R2 support prefix-scoped tokens:

- **AWS S3:** IAM policies with `Resource: "arn:aws:s3:::bucket/prefix/*"`
- **Cloudflare R2:** API tokens with prefix restrictions

**KV:** Namespace isolation via foreign key (`namespace_id`).

## Implementation Notes

### V8 `uint32_value()` on undefined

When parsing optional JS parameters:

```rust
// ❌ Bug: undefined → Some(0) → LIMIT 0
let limit = params.get(scope, key).and_then(|v| v.uint32_value(scope));

// ✅ Fix: filter undefined/null first
let limit = params
    .get(scope, key)
    .filter(|v| !v.is_undefined() && !v.is_null())
    .and_then(|v| v.uint32_value(scope));
```

### serde_json::to_string adds quotes

```rust
let name = serde_json::to_string(&binding.name);  // → "KV" (with quotes)

// Correct usage in format string:
format!(r#"const __bindingName = {name};"#)  // → const __bindingName = "KV";
```

### IIFE for binding name capture

```javascript
// ❌ Bug: KV refers to object being defined
KV: {
    get: function() {
        __nativeBindingKv(KV, ...);  // KV is the object!
    }
}

// ✅ Fix: IIFE captures name as string constant
KV: (function() {
    const __bindingName = "KV";
    return { get: function() { __nativeBindingKv(__bindingName, ...); } };
})()
```

## Future Improvements

### Embedded KV (fjall)

Current KV uses PostgreSQL (~5ms latency). For better performance:

| Backend          | Latency | Notes                 |
| ---------------- | ------- | --------------------- |
| PostgreSQL       | ~5ms    | Current, durable      |
| fjall (embedded) | ~0.01ms | Pure Rust, native TTL |

Trade-off: Embedded storage is local to runner (no multi-runner sharing).

### KV TTL Cleanup

Expired keys are filtered on read but not deleted. A scheduled cleanup job is needed:

```sql
DELETE FROM kv_data WHERE expires_at IS NOT NULL AND expires_at < NOW();
```
