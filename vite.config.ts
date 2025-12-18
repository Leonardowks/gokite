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
    // Ensure Vite/Rollup always resolve a single React instance (dev + production).
    preserveSymlinks: false,
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "./src") },

      // Hard-pin React entrypoints to avoid duplicate React instances in the bundle.
      // IMPORTANT: use exact-match regex finds so we don't rewrite subpaths unexpectedly.
      { find: /^react$/, replacement: require.resolve("react") },
      { find: /^react\/index\.js$/, replacement: require.resolve("react") },
      { find: /^react-dom$/, replacement: require.resolve("react-dom") },
      { find: /^react-dom\/index\.js$/, replacement: require.resolve("react-dom") },
      { find: /^react-dom\/client$/, replacement: require.resolve("react-dom/client") },
      { find: /^react-dom\/client\.js$/, replacement: require.resolve("react-dom/client") },
      { find: /^react\/jsx-runtime$/, replacement: require.resolve("react/jsx-runtime") },
      { find: /^react\/jsx-runtime\.js$/, replacement: require.resolve("react/jsx-runtime") },
      { find: /^react\/jsx-dev-runtime$/, replacement: require.resolve("react/jsx-dev-runtime") },
      { find: /^react\/jsx-dev-runtime\.js$/, replacement: require.resolve("react/jsx-dev-runtime") },

      // Some dependencies may (rarely) reference React via deep CJS paths.
      // Alias them back to the canonical entry to prevent hook dispatcher mismatches.
      { find: /^react\/cjs\/react\.production\.min\.js$/, replacement: require.resolve("react") },
      { find: /^react\/cjs\/react\.development\.js$/, replacement: require.resolve("react") },
      { find: /^react\/cjs\/react-jsx-runtime\.production\.min\.js$/, replacement: require.resolve("react/jsx-runtime") },
      { find: /^react\/cjs\/react-jsx-runtime\.development\.js$/, replacement: require.resolve("react/jsx-runtime") },
    ],
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    force: true, // Force re-bundle to clear stale React instances
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "react-is",
      "scheduler",
      "@radix-ui/react-tooltip",
      "@radix-ui/react-toast",
      "@radix-ui/react-dialog",
      "@radix-ui/react-slot",
      "next-themes",
      "sonner",
      "@tanstack/react-query",
      "@tanstack/react-virtual",
    ],
  },
}));
