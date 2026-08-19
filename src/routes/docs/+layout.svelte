<script lang="ts">
  import { page } from '$app/state';
  import { afterNavigate } from '$app/navigation';
  import { tick } from 'svelte';
  import { docsNav, type NavItem } from '$lib/docs-nav';

  let { children } = $props();

  interface TocItem {
    id: string;
    text: string;
    level: number;
  }

  interface FlatItem extends NavItem {
    section: string;
  }

  let toc = $state<TocItem[]>([]);
  let activeId = $state<string>('');
  let mobileOpen = $state(false);
  let observer: IntersectionObserver | null = null;
  let tocContainer: HTMLDivElement | undefined = $state();

  const flatNav: FlatItem[] = docsNav.flatMap(
    (section) => section.children?.map((child) => ({ ...child, section: section.name })) ?? []
  );

  const currentIndex = $derived(flatNav.findIndex((item) => item.path === page.url.pathname));
  const current = $derived(currentIndex >= 0 ? flatNav[currentIndex] : undefined);
  const prev = $derived(currentIndex > 0 ? flatNav[currentIndex - 1] : undefined);
  const next = $derived(currentIndex >= 0 ? flatNav[currentIndex + 1] : undefined);

  const pageTitle = $derived(
    current && current.path !== '/docs' ? `${current.name} - OpenWorkers Docs` : 'OpenWorkers Docs'
  );

  $effect(() => {
    if (activeId && tocContainer) {
      const activeLink = tocContainer.querySelector(`a[href="#${activeId}"]`);

      if (activeLink) {
        activeLink.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }
  });

  function isActive(item: NavItem): boolean {
    return page.url.pathname === item.path;
  }

  const ghEditUrl = $derived(() => {
    const path = page.url.pathname;

    if (path === '/docs') {
      return 'https://github.com/openworkers/openworkers-website/edit/master/src/routes/docs/+page.md';
    }

    return `https://github.com/openworkers/openworkers-website/edit/master/src/routes${path}/+page.md`;
  });

  async function updateToc() {
    await tick();

    if (observer) {
      observer.disconnect();
    }

    const article = document.querySelector('article');

    if (!article) return;

    const headings = article.querySelectorAll('h2, h3');
    toc = Array.from(headings).map((h) => ({
      id: h.id,
      text: h.textContent || '',
      level: parseInt(h.tagName[1])
    }));

    activeId = '';

    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            activeId = entry.target.id;
            break;
          }
        }
      },
      { rootMargin: '-80px 0px -80% 0px' }
    );

    headings.forEach((h) => observer!.observe(h));
  }

  afterNavigate(() => {
    mobileOpen = false;
    updateToc();
  });
</script>

<svelte:head>
  <title>{pageTitle}</title>
  <meta
    name="description"
    content="OpenWorkers documentation: workers, bindings, frameworks, examples and self-hosting."
  />
</svelte:head>

{#snippet navList()}
  <ul class="flex flex-col gap-4 text-sm">
    {#each docsNav as section}
      <li class="flex flex-col gap-1">
        <span class="px-2 text-xs font-semibold tracking-wider text-faint uppercase">{section.name}</span>
        {#if section.children}
          <ul class="flex flex-col gap-0.5">
            {#each section.children as child}
              <li>
                <a href={child.path} class:active={isActive(child)}>
                  {child.name}
                </a>
              </li>
            {/each}
          </ul>
        {/if}
      </li>
    {/each}
  </ul>
{/snippet}

<!-- Mobile docs nav -->
<div class="sticky top-16 z-30 border-b bg-bg/95 backdrop-blur-lg sm:hidden">
  <button
    type="button"
    class="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-muted"
    onclick={() => (mobileOpen = !mobileOpen)}
    aria-expanded={mobileOpen}
  >
    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
      {#if mobileOpen}
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
      {:else}
        <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
      {/if}
    </svg>
    {#if current}
      <span class="text-faint">{current.section}</span>
      <span class="text-faint">/</span>
      <span class="font-medium text-fg">{current.name}</span>
    {:else}
      <span class="font-medium text-fg">Documentation</span>
    {/if}
  </button>

  {#if mobileOpen}
    <aside class="menu max-h-[calc(100vh-7rem)] overflow-y-auto border-t px-4 py-4">
      {@render navList()}
    </aside>
  {/if}
</div>

<div class="container max-w-[90rem] items-start">
  <aside
    class="menu sticky top-16 hidden max-h-[calc(100vh-4rem)] w-60 shrink-0 overflow-y-auto py-8 pr-2 sm:block scrollbar-none"
  >
    <nav>
      {@render navList()}
    </nav>

    <a
      class="mt-8 block px-2 text-xs text-faint hover:text-accent"
      href="https://github.com/openworkers/openworkers-website/commit/{__BUILD_ID__}"
      target="_blank"
      rel="noopener noreferrer"
    >
      build {__BUILD_ID__.slice(0, 7)}
    </a>
  </aside>

  <div class="min-w-0 flex-1 py-8 lg:px-8">
    <article class="markdown-body mx-auto max-w-3xl">
      {@render children()}

      {#if prev || next}
        <nav class="mt-12 flex gap-4 border-t pt-6" aria-label="Docs pagination">
          {#if prev}
            <a
              href={prev.path}
              class="group flex flex-1 flex-col gap-1 rounded-lg border p-4 no-underline! transition-colors hover:border-border-strong"
            >
              <span class="text-xs text-faint">&larr; Previous</span>
              <span class="text-sm font-medium text-fg group-hover:text-accent">{prev.name}</span>
            </a>
          {:else}
            <span class="flex-1"></span>
          {/if}

          {#if next}
            <a
              href={next.path}
              class="group flex flex-1 flex-col items-end gap-1 rounded-lg border p-4 no-underline! transition-colors hover:border-border-strong"
            >
              <span class="text-xs text-faint">Next &rarr;</span>
              <span class="text-sm font-medium text-fg group-hover:text-accent">{next.name}</span>
            </a>
          {:else}
            <span class="flex-1"></span>
          {/if}
        </nav>
      {/if}
    </article>
  </div>

  <aside
    class="sticky top-16 hidden max-h-[calc(100vh-4rem)] w-64 shrink-0 overflow-y-auto py-8 pl-2 xl:block scrollbar-none"
  >
    <div bind:this={tocContainer}>
      {#if toc.length > 0}
        <div class="mb-3 text-xs font-semibold tracking-wider text-faint uppercase">On this page</div>
        <ul class="flex flex-col gap-0.5 border-l text-sm">
          {#each toc as item}
            <li>
              <a
                href="#{item.id}"
                class="-ml-px block border-l border-transparent py-1 pl-3 text-muted transition-colors hover:text-fg"
                class:pl-6={item.level === 3}
                class:toc-active={activeId === item.id}
              >
                {item.text}
              </a>
            </li>
          {/each}
        </ul>
      {/if}

      <div class="my-6 border-b"></div>

      <a
        class="flex items-center gap-2 text-sm text-muted hover:text-fg"
        href={ghEditUrl()}
        target="_blank"
        rel="noopener noreferrer"
      >
        <svg class="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path
            fill-rule="evenodd"
            d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
          />
        </svg>
        Edit this page
      </a>
    </div>
  </aside>
</div>

<style>
  .toc-active {
    color: var(--accent);
    border-color: var(--accent);
  }
</style>
