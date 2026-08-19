import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const ROOT: string = dirname(fileURLToPath(import.meta.url));

/**
 * Identifiant de build affiché en jeu (`render/buildInfo.ts`) — permet de
 * vérifier d'un coup d'œil qu'un rechargement a bien pris la dernière version
 * et n'affiche pas une page en cache. Hash court + heure du commit : stable
 * pour un commit donné, changeant à chaque nouveau commit.
 *
 * Lit directement `.git/HEAD` et la ref qu'il pointe plutôt que d'exécuter
 * `git` en sous-processus : `execSync("git ...")` échouait silencieusement
 * (repli sur "dev" à chaque fois) selon l'environnement où `vite` est lancé —
 * PATH sans `git` selon le terminal/lanceur, notamment sous Windows. Aucune
 * dépendance externe, ne peut pas échouer pour la même raison.
 *
 * Ne DOIT jamais faire échouer le build si `.git` est absent (CI sans
 * historique, tarball) — repli sur un horodatage, qui change au moins à
 * chaque build même sans info de commit.
 */
function buildId(): string {
  try {
    const gitDir: string = resolve(ROOT, ".git");
    const head: string = readFileSync(resolve(gitDir, "HEAD"), "utf8").trim();
    const ref: RegExpExecArray | null = /^ref: (.+)$/.exec(head);
    const hashPath: string | null = ref ? resolve(gitDir, ref[1]!) : null;
    const hashSource: string = hashPath && existsSync(hashPath) ? readFileSync(hashPath, "utf8").trim() : head;
    const hash: string = hashSource.slice(0, 7);
    const mtime: Date = hashPath && existsSync(hashPath) ? statSync(hashPath).mtime : new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const date: string = `${pad(mtime.getDate())}/${pad(mtime.getMonth() + 1)} ${pad(mtime.getHours())}h${pad(mtime.getMinutes())}`;
    return `${hash} · ${date}`;
  } catch {
    const now: Date = new Date();
    return `dev · ${now.toTimeString().slice(0, 5)}`;
  }
}

// Mobile-first: le jeu doit rester jouable sur un viewport ~390px de large.
// base: chemin du repo GitHub Pages (project page, pas de domaine custom) — cf. ADR-006.
// Uniquement au build : le serveur de dev reste servi à la racine.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/td-rpg-game/" : "/",
  server: { host: true },
  build: { target: "es2020" },
  define: { __BUILD_ID__: JSON.stringify(buildId()) },
}));
