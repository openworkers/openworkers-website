<script>
  import Tabs from '$lib/components/Tabs.svelte';
</script>

# Frameworks

Deploy web frameworks on OpenWorkers.

## Supported Frameworks

| Framework                               | Adapter                          |
| --------------------------------------- | -------------------------------- |
| [SvelteKit](/docs/frameworks/sveltekit) | `@openworkers/adapter-sveltekit` |
| [Static Sites](/docs/frameworks/static) | `@openworkers/adapter-static`    |

## Static Sites

Any static site generator output can be deployed using [`@openworkers/adapter-static`](/docs/frameworks/static):

- Vite (React, Vue, Svelte)
- Astro
- Hugo
- Jekyll
- Plain HTML/CSS/JS

## Deploying

<Tabs tabs={['CLI', 'API']}>
{#snippet children(active)}
{#if active === 0}
<div>

**Quick deploy** (existing worker with ASSETS binding):

```bash
ow workers upload my-site ./dist
```

**Full setup from scratch:**

```bash
# 1. Create storage for assets
ow storage create my-site-assets --provider platform

# 2. Create environment
ow env create my-site-env

# 3. Bind storage to environment as ASSETS
ow env bind my-site-env ASSETS my-site-assets -t assets

# 4. Create worker
ow workers create my-site

# 5. Link environment to worker
ow workers link my-site my-site-env

# 6. Upload
ow workers upload my-site ./dist
```

      </div>
    {:else}
      <div>

**Full setup from scratch:**

```bash
# 1. Create storage
curl -X POST https://dash.openworkers.com/api/v1/storage \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "my-site-assets", "provider": "platform"}'

# 2. Create environment
curl -X POST https://dash.openworkers.com/api/v1/environments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "my-site-env"}'

# 3. Bind storage to environment as ASSETS
curl -X PATCH https://dash.openworkers.com/api/v1/environments/<env-id> \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"values": [{"key": "ASSETS", "value": "<storage-id>", "valueType": "assets"}]}'

# 4. Create worker
curl -X POST https://dash.openworkers.com/api/v1/workers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "my-site"}'

# 5. Link environment to worker
curl -X PATCH https://dash.openworkers.com/api/v1/workers/<worker-id> \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"environment": "<env-id>"}'

# 6. Upload (zip with worker.js + assets/)
curl -X POST https://dash.openworkers.com/api/v1/workers/<worker-id>/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@dist.zip"
```

      </div>
    {/if}

{/snippet}
</Tabs>

Your site is now live at `https://my-site.workers.rocks`
