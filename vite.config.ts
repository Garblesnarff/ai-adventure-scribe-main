import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 3000, // Changed port to avoid conflicts
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 3000,
    },
  },
  plugins: [
    react(),
    mode === 'development' && process.env.ENABLE_COMPONENT_TAGGER === 'true'
      ? componentTagger()
      : null,
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    manifest: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        'blog-client': path.resolve(__dirname, 'src/blog-client.ts'),
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-router-dom') || id.includes('react-dom') || /node_modules\/(?:react|@?react\b)/.test(id)) return 'react-vendor';
            if (id.includes('@supabase')) return 'supabase';
            if (id.includes('@radix-ui')) return 'radix-ui';
            if (id.includes('lucide-react')) return 'icons';
            if (id.includes('three') || id.includes('@react-three')) return 'three';
            if (id.includes('howler')) return 'audio';
            if (id.includes('@tanstack')) return 'query';
            return 'vendor';
          }
          return undefined;
        },
      },
    },
    chunkSizeWarningLimit: 2000,
  },
}));
