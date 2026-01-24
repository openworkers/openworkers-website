# React

Deploy React applications on OpenWorkers. For SPAs (Vite, Create React App), no adapter is needed - just serve static files.

## Quick Start (Vite + React)

### 1. Build your app

```bash
npm run build
```

This generates a `dist/` folder with static files.

### 2. Create a simple worker

Create `worker.js`:

```javascript
export default {
  async fetch(req, env) {
    return env.ASSETS.fetch(req);
  }
};
```

### 3. Deploy

```bash
zip -r deploy.zip worker.js dist/
ow workers deploy my-react-app deploy.zip
```

That's it! Your React SPA is now live.

## How It Works

```
Request → Worker → env.ASSETS.fetch() → S3/R2 → Response
                         ↓
              dist/index.html (SPA fallback)
```

The worker simply proxies all requests to the ASSETS binding, which serves your static files from storage.

## SPA Routing (Client-Side)

For client-side routing (React Router, etc.), you need to serve `index.html` for all routes:

```javascript
export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    // Try to fetch the exact file
    const response = await env.ASSETS.fetch(req);

    // If not found and not a file extension, serve index.html
    if (response.status === 404 && !url.pathname.includes('.')) {
      return env.ASSETS.fetch(new Request(`${url.origin}/index.html`, req));
    }

    return response;
  }
};
```

## Adding API Routes

You can add API routes directly in your worker:

```javascript
export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    // API routes
    if (url.pathname.startsWith('/api/')) {
      return handleApi(req, env, url);
    }

    // Static assets
    const response = await env.ASSETS.fetch(req);

    if (response.status === 404 && !url.pathname.includes('.')) {
      return env.ASSETS.fetch(new Request(`${url.origin}/index.html`, req));
    }

    return response;
  }
};

async function handleApi(req, env, url) {
  if (url.pathname === '/api/hello' && req.method === 'GET') {
    return Response.json({ message: 'Hello from OpenWorkers!' });
  }

  if (url.pathname === '/api/data' && req.method === 'POST') {
    const body = await req.json();
    // Process data...
    return Response.json({ received: body });
  }

  return Response.json({ error: 'Not Found' }, { status: 404 });
}
```

## Environment Variables

Access environment variables via `env`:

```javascript
async function handleApi(req, env, url) {
  const apiKey = env.API_KEY;
  const kv = env.KV;

  // Use KV storage
  const cached = await kv.get('my-key');
  // ...
}
```

## Project Structure

```
my-react-app/
├── src/
│   └── ...            # React source files
├── dist/              # Build output (static files)
│   ├── index.html
│   └── assets/
├── worker.js          # OpenWorkers entry point
└── package.json
```

## Deployment Script

Add to `package.json`:

```json
{
  "scripts": {
    "build": "vite build",
    "deploy": "npm run build && cd dist && zip -r ../deploy.zip . && cd .. && zip deploy.zip worker.js && ow workers deploy my-app deploy.zip"
  }
}
```

## TypeScript Worker

For TypeScript support, install types:

```bash
npm install -D @openworkers/workers-types typescript
```

Create `worker.ts`:

```typescript
/// <reference types="@openworkers/workers-types" />

interface Env {
  ASSETS: BindingAssets;
  KV: BindingKV;
  API_KEY: string;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname.startsWith('/api/')) {
      return handleApi(req, env, url);
    }

    const response = await env.ASSETS.fetch(req);

    if (response.status === 404 && !url.pathname.includes('.')) {
      return env.ASSETS.fetch(new Request(`${url.origin}/index.html`, req));
    }

    return response;
  }
};

async function handleApi(req: Request, env: Env, url: URL): Promise<Response> {
  // Your API logic here
  return Response.json({ message: 'Hello!' });
}
```

Bundle with esbuild before deploying:

```bash
npx esbuild worker.ts --bundle --format=esm --outfile=worker.js
```

## Next Steps

- [KV Storage](/docs/kv) - Add persistent key-value storage
- [Environment Variables](/docs/environments) - Configure secrets and variables
- [Custom Domains](/docs/domains) - Use your own domain
