<script lang="ts">
  import Console from '$lib/components/Console.svelte';

  const loginUrl = 'https://dash.openworkers.com/sign-in';

  let { data } = $props();

  let email = $state('');
  let status = $state<'idle' | 'loading' | 'success' | 'error'>('idle');

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
  <title>OpenWorkers - Deploy instantly</title>
  <meta
    name="description"
    content="Deploy your serverless functions instantly. Schedule jobs, build powerful flows, and scale with ease."
  />
</svelte:head>

<div class="min-h-screen">
  <div class="container mt-24 max-w-7xl flex-col">
    <div class="flex w-full flex-col justify-between px-8 lg:flex-row lg:gap-8">
      <div class="mx-auto max-w-xl flex-1">
        <div>
          <div class="mb-6 inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-600">
            Now in public beta
          </div>

          <h1 class="title mb-4 text-5xl font-bold text-slate-800">
            Deploy&nbsp;<span class="text-gradient">instantly</span>
          </h1>

          <div class="my-12 flex">
            <ul class="list-checkmark mx-auto lg:mx-0">
              <li>Schedule jobs and build powerful flows</li>
              <li>Built-in monitoring</li>
              <li>Scale with ease</li>
              <li>Open source ecosystem</li>
              <li>Automate your deployments</li>
              <li>Easily bind your domains to workers</li>
            </ul>
          </div>

          <div class="flex flex-col gap-4 sm:flex-row">
            <a href={loginUrl} target="_blank" class="btn btn-blue rounded px-6 py-4 text-xl">
              Get Started
            </a>
            <a href="/docs" class="btn rounded border border-slate-200 bg-white px-6 py-4 text-xl text-slate-700 hover:bg-slate-50">
              Read Documentation
            </a>
          </div>
        </div>
      </div>

      <div class="mx-auto max-w-xl flex-1">
        <Console title="hello.ts" content={data.codeHtml}>
          {#snippet footer()}
            <div class="flex items-center justify-between px-6 py-3">
              <span class="text-xs text-slate-500">TypeScript supported out of the box</span>
              <a
                href="/docs/examples/json-api"
                class="text-xs font-medium text-blue-500 transition-colors hover:text-blue-600"
              >
                View more examples
              </a>
            </div>
          {/snippet}
        </Console>
      </div>
    </div>
  </div>

  <div class="container my-24 max-w-7xl">
    <div class="rounded-2xl border border-slate-200 bg-white px-6 py-12 sm:px-12">
      <div class="flex w-full flex-col items-center justify-between gap-6 md:flex-row">
        <h4 class="text-xl font-semibold text-slate-800">Sign up for our newsletter</h4>

        {#if status === 'success'}
          <p class="text-green-600 font-medium">Subscribed!</p>
        {:else}
          <form class="flex flex-wrap items-center justify-end gap-4" onsubmit={subscribe}>
            {#if status === 'error'}
              <p class="w-full text-right text-red-600">Failed to subscribe. Please try again.</p>
            {/if}

            <div class="relative max-w-[24rem] flex-1 rounded-lg border border-slate-200 lg:max-w-[32rem]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="absolute top-1/2 mx-3 h-5 w-5 translate-y-[-50%] text-slate-400"
              >
                <path
                  stroke-linecap="round"
                  d="M16.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zm0 0c0 1.657 1.007 3 2.25 3S21 13.657 21 12a9 9 0 10-2.636 6.364M16.5 12V8.25"
                />
              </svg>

              <input
                class="h-12 w-full rounded-lg pr-4 pl-10 lg:min-w-[20rem]"
                type="email"
                bind:value={email}
                autocomplete="email"
                placeholder="Email"
                required
              />
            </div>

            <button type="submit" class="btn btn-blue h-12 rounded-lg px-6 text-lg" disabled={status === 'loading'}>
              {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
            </button>
          </form>
        {/if}
      </div>
    </div>
  </div>

  <footer class="border-t border-slate-200">
    <div class="container max-w-7xl flex-col items-center py-12 md:flex-row md:justify-between">
      <div class="mb-4 flex items-baseline gap-4 md:mb-0">
        <span class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600">OpenWorkers</span>
        <span class="text-sm text-slate-500">© {new Date().getFullYear()} OpenWorkers</span>
      </div>

      <div class="flex gap-8">
        <a href="https://github.com/openworkers" target="_blank" class="group">
          <span class="sr-only">GitHub</span>
          <img src="/github.svg" alt="github" class="h-6 w-6 opacity-60 transition-opacity group-hover:opacity-100" />
        </a>
        <a href="https://t.me/openworkers" target="_blank" class="group">
          <span class="sr-only">Telegram</span>
          <img src="/telegram.svg" alt="telegram" class="h-6 w-6 opacity-60 transition-opacity group-hover:opacity-100" />
        </a>
        <a href="https://twitter.com/openworkers" target="_blank" class="group">
          <span class="sr-only">Twitter</span>
          <img src="/twitter.svg" alt="twitter" class="h-6 w-6 opacity-60 transition-opacity group-hover:opacity-100" />
        </a>
      </div>
    </div>
  </footer>
</div>
