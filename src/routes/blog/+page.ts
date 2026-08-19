interface PostMetadata {
  title: string;
  date: string;
  description: string;
}

export interface PostEntry extends PostMetadata {
  slug: string;
}

export function load(): { posts: PostEntry[] } {
  const modules = import.meta.glob<{ metadata: PostMetadata }>('./*/+page.md', { eager: true });

  const posts = Object.entries(modules)
    .map(([path, module]) => ({
      slug: path.replace('./', '').replace('/+page.md', ''),
      ...module.metadata
    }))
    .sort((a, b) => (a.date === b.date ? a.title.localeCompare(b.title) : b.date.localeCompare(a.date)));

  return { posts };
}
