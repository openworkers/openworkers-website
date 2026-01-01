<script lang="ts">
  import '../app.css';
  import { page } from '$app/state';
  import { dev } from '$app/environment';

  let { children } = $props();

  const loginUrl = 'https://dash.' + (dev ? 'dev.localhost' : 'openworkers.com') + '/sign-in';

  const isDocsPage = $derived(page.url.pathname.startsWith('/docs'));
</script>

<nav class="w-full bg-white px-4" class:fixed={isDocsPage} class:border-b={isDocsPage} class:shadow-sm={isDocsPage}>
  <div class="container h-16 max-w-8xl items-center justify-between">
    <div class="flex flex-1 gap-2">
      <a href="/">
        <img class="hidden h-8 xs:block" src="https://arq.pw/public/long-black-2.svg" alt="logo" />
        <img class="block h-8 xs:hidden" src="https://arq.pw/public/icon-black.svg" alt="logo" />
      </a>
    </div>

    <div class="flex items-center gap-8 font-semibold">
      <a href="https://github.com/openworkers" target="_blank" class="group">
        <span class="sr-only">GitHub</span>
        <img src="/github.svg" alt="GitHub" class="h-5 w-5 opacity-60 transition-opacity group-hover:opacity-100" />
      </a>
      <a class="link" class:active={isDocsPage} href="/docs">Docs</a>
      <a class="link" href={loginUrl} target="_blank">Sign in</a>
    </div>
  </div>
</nav>

{@render children()}
