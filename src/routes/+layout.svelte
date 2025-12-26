<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';

	let { children } = $props();

	const loginUrl = 'https://dash.openworkers.com/sign-in';

	const isDocsPage = $derived(page.url.pathname.startsWith('/docs'));
</script>

<nav class="w-full bg-white px-4" class:fixed={isDocsPage} class:border-b={isDocsPage} class:shadow-sm={isDocsPage}>
	<div class="container h-16 max-w-8xl items-center justify-between">
		<div class="flex flex-1 gap-2">
			<a href="/">
				<img class="hidden h-8 xs:block" src="https://arq.pw/public/long-black-2.svg" alt="logo" />
				<img class="block h-8 xs:hidden" src="https://arq.pw/public/icon-black.svg" alt="logo" />
			</a>
		</div>

		<div class="flex gap-8 font-semibold">
			<a class="link" class:active={isDocsPage} href="/docs">Docs</a>
			<a class="link" href={loginUrl} target="_blank">Sign in</a>
		</div>
	</div>
</nav>

{@render children()}

