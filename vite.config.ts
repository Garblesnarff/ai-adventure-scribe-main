import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 3000, // Changed port to avoid conflicts
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
}));
