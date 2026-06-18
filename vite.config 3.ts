import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@ephemeris': path.resolve(__dirname, './ephemeris/src'),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    // GDD §18.1: target <50MB initial download. three/R3F/drei are the
    // single largest dependency cluster, so they get their own chunk;
    // gameplay code changing doesn't invalidate the (much larger,
    // rarely-changing) renderer chunk's cache.
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three', '@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },
});
