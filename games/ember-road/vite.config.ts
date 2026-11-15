import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  base: "./",
  build: { outDir: mode === "yt" ? "dist/yt" : "dist/web", emptyOutDir: true, target: "es2022" },
  plugins: [
    tailwindcss(),
    {
      name: "yt-sdk-inject",
      transformIndexHtml() {
        if (mode !== "yt") return;
        return [
          {
            tag: "script",
            attrs: { src: "https://www.youtube.com/game_api/v1" },
            injectTo: "head-prepend" as const,
          },
        ];
      },
    },
  ],
}));
