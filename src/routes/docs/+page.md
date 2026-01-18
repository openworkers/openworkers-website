# OpenWorkers

Serverless JavaScript runtime. Self-hosted, open source, Cloudflare Workers compatible.

## Quick Example

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const data = await env.KV.get('config');
    return Response.json({ data });
  }
};
```

## What You Get

- **V8 Isolates** — Millisecond cold starts, memory-safe sandboxing
- **Standard APIs** — Fetch, Streams, Crypto, Web APIs you already know
- **Bindings** — Connect to databases, storage, KV without exposing credentials
- **TypeScript** — First-class support, no build step required

## Next Steps

| | |
|---|---|
| [Quick Start](/docs/quickstart) | Deploy your first worker in 5 minutes |
| [Workers](/docs/workers/event-fetch) | HTTP handlers and scheduled tasks |
| [Bindings](/docs/bindings) | Storage, KV, Database connections |
| [Runtime APIs](/docs/runtime) | Full API reference |
| [Self-Hosting](/docs/self-hosting) | Run on your own infrastructure |
