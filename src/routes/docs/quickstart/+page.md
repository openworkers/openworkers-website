# Quick Start

Deploy your first worker in 5 minutes.

## 1. Create Account

Sign in at [openworkers.com](https://openworkers.com) with your GitHub account.

## 2. Create Worker

Click **New Worker**, enter a name. Your worker will be available at:

```
https://<name>.openworkers.com
```

## 3. Write Code

Replace the default code with:

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname === '/api/hello') {
      return Response.json({ message: 'Hello, World!' });
    }

    return new Response('Not Found', { status: 404 });
  }
};
```

## 4. Deploy

Click **Save**. Your worker is live.

Test it:

```bash
curl https://<name>.openworkers.com/api/hello
# {"message":"Hello, World!"}
```

## Next Steps

- [Add a KV binding](/docs/bindings/kv) for persistent storage
- [Add a database](/docs/bindings/database) for SQL queries
- [Handle scheduled tasks](/docs/workers/scheduled-tasks) for cron jobs
- [Self-host](/docs/self-hosting) on your own infrastructure
