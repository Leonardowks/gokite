import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createRequire } from "module";
import { componentTagger } from "lovable-tagger";

const require = createRequire(import.meta.url);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      react: require.resolve("react"),
      "react-dom": require.resolve("react-dom"),
      "react-dom/client": require.resolve("react-dom/client"),
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@radix-ui/react-tooltip",
      "@radix-ui/react-dialog",
      "@radix-ui/react-popover",
      "@radix-ui/react-dropdown-menu",
      "@tanstack/react-virtual",
      "@tanstack/react-query",
    ],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-dom/client"],
  },
}));
