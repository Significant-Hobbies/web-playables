import { defineConfig } from "vite";
export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: "src/cloud-host.ts",
      name: "PlayablesCloudHost",
      formats: ["iife"],
      fileName: () => "cloud-host.js",
    },
  },
});
