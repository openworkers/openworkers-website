<script lang="ts">
  import Console from '$lib/components/Console.svelte';
  import Showcase from '$lib/components/Showcase.svelte';

  const loginUrl = 'https://dash.openworkers.com/sign-in';

  let { data } = $props();

  let email = $state('');
  let status = $state<'idle' | 'loading' | 'success' | 'error'>('idle');
  let heroLang = $state<'ts' | 'rust'>('ts');

  const stats = [
    { value: '0.08 ms', label: 'warm request, server-side render included' },
    { value: '2.3 ms', label: 'cold start, from cached code to first response' },
    { value: 'Rust + Postgres', label: 'the whole self-hosted stack: one runner, one database' },
    { value: 'MIT', label: 'licensed, end to end - runtime, API and dashboard' }
  ];

  const features = [
    {
      title: 'The Workers model',
      body: 'Fetch handlers, Request and Response, waitUntil - the API you already know from Cloudflare Workers, running on infrastructure you control.'
    },
    {
      title: 'Bindings built in',
      body: 'Key-value store, SQL database and object storage, declared per worker. Credentials stay on the host and never enter the sandbox.'
    },
    {
      title: 'WebAssembly workers',
      body: 'Write workers in Rust with a workers-rs-compatible SDK, in Go with TinyGo, or ship any standard wasi:http component.'
    },
    {
      title: 'Scheduled events',
      body: 'Cron expressions trigger scheduled handlers with the same runtime, limits and bindings as HTTP workers.'
    },
    {
      title: 'Web-standard runtime',
      body: 'fetch, streams, WebCrypto, URL, TextEncoder - tracked against a WinterTC-based conformance suite. WebSockets are in beta.'
    },
    {
      title: 'Self-hostable',
      body: 'A Rust runner plus PostgreSQL is a complete platform. The dashboard, the API and this very website run as workers on it.'
    }
  ];

  const showcases = [
    {
      title: 'time.workers.rocks',
      description: 'Application with SSR-rendered clocks. Clock hands are positioned at load time.',
      url: 'https://time.workers.rocks',
      screenshot: 'https://cdn.optimage.cloud/jSskR2oYmZSZ/512/time.webp',
      source: 'https://github.com/max-lt/world-time-app'
    },
    {
      title: 'httpbin.workers.rocks',
      description: 'A replica of the famous httpbin tool for testing HTTP requests.',
      url: 'https://httpbin.workers.rocks',
      screenshot: 'https://cdn.optimage.cloud/jSskR2oYmZSZ/512/httpbin.webp',
      source: 'https://github.com/max-lt/httpbin'
    },
    {
      title: 'qr-code.workers.rocks',
      description: 'Embedded QR code generator.',
      url: 'https://qr-code.workers.rocks/qr?content=https://qr-code.workers.rocks/',
      screenshot: 'https://cdn.optimage.cloud/jSskR2oYmZSZ/qr-code.svg'
    },
    {
      title: 'sveltekit.workers.rocks',
      description: 'SvelteKit app demo with server-side rendering.',
      url: 'https://sveltekit.workers.rocks/demo',
      screenshot: 'https://cdn.optimage.cloud/jSskR2oYmZSZ/512/sveltekit.webp'
    },
    {
      title: 'rock-paper-scissors.workers.rocks',
      description: 'Provably fair Rock Paper Scissors game',
      url: 'https://rock-paper-scissors.workers.rocks',
      screenshot: 'https://cdn.optimage.cloud/jSskR2oYmZSZ/512/rock-paper-scissors.webp',
      source: 'https://github.com/max-lt/rock-paper-scissors'
    },
    {
      title: 'ip-info.workers.rocks',
      description: 'Simple IP information lookup tool.',
      url: 'https://ip-info.workers.rocks',
      screenshot: 'https://cdn.optimage.cloud/jSskR2oYmZSZ/512/ip-info.webp'
    }
  ];

  async function subscribe(e: SubmitEvent) {
    e.preventDefault();
    status = 'loading';

    try {
      const res = await fetch('https://newsletter.workers.rocks/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      status = res.ok ? 'success' : 'error';
    } catch {
      status = 'error';
    }
  }
</script>

<svelte:head>
  <title>OpenWorkers - The open-source workers platform</title>
  <meta
    name="description"
    content="Run JavaScript, TypeScript and WebAssembly workers on your own infrastructure. Cloudflare Workers-compatible, built in Rust, with KV, SQL, storage and cron built in."
  />
  <meta property="og:title" content="OpenWorkers - The open-source workers platform" />
  <meta
    property="og:description"
    content="Run JavaScript, TypeScript and WebAssembly workers on your own infrastructure. Cloudflare Workers-compatible, built in Rust."
  />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://openworkers.com/" />
</svelte:head>

<main>
  <!-- Hero -->
  <div class="container mt-16 max-w-7xl flex-col sm:mt-24">
    <div class="flex w-full flex-col items-center justify-between gap-12 px-4 sm:px-8 xl:flex-row">
      <div class="max-w-xl xl:flex-1">
        <div
          class="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent-soft px-3 py-1 text-sm font-medium text-accent"
        >
          <span class="h-1.5 w-1.5 rounded-full bg-accent"></span>
          Open source, now in public beta
        </div>

        <h1 class="title mb-5 text-4xl font-bold tracking-tight sm:text-5xl">
          Run workers on <span class="text-gradient">your own</span> infrastructure
        </h1>

        <p class="mb-8 text-lg leading-8 text-muted">
          OpenWorkers is an open-source serverless platform built in Rust: JavaScript and TypeScript in V8 isolates,
          Rust as native WebAssembly components, with the Cloudflare Workers programming model - fetch handlers, KV,
          SQL, storage and cron.
        </p>

        <div class="flex flex-wrap gap-4">
          <a href={loginUrl} target="_blank" class="btn btn-blue rounded-md px-6 py-3 text-base">Get started</a>
          <a href="/docs" class="btn btn-ghost rounded-md px-6 py-3 text-base">Read the docs</a>
          <a href="/docs/self-hosting" class="btn rounded-md px-3 py-3 text-base text-muted hover:text-fg">
            Self-host &rarr;
          </a>
        </div>
      </div>

      <div class="w-full max-w-xl xl:flex-1">
        <div class="mb-3 flex gap-1 rounded-lg border bg-surface p-1 text-sm font-medium" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={heroLang === 'ts'}
            class="flex-1 rounded-md px-3 py-1.5 transition-colors {heroLang === 'ts'
              ? 'bg-bg text-fg shadow-sm'
              : 'text-muted hover:text-fg'}"
            onclick={() => (heroLang = 'ts')}
          >
            TypeScript
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={heroLang === 'rust'}
            class="flex-1 rounded-md px-3 py-1.5 transition-colors {heroLang === 'rust'
              ? 'bg-bg text-fg shadow-sm'
              : 'text-muted hover:text-fg'}"
            onclick={() => (heroLang = 'rust')}
          >
            Rust
          </button>
        </div>

        <Console
          title={heroLang === 'ts' ? 'hello.ts' : 'lib.rs'}
          content={heroLang === 'ts' ? data.codeHtml : data.rustHtml}
        >
          {#snippet footer()}
            <div class="flex items-center justify-between px-6 py-3">
              <span class="text-xs text-faint">
                {heroLang === 'ts' ? 'TypeScript supported out of the box' : 'workers-rs-compatible SDK'}
              </span>
              <a
                href={heroLang === 'ts' ? '/docs/examples/json-api' : '/docs/workers/event-fetch'}
                class="text-xs font-medium text-accent transition-colors hover:text-accent-hover"
              >
                View more examples
              </a>
            </div>
          {/snippet}
        </Console>
      </div>
    </div>
  </div>

  <!-- Stats -->
  <div class="container my-20 max-w-7xl sm:my-28">
    <div class="grid w-full grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border lg:grid-cols-4">
      {#each stats as stat}
        <div class="flex flex-col gap-2 bg-bg p-6 sm:p-8">
          <span class="font-mono text-2xl font-semibold tracking-tight sm:text-3xl">{stat.value}</span>
          <span class="text-sm leading-6 text-muted">{stat.label}</span>
        </div>
      {/each}
    </div>
  </div>

  <!-- Features -->
  <div class="container my-20 max-w-7xl sm:my-28">
    <div class="w-full px-4 sm:px-8">
      <h2 class="title mb-4 text-center text-3xl font-bold tracking-tight">Everything a workers platform needs</h2>
      <p class="mx-auto mb-12 max-w-2xl text-center text-muted">
        The runtime, the bindings and the scheduling are part of the platform, not an integration exercise.
      </p>

      <div class="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {#each features as feature}
          <div class="rounded-xl border bg-surface p-6">
            <h3 class="mb-2 text-base font-semibold">{feature.title}</h3>
            <p class="text-sm leading-6 text-muted">{feature.body}</p>
          </div>
        {/each}
      </div>
    </div>
  </div>

  <!-- Showcase -->
  <div class="container my-20 max-w-7xl sm:my-28">
    <div class="w-full px-4 sm:px-8">
      <h2 class="title mb-4 text-center text-3xl font-bold tracking-tight">Built with OpenWorkers</h2>
      <p class="mx-auto mb-12 max-w-2xl text-center text-muted">
        Real-world examples running in production. See what you can build with OpenWorkers.
      </p>

      <div class="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
        {#each showcases as showcase}
          <Showcase
            title={showcase.title}
            description={showcase.description}
            url={showcase.url}
            screenshot={showcase.screenshot}
            source={showcase.source}
          />
        {/each}
      </div>
    </div>
  </div>

  <!-- Newsletter -->
  <div class="container my-20 max-w-7xl sm:my-28">
    <div class="w-full rounded-2xl border bg-surface px-6 py-12 sm:px-12">
      <div class="flex w-full flex-col items-center justify-between gap-6 md:flex-row">
        <div>
          <h4 class="text-xl font-semibold">Follow the engineering</h4>
          <p class="mt-1 text-sm text-muted">Release notes and engineering posts. No marketing, unsubscribe anytime.</p>
        </div>

        {#if status === 'success'}
          <p class="font-medium text-green-600 dark:text-green-400">Subscribed!</p>
        {:else}
          <form class="flex flex-wrap items-center justify-end gap-4" onsubmit={subscribe}>
            {#if status === 'error'}
              <p class="w-full text-right text-red-600 dark:text-red-400">Failed to subscribe. Please try again.</p>
            {/if}

            <div class="relative max-w-[24rem] flex-1 rounded-lg border bg-bg lg:max-w-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="absolute top-1/2 mx-3 h-5 w-5 translate-y-[-50%] text-faint"
              >
                <path
                  stroke-linecap="round"
                  d="M16.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zm0 0c0 1.657 1.007 3 2.25 3S21 13.657 21 12a9 9 0 10-2.636 6.364M16.5 12V8.25"
                />
              </svg>

              <input
                class="h-12 w-full rounded-lg bg-transparent pr-4 pl-10 lg:min-w-[20rem]"
                type="email"
                bind:value={email}
                autocomplete="email"
                placeholder="Email"
                required
              />
            </div>

            <button type="submit" class="btn btn-blue h-12 rounded-lg px-6" disabled={status === 'loading'}>
              {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
            </button>
          </form>
        {/if}
      </div>
    </div>
  </div>
</main>
