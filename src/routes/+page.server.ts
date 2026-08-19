import { createHighlighter } from 'shiki';

const tsCode = `addEventListener("fetch", (event: FetchEvent) => {
  event.respondWith(handleRequest(event.request))
});

async function handleRequest(request: Request) {
  return new Response("Hello world", {
    headers: { "Content-Type": "text/html" }
  });
}`;

const rustCode = `use worker::*;

#[event(fetch)]
async fn fetch(req: Request, env: Env, _ctx: Context) -> Result<Response> {
    let name = env.var("NAME")?.to_string();

    Response::ok(format!("Hello {name}"))
}`;

export async function load() {
  const highlighter = await createHighlighter({
    themes: ['github-light', 'github-dark'],
    langs: ['typescript', 'rust']
  });

  const themes = { light: 'github-light', dark: 'github-dark' } as const;

  return {
    codeHtml: highlighter.codeToHtml(tsCode, { lang: 'typescript', themes }),
    rustHtml: highlighter.codeToHtml(rustCode, { lang: 'rust', themes })
  };
}
