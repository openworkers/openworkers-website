import adapter from '@openworkers/adapter-sveltekit';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { mdsvex } from 'mdsvex';
import { createHighlighter } from 'shiki';
import rehypeSlug from 'rehype-slug';

const highlighter = await createHighlighter({
  themes: ['github-light'],
  langs: ['javascript', 'typescript', 'bash', 'json', 'html', 'css', 'svelte', 'rust', 'sql', 'yaml', 'toml']
});

/** @type {import('@sveltejs/kit').Config} */
const config = {
  extensions: ['.svelte', '.md'],

  preprocess: [
    vitePreprocess(),
    mdsvex({
      extensions: ['.md'],
      rehypePlugins: [rehypeSlug],
      highlight: {
        highlighter: (code, lang) => {
          let html = highlighter.codeToHtml(code, {
            lang: lang || 'text',
            theme: 'github-light'
          });
          // Replace white background with slate-50 (#f8fafc)
          html = html.replace(/background-color:#fff/g, 'background-color:#f8fafc');
          // Escape backticks and ${} to prevent Svelte template interpretation
          const escaped = html.replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
          return `{@html \`${escaped}\`}`;
        }
      }
    })
  ],

  kit: {
    adapter: adapter({
      out: 'build'
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
