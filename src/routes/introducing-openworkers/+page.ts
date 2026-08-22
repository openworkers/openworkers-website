import { redirect } from '@sveltejs/kit';

// The announcement moved to the blog; a permanent redirect keeps the
// links and search ranking the original URL accumulated.
export const prerender = false;

export function load(): never {
  redirect(301, '/blog/introducing-openworkers');
}
