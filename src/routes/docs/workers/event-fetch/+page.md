# Handle HTTP requests

To handle HTTP requests, you need to define a fetch handler. OpenWorkers supports two syntax styles:

## ES Modules (recommended)

The modern, cleaner syntax. Your handler receives `request`, `env`, and `ctx` as arguments and returns a `Response` directly.

```typescript
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname === '/favicon.ico') {
      return new Response('Not found', { status: 404 });
    }

    // Access bindings via env
    const value = await env.KV.get('key');

    return new Response('<h3>Hello world!</h3>', {
      headers: { 'Content-Type': 'text/html' }
    });
  }
}
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `request` | `Request` | The incoming [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) object |
| `env` | `Env` | Object containing environment variables and bindings (KV, DB, etc.) |
| `ctx` | `ExecutionContext` | Execution context with `waitUntil()` |

---

## Service Worker (legacy)

The older syntax using `addEventListener`. Still supported for backwards compatibility.

```typescript
addEventListener('fetch', (event: FetchEvent) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request: Request): Promise<Response> {
  const { pathname } = new URL(request.url);

  if (pathname === '/favicon.ico') {
    return new Response('Not found', { status: 404 });
  }

  return new Response('<h3>Hello world!</h3>', {
    headers: { 'Content-Type': 'text/html' }
  });
}
```

### FetchEvent interface

```typescript
interface FetchEvent {
  request: Request;
  respondWith(response: Response | Promise<Response>): void;
}
```

With Service Worker syntax, access bindings via `globalThis.env`:

```typescript
const value = await globalThis.env.KV.get('key');
```

---

## Which style should I use?

**Use ES Modules** for new projects:
- Cleaner syntax (direct return, no `respondWith`)
- `env` passed as parameter (better TypeScript support)
- Consistent with Cloudflare Workers

**Use Service Worker** if:
- Migrating existing code that uses `addEventListener`
- You prefer the event-based pattern

Both styles work identically. If both are defined, ES Modules takes priority.
