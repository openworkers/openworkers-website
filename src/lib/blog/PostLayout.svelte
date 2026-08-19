<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    date: string;
    description: string;
    children?: Snippet;
  }

  let { title, date, description, children }: Props = $props();

  const formatted = $derived(
    new Date(date + 'T00:00:00Z').toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC'
    })
  );
</script>

<svelte:head>
  <title>{title} - OpenWorkers Blog</title>
  <meta name="description" content={description} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:type" content="article" />
  <meta property="article:published_time" content={date} />
</svelte:head>

<main class="mx-auto max-w-7xl">
  <article class="mx-auto max-w-3xl px-6 py-16">
    <header class="mb-10">
      <p class="mb-3 text-sm text-faint">
        <a href="/blog" class="text-accent hover:text-accent-hover">Blog</a>
        <span class="mx-1">&middot;</span>
        <time datetime={date}>{formatted}</time>
      </p>
      <h1 class="text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
      <p class="mt-4 text-lg leading-8 text-muted">{description}</p>
    </header>

    <div class="markdown-body">
      {@render children?.()}
    </div>

    <footer class="mt-12 flex items-center justify-between border-t pt-6 text-sm">
      <a href="/blog" class="font-medium text-accent hover:text-accent-hover">&larr; All posts</a>
      <a href="/blog/rss.xml" class="text-muted hover:text-fg">RSS feed</a>
    </footer>
  </article>
</main>
