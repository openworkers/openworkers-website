# Hello World

The simplest possible worker.

## Basic Response

```typescript
export default {
  async fetch(request: Request): Promise<Response> {
    return new Response('Hello, World!');
  }
};
```

## With HTML

```typescript
export default {
  async fetch(request: Request): Promise<Response> {
    const html = `<!DOCTYPE html>
<html>
  <head><title>Hello</title></head>
  <body><h1>Hello, World!</h1></body>
</html>`;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
};
```

## With Routing

```typescript
export default {
  async fetch(request: Request): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname === '/') {
      return new Response('Home');
    }

    if (pathname === '/about') {
      return new Response('About');
    }

    return new Response('Not Found', { status: 404 });
  }
};
```

## With Request Info

```typescript
export default {
  async fetch(request: Request): Promise<Response> {
    const { pathname, searchParams } = new URL(request.url);
    const name = searchParams.get('name') || 'World';

    return Response.json({
      message: `Hello, ${name}!`,
      method: request.method,
      path: pathname,
      headers: Object.fromEntries(request.headers)
    });
  }
};
```

Test with:

```bash
curl "https://your-worker.openworkers.com/?name=Alice"
```
