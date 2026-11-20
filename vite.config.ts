import { defineConfig } from "vite";

// Served from https://jndr0.github.io/portfolio/
export default defineConfig({
  base: "/portfolio/",
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 900,
  },
});
