# CORS Proxy

Proxy requests to APIs that don't support CORS, adding the necessary headers for browser access.

## Code

```typescript
addEventListener('fetch', (event: FetchEvent) => {
  event.respondWith(handleRequest(event.request));
});

const ALLOWED_ORIGINS = ['https://myapp.com', 'http://localhost:3000'];

async function handleRequest(request: Request): Promise<Response> {
  const origin = request.headers.get('Origin') || '';

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return handlePreflight(origin);
  }

  // Get target URL from query param
  const url = new URL(request.url);
  const target = url.searchParams.get('url');

  if (!target) {
    return new Response('Missing ?url= parameter', { status: 400 });
  }

  // Validate target URL
  try {
    new URL(target);
  } catch {
    return new Response('Invalid URL', { status: 400 });
  }

  // Proxy the request
  const response = await fetch(target, {
    method: request.method,
    headers: request.headers,
    body: request.method !== 'GET' ? request.body : undefined
  });

  // Add CORS headers to response
  const corsHeaders = getCorsHeaders(origin);

  return new Response(response.body, {
    status: response.status,
    headers: {
      ...Object.fromEntries(response.headers),
      ...corsHeaders
    }
  });
}

function handlePreflight(origin: string): Response {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(origin)
  });
}

function getCorsHeaders(origin: string): Record<string, string> {
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  };
}
```

## Usage

From your frontend JavaScript:

```javascript
const apiUrl = 'https://api.example.com/data';
const proxyUrl = `https://your-worker.workers.rocks/?url=${encodeURIComponent(apiUrl)}`;

const response = await fetch(proxyUrl);
const data = await response.json();
```

## Open proxy (use with caution)

For development or public APIs, you can allow all origins:

```typescript
function getCorsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': '*'
  };
}
```

## Key concepts

- **CORS headers** - `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, etc.
- **Preflight requests** - Handle `OPTIONS` method for complex requests
- **Origin validation** - Whitelist allowed origins for security
- **Request proxying** - Forward method, headers, and body to target
