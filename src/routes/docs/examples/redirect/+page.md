# Redirect Service

A simple URL shortener / redirect service. Define your redirects in code or use environment variables.

## Code

```typescript
addEventListener('fetch', (event: FetchEvent) => {
  event.respondWith(handleRequest(event.request));
});

// Define redirects
const redirects: Record<string, string> = {
  '/gh': 'https://github.com/openworkers',
  '/docs': 'https://openworkers.com/docs',
  '/dash': 'https://dash.openworkers.com'
};

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  // Check for redirect
  const destination = redirects[path];

  if (destination) {
    return Response.redirect(destination, 302);
  }

  // Home page - list all redirects
  if (path === '/') {
    const html = `
      <!DOCTYPE html>
      <html>
      <head><title>Redirects</title></head>
      <body>
        <h1>Available redirects</h1>
        <ul>
          ${Object.entries(redirects)
            .map(([key, value]) => `<li><a href="${key}">${key}</a> → ${value}</li>`)
            .join('')}
        </ul>
      </body>
      </html>
    `;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    });
  }

  return new Response('Not found', { status: 404 });
}
```

## With environment variables

Store redirects in environment variables for easy updates:

```typescript
addEventListener('fetch', (event: FetchEvent) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.slice(1); // Remove leading /

  if (!path) {
    return new Response('Usage: /shortcode', { status: 400 });
  }

  // Look up redirect in env
  // e.g., env.REDIRECT_gh = "https://github.com/openworkers"
  const envKey = `REDIRECT_${path}`;
  const destination = (env as any)[envKey];

  if (destination) {
    return Response.redirect(destination, 302);
  }

  return new Response(`Unknown shortcode: ${path}`, { status: 404 });
}
```

Then set environment variables:

- `REDIRECT_gh` = `https://github.com/openworkers`
- `REDIRECT_docs` = `https://openworkers.com/docs`

## Key concepts

- **Response.redirect()** - Create redirect responses (301, 302, 307, 308)
- **Environment variables** - Dynamic configuration without code changes
- **HTML responses** - Return HTML with proper Content-Type
