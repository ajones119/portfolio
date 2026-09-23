// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

import tailwindcss from '@tailwindcss/vite';
import wasm from 'vite-plugin-wasm';

import react from '@astrojs/react';
// https://astro.build/config
export default defineConfig({
  site: 'https://aramisjones.com',
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  prefetch: true,

  vite: {
    plugins: [tailwindcss(), wasm()],
    assetsInclude: ['**/*.hdr', '**/*.exr', '**/*.gltf', '**/*.glb']
  },

  integrations: [react()]
});