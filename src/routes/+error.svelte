<script lang="ts">
  import { page } from '$app/state';
</script>

<svelte:head>
  <title>Page not found - OpenWorkers</title>
</svelte:head>

<div class="flex min-h-[60vh] flex-col items-center justify-center">
  <h1 class="title mb-4 text-6xl font-bold text-slate-800">
    {page.status}
  </h1>
  <p class="mb-8 text-xl text-slate-600">
    {page.error?.message || 'Page not found'}
  </p>
  <a href="/" class="btn btn-blue rounded px-6 py-3 text-lg">Go back home</a>
</div>
