<script lang="ts">
  let { data } = $props();

  function formatDate(date: string): string {
    return new Date(date + 'T00:00:00Z').toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC'
    });
  }
</script>

<svelte:head>
  <title>Blog - OpenWorkers</title>
  <meta name="description" content="Engineering notes from building an open-source workers platform." />
  <meta property="og:title" content="OpenWorkers Blog" />
  <meta property="og:description" content="Engineering notes from building an open-source workers platform." />
  <meta property="og:type" content="website" />
  <link rel="alternate" type="application/rss+xml" title="OpenWorkers Blog" href="/blog/rss.xml" />
</svelte:head>

<main class="mx-auto max-w-7xl">
  <div class="mx-auto max-w-3xl px-6 py-16">
    <div class="mb-12 flex items-end justify-between">
      <div>
        <h1 class="mb-3 text-3xl font-extrabold tracking-tight">Blog</h1>
        <p class="text-lg text-muted">
          Engineering notes from building a workers platform: measurements, mechanisms, and the failures worth writing
          down.
        </p>
      </div>
      <a href="/blog/rss.xml" class="hidden shrink-0 text-sm text-muted hover:text-fg sm:block">RSS feed</a>
    </div>

    <ul class="flex flex-col">
      {#each data.posts as post (post.slug)}
        <li class="group border-b py-8 first:pt-0 last:border-b-0">
          <article>
            <p class="mb-2 font-mono text-xs text-faint">
              <time datetime={post.date}>{formatDate(post.date)}</time>
            </p>
            <h2 class="mb-2 text-xl font-semibold tracking-tight">
              <a class="transition-colors group-hover:text-accent" href="/blog/{post.slug}">{post.title}</a>
            </h2>
            <p class="mb-3 leading-7 text-muted">{post.description}</p>
            <a class="text-sm font-medium text-accent hover:text-accent-hover" href="/blog/{post.slug}">
              Read more &rarr;
            </a>
          </article>
        </li>
      {/each}
    </ul>
  </div>
</main>
