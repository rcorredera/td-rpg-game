import { defineConfig } from "vite";

// Mobile-first: le jeu doit rester jouable sur un viewport ~390px de large.
// base: chemin du repo GitHub Pages (project page, pas de domaine custom) — cf. ADR-006.
// Uniquement au build : le serveur de dev reste servi à la racine.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/td-rpg-game/" : "/",
  server: { host: true },
  build: { target: "es2020" },
}));
