<script lang="ts">
	import Console from '$lib/components/Console.svelte';

	const loginUrl = 'https://dash.openworkers.com/sign-in';

	let { data } = $props();

	let email = $state('');
	let status = $state<'idle' | 'loading' | 'success' | 'error'>('idle');

	async function subscribe(e: SubmitEvent) {
		e.preventDefault();
		status = 'loading';

		try {
			const res = await fetch('https://newsletter.workers.rocks/subscribe', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email })
			});

			status = res.ok ? 'success' : 'error';
		} catch {
			status = 'error';
		}
	}
</script>

<svelte:head>
	<title>OpenWorkers - Deploy instantly</title>
	<meta
		name="description"
		content="Deploy your serverless functions instantly. Schedule jobs, build powerful flows, and scale with ease."
	/>
</svelte:head>

<div class="min-h-screen">
	<div class="container mt-24 max-w-7xl flex-col">
		<div class="flex w-full flex-col justify-between px-8 lg:flex-row lg:gap-8">
			<div class="mx-auto max-w-xl flex-1">
				<div>
					<h1 class="title mb-4 text-5xl font-bold text-slate-800">
						Deploy&nbsp;<span class="text-gradient">instantly</span>
					</h1>

					<div class="my-12 flex">
						<ul class="list-checkmark mx-auto lg:mx-0">
							<li>Schedule jobs and build powerful flows</li>
							<li>Built-in monitoring</li>
							<li>Scale with ease</li>
							<li>Open source ecosystem</li>
							<li>Automate your deployments</li>
							<li>Easily bind your domains to workers</li>
						</ul>
					</div>
				</div>
			</div>

			<div class="mx-auto max-w-xl flex-1">
				<Console title="hello.ts" content={data.codeHtml}>
					{#snippet footer()}
						<a
							href="/docs/examples/telegram"
							class="flex h-12 items-center justify-center hover:bg-slate-50 hover:text-slate-800"
						>
							Check out more examples
						</a>
					{/snippet}
				</Console>
			</div>
		</div>

		<div class="mx-auto lg:mb-8">
			<a href={loginUrl} target="_blank" class="btn btn-blue my-24 rounded px-6 py-4 text-xl">
				Get Started
			</a>
		</div>
	</div>

	<div class="container mb-24 max-w-7xl">
		<div class="flex w-full flex-col justify-between border-y px-4 py-12 md:flex-row md:py-24">
			<h4 class="flex items-center py-2">Sign up for our newsletter</h4>

			{#if status === 'success'}
				<p class="text-green-600">Subscribed!</p>
			{:else}
				<form class="flex justify-between gap-4" onsubmit={subscribe}>
					<div class="relative max-w-[24rem] flex-1 rounded border lg:max-w-[32rem]">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="absolute top-1/2 mx-2 h-6 w-6 translate-y-[-50%] text-slate-400"
						>
							<path
								stroke-linecap="round"
								d="M16.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zm0 0c0 1.657 1.007 3 2.25 3S21 13.657 21 12a9 9 0 10-2.636 6.364M16.5 12V8.25"
							/>
						</svg>

						<input
							class="h-full w-full pr-4 pl-10 lg:min-w-[24rem]"
							type="email"
							bind:value={email}
							autocomplete="email"
							placeholder="Email"
							required
						/>
					</div>

					<button
						type="submit"
						class="btn btn-blue max-w-xs rounded px-4 py-2 text-xl"
						disabled={status === 'loading'}
					>
						{status === 'loading' ? 'Subscribing...' : 'Subscribe'}
					</button>
				</form>
			{/if}
		</div>
	</div>

	<div class="container mb-24 max-w-7xl items-center justify-center gap-8">
		<a href="https://github.com/openworkers" target="_blank">
			<img src="/github.svg" alt="github" class="h-16 w-16" />
		</a>

		<a href="https://t.me/openworkers" target="_blank">
			<img src="/telegram.svg" alt="telegram" class="h-16 w-16" />
		</a>

		<a href="https://twitter.com/openworkers" target="_blank">
			<img src="/twitter.svg" alt="twitter" class="h-16 w-16" />
		</a>
	</div>
</div>
