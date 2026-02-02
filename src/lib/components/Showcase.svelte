<script lang="ts">
  interface Props {
    title: string;
    description: string;
    url: string;
    screenshot: string;
  }

  let { title, description, url, screenshot }: Props = $props();
</script>

<div class="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-[0_5px_20px_#0001]">
  <div class="relative flex h-10 items-center justify-between border-b border-slate-100 px-4">
    <div class="flex items-center space-x-2">
      <div class="h-3 w-3 rounded-full bg-slate-200"></div>
      <div class="h-3 w-3 rounded-full bg-slate-200"></div>
      <div class="h-3 w-3 rounded-full bg-slate-200"></div>
    </div>

    <div
      class="absolute left-1/2 -translate-x-1/2 text-sm max-w-44 truncate ellipsis overflow-hidden whitespace-nowrap text-blue-500 hover:text-blue-600"
    >
      <a href={url} target="_blank" rel="noopener noreferrer" class="underline hover:text-slate-600">
        {title}
      </a>
    </div>
  </div>

  <div class="relative aspect-video w-full overflow-hidden bg-slate-50">
    <img src={screenshot} alt={title} class="h-full w-full object-cover object-top" />
  </div>

  <div class="border-t border-slate-100 p-4">
    <p class="mb-3 text-sm text-slate-600">{description}</p>
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex items-center gap-2 text-sm font-medium text-blue-500 transition-colors hover:text-blue-600"
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
  </div>
</div>
