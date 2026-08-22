import { redirect } from '@sveltejs/kit';

// The announcement moved to the blog; the prerendered redirect page keeps
// the links and search ranking the original URL accumulated. On static
// hosting it is served as an instant meta refresh; the worker build
// answers with a real 301.
export const prerender = true;

export function load(): never {
  redirect(301, '/blog/introducing-openworkers');
}
