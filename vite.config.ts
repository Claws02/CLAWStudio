import { defineConfig } from 'vite';

/**
 * Preview app only — the actual video render goes through Remotion, not Vite.
 * No React plugin on purpose: esbuild handles JSX, and dropping the plugin
 * removes a whole class of peer-dependency breakage. Cost is no Fast Refresh.
 */
export default defineConfig({
  root: 'web',
  publicDir: '../public',
  base: process.env.PREVIEW_BASE ?? '/',
  esbuild: { jsx: 'automatic' },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: { host: true, port: 5173 },
});
