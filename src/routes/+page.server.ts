import { createHighlighter } from 'shiki';

const code = `addEventListener("fetch", (event: FetchEvent) => {
  event.respondWith(handleRequest(event.request))
});

async function handleRequest(request: Request) {
  return new Response("Hello world", {
    headers: { "Content-Type": "text/html" }
  });
}`;

export async function load() {
	const highlighter = await createHighlighter({
		themes: ['github-light'],
		langs: ['typescript']
	});

	const codeHtml = highlighter.codeToHtml(code, {
		lang: 'typescript',
		theme: 'github-light'
	});

	return { codeHtml };
}
