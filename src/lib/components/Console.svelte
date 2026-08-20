<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    content: string;
    footer?: Snippet;
  }

  let { title, content, footer }: Props = $props();

  const lines = $derived(
    content
      .trim()
      .split('\n')
      .map((_, i) => i + 1)
  );
</script>

<div class="w-full overflow-hidden rounded-xl border bg-bg shadow-[0_5px_20px_#0002]">
  <div class="flex h-10 items-center border-b bg-surface px-4">
    <div class="flex w-16 items-center space-x-2">
      <div class="h-3 w-3 rounded-full bg-border-strong"></div>
      <div class="h-3 w-3 rounded-full bg-border-strong"></div>
      <div class="h-3 w-3 rounded-full bg-border-strong"></div>
    </div>
    <div class="font-mono text-xs text-faint">
      {title}
    </div>
  </div>

  <div class="console-body flex overflow-x-auto bg-code-bg py-4 font-mono text-sm leading-6">
    <pre class="select-none pl-3 pr-3 text-right text-faint" aria-hidden="true"><code
        >{#each lines as line}{line}
        {/each}</code
      ></pre>
    <div class="pr-4">{@html content}</div>
  </div>

  {#if footer}
    <div class="border-t text-faint">
      {@render footer()}
    </div>
  {/if}
</div>

<style>
  .console-body :global(pre.shiki) {
    background-color: transparent !important;
    padding: 0;
    margin: 0;
    border: 0;
    border-radius: 0;
  }
</style>
