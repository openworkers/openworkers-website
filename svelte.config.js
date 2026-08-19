import openworkersAdapter from '@openworkers/adapter-sveltekit';
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { mdsvex } from 'mdsvex';
import { createHighlighter } from 'shiki';
import rehypeSlug from 'rehype-slug';
import { fileURLToPath } from 'node:url';

// mdsvex resolves layout paths relative to each .md file, so they must be absolute
const blogLayout = fileURLToPath(new URL('./src/lib/blog/PostLayout.svelte', import.meta.url));

const highlighter = await createHighlighter({
  themes: ['github-light', 'github-dark'],
  langs: ['javascript', 'typescript', 'bash', 'json', 'html', 'css', 'svelte', 'rust', 'sql', 'yaml', 'toml', 'go']
});

// Toggle between Openworkers adapter and static adapter
// with arg --openworkers
const useOpenworkersAdapter = process.argv.includes('--openworkers');
console.log(`Using ${useOpenworkersAdapter ? 'Openworkers Sveltekit' : 'Sveltekit Static'} adapter`);

/** @type {import('@sveltejs/kit').Config} */
const config = {
  extensions: ['.svelte', '.md'],

  preprocess: [
    vitePreprocess(),
    mdsvex({
      extensions: ['.md'],
      layout: {
        blog: blogLayout
      },
      rehypePlugins: [rehypeSlug],
      highlight: {
        highlighter: (code, lang) => {
          const html = highlighter.codeToHtml(code, {
            lang: lang || 'text',
            themes: { light: 'github-light', dark: 'github-dark' }
          });
          // Escape backticks and ${} to prevent Svelte template interpretation
          const escaped = html.replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
          return `{@html \`${escaped}\`}`;
        }
      }
    })
  ],

  kit: {
    adapter: useOpenworkersAdapter
      ? openworkersAdapter({
          out: 'dist',
          functions: true
        })
      : adapter({
          pages: 'build',
          assets: 'build',
          fallback: '404.html',
          precompress: false,
          strict: true
        }),
    paths: {
      base: ''
    },
    prerender: {
      handleHttpError: 'warn'
    }
  }
};

export default config;
