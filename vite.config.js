import { defineConfig } from "vite";

export default defineConfig({
  build: {
    // Inline all assets as base64
    assetsInlineLimit: Infinity,

    // Single JS output
    rollupOptions: {
      output: {
        // No code splitting
        manualChunks: undefined,
        inlineDynamicImports: true,

        // Single entry file name
        entryFileNames: "bundle.js",
        assetFileNames: "bundle.[ext]",
      },
    },

    // Inline CSS into JS
    cssCodeSplit: false,
  },
});
