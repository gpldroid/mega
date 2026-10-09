import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Use relative asset URLs so GitHub Pages works reliably under /mega/ and
// avoids breaking when the app is served from a project subpath.
export default defineConfig({\n  plugins: [react()],\n  base: './',\n  build: { rollupOptions: { input: { main: 'index.html', admin: 'admin/index.html' } } },\n});
