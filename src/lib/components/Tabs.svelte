<script lang="ts">
  import { browser } from '$app/environment';
  import type { Snippet } from 'svelte';

  interface Props {
    tabs: string[];
    children: Snippet<[number]>;
  }

  let { tabs, children }: Props = $props();

  const STORAGE_KEY = 'docs-preferred-tab';

  function getInitialTab(): number {
    if (!browser) return 0;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const index = tabs.indexOf(saved);
      if (index !== -1) return index;
    }
    return 0;
  }

  let active = $state(getInitialTab());

  function selectTab(index: number) {
    active = index;
    if (browser) {
      localStorage.setItem(STORAGE_KEY, tabs[index]);
    }
  }
</script>

<div class="my-6 overflow-hidden rounded-lg border">
  <div class="flex border-b bg-surface">
    {#each tabs as tab, i}
      <button
        type="button"
        onclick={() => selectTab(i)}
        class="px-4 py-2.5 text-sm font-medium transition-colors
          {active === i
          ? 'bg-bg text-accent border-b-2 border-accent -mb-px'
          : 'text-muted hover:text-fg hover:bg-surface-2'}"
      >
        {tab}
      </button>
    {/each}
  </div>

  <div class="bg-bg p-4 [&>div>h2]:mt-0 [&>div>h2:first-child]:mt-0 [&>div>p:first-child]:mt-0 [&_pre]:my-4">
    {@render children(active)}
  </div>
</div>
