# SvelteKit

Deploy SvelteKit applications with full SSR support on OpenWorkers.

## Quick Start

### 1. Install the adapter

```bash
npm install @openworkers/adapter-sveltekit
```

### 2. Configure SvelteKit

Update your `svelte.config.js`:

```javascript
import adapter from '@openworkers/adapter-sveltekit';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter(),
    // Optional: inline CSS to avoid flash of unstyled content
    inlineStyleThreshold: 5120
  }
};

export default config;
```

### 3. Build

```bash
npm run build
```

This generates a `dist/` folder with:

```
dist/
├── worker.js      # Bundled worker (SSR + routing)
├── routes.js      # Routing hints for edge optimization
└── assets/        # Static files (_app/, images, etc.)
```

### 4. Deploy

Create a ZIP and upload via the API or CLI:

```bash
cd dist
zip -r ../deploy.zip worker.js routes.js assets/
ow deploy ../deploy.zip
```

## How It Works

The adapter bundles your SvelteKit app into a single `worker.js` file that:

1. **Serves static assets** via `env.ASSETS.fetch()` for files in `/_app/` and `/static/`
2. **Handles SSR** for dynamic routes using SvelteKit's `Server` class
3. **Prerenders pages** that are marked for prerendering at build time

```
Request → Worker
            ├── Static asset? → env.ASSETS.fetch() → S3/R2
            └── Dynamic route? → SvelteKit SSR → Response
```

## Adapter Options

```javascript
adapter({
  // Output directory (default: 'dist')
  out: 'build',

  // Generate separate mini-workers for each API route (default: false)
  functions: true
})
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `out` | `string` | `'dist'` | Output directory for the build |
| `functions` | `boolean` | `false` | Generate separate mini-workers for each API route |

### Functions Mode

When `functions: true`, the adapter generates a separate mini-worker for each `+server.ts` endpoint:

```
dist/
├── worker.js           # Main SSR worker
├── routes.js
├── assets/
└── functions/          # Mini-workers for API routes
    ├── api-hello.js
    └── api-users.js
```

The route mappings are included in `routes.js`:

```javascript
{
  "functions": [
    { "pattern": "/api/hello", "worker": "functions/api-hello.js" },
    { "pattern": "/api/users", "worker": "functions/api-users.js" }
  ]
}
```

This prepares for native project routing where each function can be deployed as a separate worker for better isolation and scaling.

## TypeScript Setup

For proper types on `platform.env`, install the types package:

```bash
npm install -D @openworkers/workers-types
```

Then update `src/app.d.ts`:

```typescript
/// <reference types="@openworkers/workers-types" />

declare global {
  namespace App {
    interface Platform {
      env: {
        KV: BindingKV;
        ASSETS: BindingAssets;
        // Add your other bindings here
      };
    }
  }
}

export {};
```

Now you get full autocompletion on `platform.env.KV`, `platform.env.ASSETS`, etc.

## Environment Variables

Access environment variables in your SvelteKit app via `platform.env`:

```typescript
// +page.server.ts
export async function load({ platform }) {
  const apiKey = platform?.env?.API_KEY;
  // ...
}
```

Configure variables in your OpenWorkers environment:

```bash
ow env set API_KEY=your-secret-key --secret
```

## Static Assets

Files in your `static/` folder are automatically uploaded to storage and served via `env.ASSETS`.

The adapter generates a `routes.js` file that hints which paths are static:

```javascript
// routes.js (generated)
export default {
  immutable: ["/_app/immutable/*"],  // Cache forever (hashed)
  static: ["/robots.txt", "/favicon.ico"],
  prerendered: ["/about", "/contact"],
  ssr: ["/*"]  // Everything else
};
```

## Example: World Time App

A complete SvelteKit app with SSR:

**src/routes/+page.server.ts**

```typescript
export async function load() {
  return {
    serverTime: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };
}
```

**src/routes/+page.svelte**

```svelte
<script>
  let { data } = $props();
</script>

<h1>Server Time</h1>
<p>Rendered at: {data.serverTime}</p>
<p>Timezone: {data.timezone}</p>
```

## Deploying via API

Complete setup for a new SvelteKit worker with storage for assets.

### 1. Create the worker

```bash
curl -X POST "https://dash.openworkers.com/api/v1/workers" \
  -H "Authorization: Bearer $OW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "my-sveltekit-app", "language": "javascript"}'
```

Response:
```json
{"id": "80ebe043-...", "name": "my-sveltekit-app", ...}
```

### 2. Create an environment

```bash
curl -X POST "https://dash.openworkers.com/api/v1/environments" \
  -H "Authorization: Bearer $OW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "my-sveltekit-env"}'
```

Response:
```json
{"id": "11a18b61-...", "name": "my-sveltekit-env", "values": []}
```

### 3. Create a storage config

Using the platform provider (shared R2 storage):

```bash
curl -X POST "https://dash.openworkers.com/api/v1/storage" \
  -H "Authorization: Bearer $OW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "my-sveltekit-storage", "provider": "platform"}'
```

Response:
```json
{"id": "31781b10-...", "provider": "platform", "publicUrl": "https://r2.openworkers.com"}
```

### 4. Link environment to worker

```bash
curl -X PATCH "https://dash.openworkers.com/api/v1/workers/{worker_id}" \
  -H "Authorization: Bearer $OW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"environment": "{environment_id}"}'
```

### 5. Add ASSETS binding to environment

This links the storage to the worker as `env.ASSETS`:

```bash
curl -X PATCH "https://dash.openworkers.com/api/v1/environments/{environment_id}" \
  -H "Authorization: Bearer $OW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"values": [{"key": "ASSETS", "value": "{storage_id}", "type": "assets"}]}'
```

### 6. Deploy the worker

Build your app, create a ZIP, and upload:

```bash
# Build
npm run build

# Create ZIP
cd dist && zip -r ../deploy.zip worker.js routes.js assets/

# Upload
curl -X POST "https://dash.openworkers.com/api/v1/workers/{worker_id}/upload" \
  -H "Authorization: Bearer $OW_API_KEY" \
  -F "file=@deploy.zip"
```

Response:
```json
{"success": true, "worker": {"url": "https://my-sveltekit-app.workers.rocks"}, "uploaded": {"script": true, "assets": 23}}
```

## Troubleshooting

### Assets not loading

Make sure your worker has a storage binding named `ASSETS`:

1. Create a storage config in the dashboard
2. Add an `ASSETS` binding to your environment with type "assets"
3. Link the environment to your worker

### SSR errors

Check the worker logs in the dashboard. Common issues:

- Missing environment variables
- Unsupported Node.js APIs (use edge-compatible alternatives)
- Memory limits exceeded (optimize your bundle size)
