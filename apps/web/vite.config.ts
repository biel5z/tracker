import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Em desenvolvimento, tudo que começa com /api vai para o BFF (apps/api).
    proxy: { '/api': 'http://127.0.0.1:3333' },
  },
  preview: {
    port: 4173,
    proxy: { '/api': 'http://127.0.0.1:3333' },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
