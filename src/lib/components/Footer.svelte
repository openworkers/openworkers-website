<script lang="ts">
  import Logo from '$lib/components/Logo.svelte';
</script>

<footer class="border-t bg-surface">
  <div class="container max-w-7xl flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between">
    <div class="flex flex-col items-center gap-2 md:items-start">
      <a href="/" class="text-fg" aria-label="OpenWorkers home">
        <Logo variant="full" class="h-6" />
      </a>
      <span class="text-sm text-faint">&copy; {new Date().getFullYear()} OpenWorkers. Open source, MIT licensed.</span>
    </div>

    <div class="flex items-center justify-center gap-6">
      <a href="/docs" class="text-sm text-muted hover:text-fg">Docs</a>
      <a href="/blog" class="text-sm text-muted hover:text-fg">Blog</a>
      <a href="/terms-of-service" class="text-sm text-muted hover:text-fg">Terms</a>
      <a href="/privacy-policy" class="text-sm text-muted hover:text-fg">Privacy</a>

      <span class="h-4 border-l"></span>

      <a
        href="https://github.com/openworkers"
        target="_blank"
        rel="noopener noreferrer"
        class="text-muted hover:text-fg"
      >
        <span class="sr-only">GitHub</span>
        <svg class="h-5 w-5" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path
            fill-rule="evenodd"
            d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
          />
        </svg>
      </a>
      <a href="https://t.me/openworkers" target="_blank" rel="noopener noreferrer" class="text-muted hover:text-fg">
        <span class="sr-only">Telegram</span>
        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path
            d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"
          />
        </svg>
      </a>
      <a
        href="https://twitter.com/openworkers"
        target="_blank"
        rel="noopener noreferrer"
        class="text-muted hover:text-fg"
      >
        <span class="sr-only">Twitter</span>
        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path
            d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
          />
        </svg>
      </a>
    </div>
  </div>
</footer>
