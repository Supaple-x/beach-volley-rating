import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        tournament: resolve(__dirname, 'tournament.html'),
      },
    },
  },
  server: {
    port: 3000,
    host: '127.0.0.1',
    open: true,
  },
});
