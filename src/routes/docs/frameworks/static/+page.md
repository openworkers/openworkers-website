# Static Sites

Deploy any static site on OpenWorkers using `@openworkers/adapter-static`.

Works with output from any static site generator: Vite, Astro, Hugo, Jekyll, or plain HTML/CSS/JS.

## Quick Start

### 1. Build your site

Run your static site generator's build command:

```bash
# Vite
npm run build

# Astro
astro build

# Hugo
hugo

# Or just have HTML files ready
```

### 2. Generate OpenWorkers bundle

```bash
npx @openworkers/adapter-static ./dist -o ./dist-ow
```

This generates:

```
dist-ow/
├── worker.js      # Worker that serves static files
├── routes.js      # Routing manifest
└── assets/        # Your static files
```

### 4. Deploy

```bash
ow workers upload my-site ./dist-ow
```

## Full Setup (New Worker)

If you don't have a worker yet, create the full setup:

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

# 6. Build and upload
npx @openworkers/adapter-static ./dist -o ./dist-ow
ow workers upload my-site ./dist-ow
```

Your site is now live at `https://my-site.workers.rocks`

## CLI Options

```bash
npx @openworkers/adapter-static [input] [options]
```

| Option    | Flag             | Default            | Description                                |
| --------- | ---------------- | ------------------ | ------------------------------------------ |
| Input     | positional       | auto-detect        | Input directory (dist, build, out, public) |
| Output    | `-o, --out`      | `dist-openworkers` | Output directory                           |
| Mode      | `-m, --mode`     | auto-detect        | `directory` or `flat`                      |
| Fallback  | `-f, --fallback` | none               | SPA fallback file                          |
| Immutable | `--immutable`    | auto-detect        | Comma-separated patterns                   |

### Examples

```bash
# Auto-detect input folder
npx @openworkers/adapter-static

# Specify input and output
npx @openworkers/adapter-static ./build -o ./dist

# SPA mode (fallback to index.html)
npx @openworkers/adapter-static --fallback /index.html

# Force routing mode
npx @openworkers/adapter-static --mode flat
```

## Routing Modes

The adapter auto-detects the routing mode based on your file structure.

### Directory Mode

Used by most static generators (Hugo, Jekyll, etc.):

```
/about      →  /about/index.html
/docs/intro →  /docs/intro/index.html
```

### Flat Mode

Used by SvelteKit static export and some others:

```
/about      →  /about.html
/docs/intro →  /docs/intro.html
```

## SPA Mode

For single-page applications, use the `--fallback` option:

```bash
npx @openworkers/adapter-static --fallback /index.html
```

This serves `/index.html` for all routes that don't match a file, letting your client-side router handle navigation.

## Immutable Assets

Assets with hashed filenames are automatically detected and served with long cache headers (`max-age=31536000, immutable`).

Auto-detected patterns:

| Framework | Pattern             |
| --------- | ------------------- |
| SvelteKit | `/_app/immutable/*` |
| Vite      | `/assets/*`         |
| Next.js   | `/_next/static/*`   |
| Astro     | `/_astro/*`         |

You can override with `--immutable`:

```bash
npx @openworkers/adapter-static --immutable "/static/js/*,/static/css/*"
```

## Programmatic API

Use the adapter in your build scripts:

```javascript
import { adapt } from '@openworkers/adapter-static';

await adapt({
  input: 'dist',
  out: 'dist-openworkers',
  mode: 'flat',
  fallback: '/index.html'
});
```

## How It Works

The generated `worker.js`:

1. Receives HTTP requests
2. Tries to serve the exact file path via `env.ASSETS.fetch()`
3. Falls back to routing rules (directory or flat mode)
4. Serves SPA fallback if configured
5. Returns 404.html or "Not Found"

```
Request → Worker
            ├── /style.css     → env.ASSETS.fetch('/style.css')
            ├── /about         → env.ASSETS.fetch('/about.html')  (flat mode)
            ├── /about         → env.ASSETS.fetch('/about/index.html')  (directory mode)
            └── /unknown       → env.ASSETS.fetch('/index.html')  (SPA fallback)
```

## Cache Headers

The worker automatically sets appropriate cache headers:

| File Type        | Cache-Control                         |
| ---------------- | ------------------------------------- |
| Immutable assets | `public, max-age=31536000, immutable` |
| HTML files       | `no-cache`                            |
| Other files      | `public, max-age=3600`                |

## Example: Vite React App

```bash
# Create and build
npm create vite@latest my-app -- --template react
cd my-app
npm install
npm run build

# Deploy to OpenWorkers
npx @openworkers/adapter-static ./dist -o ./dist-ow --fallback /index.html
ow workers upload my-app ./dist-ow
```

## Example: Astro Site

```bash
# Create and build
npm create astro@latest my-blog
cd my-blog
npm run build

# Deploy to OpenWorkers
npx @openworkers/adapter-static ./dist -o ./dist-ow
ow workers upload my-blog ./dist-ow
```
