import path from "path";

import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 3001, // Different port from main app
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 3001,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/components/ui": path.resolve(__dirname, "../shared-ui/src/components"),
      "@/lib": path.resolve(__dirname, "../shared-ui/src/lib"),
      "@/integrations/supabase": path.resolve(__dirname, "../shared-utils/src"),
      "@/utils": path.resolve(__dirname, "../shared-utils/src"),
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
            if (id.includes('react')) return 'react-vendor';
            if (id.includes('@supabase')) return 'supabase';
            if (id.includes('@radix-ui')) return 'radix-ui';
            if (id.includes('@tanstack')) return 'query';
            return 'vendor';
          }
          return undefined;
        },
      },
    },
  },
}));
