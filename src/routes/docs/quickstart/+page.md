<script>
  import Tabs from '$lib/components/Tabs.svelte';
</script>

# Quick Start

Deploy your first worker in 5 minutes using the **Dashboard** or the **CLI**.

<Tabs tabs={['Dashboard', 'CLI', 'API']}>
  {#snippet children(active)}
    {#if active === 0}
      <div>

## 1. Create Account

Sign in at [openworkers.com](https://openworkers.com) with your GitHub account.

## 2. Create Worker

Click **New Worker**, enter a name. Your worker will be available at:

```
https://<name>.workers.rocks
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

      </div>
    {:else if active === 1}
      <div>

## 1. Install CLI

```bash
# Install with cargo
cargo install openworkers-cli

# Or download from releases
# https://github.com/openworkers/cli/releases
```

## 2. Login

```bash
ow login
# Opens browser for GitHub authentication
```

## 3. Create Worker

```bash
ow workers create hello-world
```

Your worker will be available at `https://hello-world.workers.rocks`

## 4. Deploy Code

Create a file `worker.ts`:

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

Deploy:

```bash
ow workers deploy hello-world worker.ts
```

      </div>
    {:else}
      <div>

## 1. Get API Token

Sign in at [openworkers.com](https://openworkers.com) and get your API token from **Settings**.

## 2. Create Worker

```bash
curl -X POST https://dash.openworkers.com/api/v1/workers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "hello-world", "language": "typescript"}'
```

## 3. Deploy Code

```bash
curl -X POST https://dash.openworkers.com/api/v1/workers/hello-world/deploy \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "export default { async fetch(request, env) { return Response.json({ message: \"Hello, World!\" }); } }",
    "codeType": "typescript"
  }'
```

Your worker is live at `https://hello-world.workers.rocks`

      </div>
    {/if}
  {/snippet}
</Tabs>

## Test It

```bash
curl https://<name>.workers.rocks/api/hello
# {"message":"Hello, World!"}
```

## Next Steps

- [Add a KV binding](/docs/bindings/kv) for persistent storage
- [Add a database](/docs/bindings/database) for SQL queries
- [Handle scheduled tasks](/docs/workers/scheduled-tasks) for cron jobs
- [CLI Reference](/docs/cli) for all commands
- [Self-host](/docs/self-hosting) on your own infrastructure
