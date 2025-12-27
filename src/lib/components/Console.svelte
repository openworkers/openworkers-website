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

<div class="max-h-[none] overflow-hidden rounded-xl border border-slate-100 bg-white shadow-[0_5px_20px_#0001]">
  <div class="flex h-10 border-b border-slate-100">
    <div class="flex w-[33%] items-center space-x-2 px-4">
      <div class="h-3 w-3 rounded-full bg-slate-200"></div>
      <div class="h-3 w-3 rounded-full bg-slate-200"></div>
      <div class="h-3 w-3 rounded-full bg-slate-200"></div>
    </div>
    <div class="flex items-center text-sm text-slate-400">
      {title}
    </div>
  </div>

  <div class="flex flex-auto flex-col overflow-x-auto">
    <div class="flex flex-auto">
      <div class="flex flex-row">
        <pre class="select-none whitespace-nowrap text-right text-sm text-slate-400" aria-hidden="true">
					<code class="block p-4">
						{#each lines as line}
              {line}<br />
            {/each}
					</code>
				</pre>
        <pre class="mt-4 text-sm">{@html content}</pre>
      </div>
    </div>
  </div>

  {#if footer}
    <div class="border-t border-slate-100 text-slate-400">
      {@render footer()}
    </div>
  {/if}
</div>
