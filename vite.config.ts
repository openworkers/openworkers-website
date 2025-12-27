/// <reference types="bun-types" />

import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  define: {
    __BUILD_ID__: JSON.stringify(process.env.BUILD_ID || 'dev')
  }
});
