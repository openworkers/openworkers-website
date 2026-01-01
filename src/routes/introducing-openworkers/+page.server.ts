import { createHighlighter } from 'shiki';

const workerCode = `export default {
  async fetch(request, env) {
    const data = await env.KV.get("key");
    const rows = await env.DB.query(
      "SELECT * FROM users WHERE id = $1",
      [1]
    );
    return Response.json({ data, rows });
  }
};`;

const selfHostCode = `git clone https://github.com/openworkers/openworkers-infra
cd openworkers-infra && cp .env.example .env
docker compose up -d postgres
# Run migrations, generate token
docker compose up -d`;

export async function load() {
  const highlighter = await createHighlighter({
    themes: ['github-light'],
    langs: ['typescript', 'bash']
  });

  const workerHtml = highlighter.codeToHtml(workerCode, {
    lang: 'typescript',
    theme: 'github-light'
  });

  const selfHostHtml = highlighter.codeToHtml(selfHostCode, {
    lang: 'bash',
    theme: 'github-light'
  });

  return { workerHtml, selfHostHtml };
}
