<script lang="ts">
  interface Props {
    title: string;
    description: string;
    url: string;
    screenshot: string;
    source?: string;
  }

  let { title, description, url, screenshot, source }: Props = $props();
</script>

<div
  class="flex flex-col overflow-hidden rounded-xl border bg-bg shadow-[0_5px_20px_#0001] transition-shadow hover:shadow-[0_5px_24px_#0002]"
>
  <div class="relative flex h-10 items-center justify-between border-b bg-surface px-4">
    <div class="flex items-center space-x-2">
      <div class="h-3 w-3 rounded-full bg-border-strong"></div>
      <div class="h-3 w-3 rounded-full bg-border-strong"></div>
      <div class="h-3 w-3 rounded-full bg-border-strong"></div>
    </div>

    <div class="absolute left-1/2 max-w-44 -translate-x-1/2 truncate font-mono text-xs">
      <a href={url} target="_blank" rel="noopener noreferrer" class="text-muted hover:text-fg">
        {title}
      </a>
    </div>
  </div>

  <div class="relative aspect-video w-full overflow-hidden bg-surface">
    <img src={screenshot} alt={title} loading="lazy" class="h-full w-full object-cover object-top" />
  </div>

  <div class="flex-1 border-t p-4">
    <div class="flex h-full flex-col justify-between">
      <p class="mb-3 text-sm text-muted">{description}</p>
      <div class="flex items-center justify-between">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 text-sm font-medium text-accent transition-colors hover:text-accent-hover"
        >
          View Live
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="h-4 w-4"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
            />
          </svg>
        </a>
        {#if source}
          <a
            href={source}
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-fg"
          >
            Source
            <svg class="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path
                fill-rule="evenodd"
                d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
              />
            </svg>
          </a>
        {/if}
      </div>
    </div>
  </div>
</div>
