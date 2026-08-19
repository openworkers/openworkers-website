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
  <link rel="alternate" type="application/rss+xml" title="OpenWorkers Blog" href="/blog/rss.xml" />
</svelte:head>

<div class="mx-auto max-w-7xl">
  <div class="max-w-3xl px-6 py-16">
    <div class="mb-12">
      <h1 class="mb-3 text-3xl font-extrabold tracking-tight text-slate-900">Blog</h1>
      <p class="text-lg text-slate-600">
        Engineering notes from building a workers platform: measurements, mechanisms, and the failures worth writing
        down.
      </p>
    </div>

    <ul class="space-y-10">
      {#each data.posts as post (post.slug)}
        <li>
          <article>
            <p class="mb-1 text-sm text-slate-500">{formatDate(post.date)}</p>
            <h2 class="mb-2 text-xl font-semibold">
              <a class="text-slate-900 hover:text-blue-700" href="/blog/{post.slug}">{post.title}</a>
            </h2>
            <p class="text-slate-600">{post.description}</p>
          </article>
        </li>
      {/each}
    </ul>
  </div>
</div>
