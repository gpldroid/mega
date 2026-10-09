import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Build the public landing page and the authenticated dashboard as independent HTML entry points.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        admin: 'admin/index.html',
      },
    },
  },
});
