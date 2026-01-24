# CLI Reference

The OpenWorkers CLI (`ow`) lets you manage workers, environments, and bindings from the terminal.

## Installation

```bash
# Install with cargo
cargo install openworkers-cli

# Verify installation
ow --version
```

## Configuration

### Aliases

The CLI uses aliases to connect to different backends (API or direct database).

```bash
# Add API alias (default)
ow alias set prod --api https://dash.openworkers.com/api/v1

# Add database alias (for self-hosted)
ow alias set local --db postgres://user:pass@localhost/openworkers --user max

# List aliases
ow alias list

# Set default alias
ow alias set-default prod

# Remove alias
ow alias rm old-alias
```

### Using Aliases

Prefix any command with an alias name:

```bash
# Use specific alias
ow local workers list
ow prod workers list

# Use default alias (no prefix)
ow workers list
```

## Authentication

```bash
# Login to API (opens browser)
ow login

# The token is stored in ~/.openworkers/config.json
```

---

## Workers

### List Workers

```bash
ow workers list
# or
ow workers ls
```

### Get Worker Details

```bash
ow workers get <name>
```

### Create Worker

```bash
ow workers create <name> [--description "My worker"] [--language typescript]
```

### Delete Worker

```bash
ow workers delete <name>
# or
ow workers rm <name>
```

### Deploy Code

Deploy a single file:

```bash
ow workers deploy <name> <file.ts>
ow workers deploy my-api worker.ts --message "Add new endpoint"
```

### Upload Package

Upload a folder or zip with worker script and assets:

```bash
# Upload folder (must contain worker.js/worker.ts and assets/ folder)
ow workers upload <name> ./dist

# Upload zip file
ow workers upload <name> ./package.zip
```

**Folder structure:**

```
dist/
├── worker.js      # Main worker script (required)
└── assets/        # Static assets (optional)
    ├── index.html
    ├── style.css
    └── ...
```

### Link Environment

```bash
ow workers link <worker-name> <environment-name>
```

---

## Environments

Environments contain variables, secrets, and resource bindings.

### List Environments

```bash
ow env list
# or
ow env ls
```

### Get Environment Details

```bash
ow env get <name>
```

### Create Environment

```bash
ow env create <name> [--description "Production env"]
```

### Delete Environment

```bash
ow env delete <name>
# or
ow env rm <name>
```

### Set Variable

```bash
ow env set <env-name> <KEY> <value>

# Example
ow env set production API_URL https://api.example.com
```

### Set Secret

```bash
ow env set <env-name> <KEY> <value> --secret

# Example
ow env set production API_KEY sk_live_xxx --secret
```

### Remove Variable

```bash
ow env unset <env-name> <KEY>
```

### Bind Resources

Bind KV, Storage, or Database to an environment:

```bash
# Bind KV namespace
ow env bind <env-name> <BINDING_NAME> <resource-name> --type kv

# Bind Storage (for assets)
ow env bind <env-name> ASSETS my-storage --type assets

# Bind Storage (general)
ow env bind <env-name> BUCKET my-storage --type storage

# Bind Database
ow env bind <env-name> DB my-database --type database
```

---

## Storage

Manage S3/R2 storage configurations.

### List Storage Configs

```bash
ow storage list
# or
ow storage ls
```

### Get Storage Details

```bash
ow storage get <name>
```

### Create Storage

```bash
ow storage create <name> \
  --bucket my-bucket \
  --endpoint https://xxx.r2.cloudflarestorage.com \
  --access-key-id AKIAIOSFODNN7EXAMPLE \
  --secret-access-key wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY \
  [--region auto] \
  [--prefix optional/prefix]
```

### Delete Storage

```bash
ow storage delete <name>
# or
ow storage rm <name>
```

---

## KV Namespaces

### List KV Namespaces

```bash
ow kv list
# or
ow kv ls
```

### Get KV Details

```bash
ow kv get <name>
```

### Create KV Namespace

```bash
ow kv create <name> [--description "Cache namespace"]
```

### Delete KV Namespace

```bash
ow kv delete <name>
# or
ow kv rm <name>
```

---

## Databases

### List Databases

```bash
ow databases list
# or
ow databases ls
```

### Get Database Details

```bash
ow databases get <name>
```

### Create Database

```bash
ow databases create <name> [--description "Main database"]
```

### Delete Database

```bash
ow databases delete <name>
# or
ow databases rm <name>
```

---

## Database Operations (Self-Hosted)

For direct database access (self-hosted setups):

### Run Migrations

```bash
ow db migrate
```

### Seed Data

```bash
ow db seed
```

---

## Platform Storage Setup

Configure platform-wide storage for asset uploads (self-hosted):

```bash
ow setup-storage \
  --endpoint https://xxx.r2.cloudflarestorage.com \
  --bucket platform-assets \
  --access-key-id AKIAIOSFODNN7EXAMPLE \
  --secret-access-key wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY \
  [--region auto] \
  [--prefix workers]
```

---

## Examples

### Full Workflow

```bash
# 1. Create worker
ow workers create my-api --description "REST API"

# 2. Create environment
ow env create my-api-env

# 3. Add configuration
ow env set my-api-env DATABASE_URL postgres://... --secret
ow env set my-api-env LOG_LEVEL debug

# 4. Create and bind KV
ow kv create my-cache
ow env bind my-api-env CACHE my-cache --type kv

# 5. Link environment to worker
ow workers link my-api --env my-api-env

# 6. Deploy
ow workers deploy my-api ./worker.ts
```

### Framework Deployment (SvelteKit)

```bash
# Build your SvelteKit app
bun run build

# Upload the dist folder
ow workers upload my-app ./dist
```

---

## Config File

Configuration is stored in `~/.openworkers/config.json`:

```json
{
  "version": 1,
  "default": "prod",
  "aliases": {
    "prod": {
      "type": "api",
      "url": "https://dash.openworkers.com/api/v1",
      "token": "your-token"
    },
    "local": {
      "type": "db",
      "database_url": "postgres://...",
      "user": "max",
      "storage": {
        "endpoint": "https://...",
        "bucket": "...",
        "access_key_id": "...",
        "secret_access_key": "..."
      }
    }
  }
}
```
