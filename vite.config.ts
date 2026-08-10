import { defineConfig } from "vite";

// Mobile-first: le jeu doit rester jouable sur un viewport ~390px de large.
export default defineConfig({
  server: { host: true },
  build: { target: "es2020" },
});
