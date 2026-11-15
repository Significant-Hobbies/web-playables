import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
export default defineConfig({
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  plugins: [tailwindcss()],
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
