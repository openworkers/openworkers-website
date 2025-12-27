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

  let toc = $state<TocItem[]>([]);
  let activeId = $state<string>('');
  let observer: IntersectionObserver | null = null;
  let tocContainer: HTMLDivElement;

  $effect(() => {
    if (activeId && tocContainer) {
      const activeLink = tocContainer.querySelector(`a[href="#${activeId}"]`);

      if (activeLink) {
        activeLink.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }
  });

  function isActive(item: NavItem): boolean {
    const currentPath = page.url.pathname;

    if (item.path === '/docs') {
      return currentPath === '/docs';
    }

    return currentPath === item.path || currentPath.startsWith(item.path + '/');
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
    updateToc();
  });
</script>

<div class="min-h-[calc(100vh-4rem)] pt-20">
  <div class="container max-w-8xl">
    <aside class="menu hidden min-w-56 max-w-fit py-4 sm:block">
      <div class="fixed min-w-48 max-h-[calc(100vh-6rem)] overflow-y-auto scrollbar-none flex flex-col">
        <nav class="flex-1">
          <ul class="flex flex-col gap-1 text-sm">
            {#each docsNav as item}
              <li class="flex flex-col gap-1 text-slate-600">
                {#if item.children}
                  <span class="cursor-default py-2 text-gray-950 font-semibold">{item.name}</span>
                  <div class="ml-4 border-l pl-4">
                    <ul class="flex flex-col gap-1">
                      {#each item.children as child}
                        <li>
                          <a href={child.path} class:active={isActive(child)}>
                            {child.name}
                          </a>
                        </li>
                      {/each}
                    </ul>
                  </div>
                {:else}
                  <a href={item.path} class:active={isActive(item)}>
                    {item.name}
                  </a>
                {/if}
              </li>
            {/each}
          </ul>
        </nav>

        <span class="mt-4 text-sm text-slate-400 hover:text-blue-500 py-8">
          build {__BUILD_ID__.slice(0, 7)}
        </span>
      </div>
    </aside>

    <article class="markdown-body flex-1 overflow-auto py-4 lg:px-8">
      {@render children()}
    </article>

    <aside class="toc hidden min-w-56 max-w-80 py-4 empty:hidden xl:flex">
      <div bind:this={tocContainer} class="fixed max-h-[calc(100vh-6rem)] overflow-y-auto scrollbar-none pb-8">
        {#if toc.length > 0}
          <div class="mb-3 text-sm font-semibold leading-6 text-slate-900">On this page</div>
          <ul class="flex flex-col gap-1 text-sm text-slate-700">
            {#each toc as item}
              <li>
                <a
                  href="#{item.id}"
                  class="block p-1 font-medium hover:text-slate-800"
                  class:pl-4={item.level === 3}
                  class:text-blue-500={activeId === item.id}
                >
                  {item.text}
                </a>
              </li>
            {/each}
          </ul>
        {/if}

        <div class="my-6 border-b"></div>

        <a
          class="flex items-center text-sm leading-6 text-slate-600 hover:text-slate-900"
          href={ghEditUrl()}
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg class="mr-3 inline" width="1.4rem" height="1.4rem" viewBox="0 0 16 16">
            <path
              fill="currentColor"
              fill-rule="evenodd"
              d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
            ></path>
          </svg>
          Edit this page
        </a>
      </div>
    </aside>
  </div>
</div>
