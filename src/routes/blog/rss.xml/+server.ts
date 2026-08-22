export const prerender = true;

const SITE = 'https://openworkers.com';

interface PostMetadata {
  title: string;
  date: string;
  description: string;
}

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function GET() {
  const modules = import.meta.glob<{ metadata: PostMetadata }>('../*/+page.md', { eager: true });

  const items = Object.entries(modules)
    .map(([path, module]) => ({
      slug: path.replace('../', '').replace('/+page.md', ''),
      ...module.metadata
    }))
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(
      (post) => `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${SITE}/blog/${post.slug}</link>
      <guid isPermaLink="true">${SITE}/blog/${post.slug}</guid>
      <pubDate>${new Date(post.date + 'T00:00:00Z').toUTCString()}</pubDate>
      <description>${escapeXml(post.description)}</description>
    </item>`
    )
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>OpenWorkers Blog</title>
    <link>${SITE}/blog</link>
    <description>Engineering notes from building an open-source workers platform.</description>
${items}
  </channel>
</rss>`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' }
  });
}
