export const prerender = true;

const SITE = 'https://openworkers.com';

interface PostMetadata {
  date: string;
}

// '../docs/quickstart/+page.md' -> '/docs/quickstart'
function toPath(globKey: string): string {
  return globKey.slice(2).replace('/+page.md', '');
}

export function GET(): Response {
  const docs = Object.keys(import.meta.glob('../docs/**/+page.md')).map(toPath);

  const posts = Object.entries(
    import.meta.glob<{ metadata: PostMetadata }>('../blog/*/+page.md', { eager: true })
  ).map(([globKey, module]) => ({
    path: toPath(globKey),
    lastmod: module.metadata.date
  }));

  const urls: { path: string; lastmod?: string }[] = [
    { path: '/' },
    { path: '/blog' },
    ...docs.map((path) => ({ path })),
    ...posts
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    ({ path, lastmod }) =>
      `  <url><loc>${SITE}${path}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`
  )
  .join('\n')}
</urlset>
`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml' }
  });
}
