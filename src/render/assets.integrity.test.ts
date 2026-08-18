import { describe, expect, it } from "vitest";

// ============================================================
// Intégrité du dossier d'assets.
//
// Deux dérives opposées, toutes deux silencieuses :
//   - un fichier référencé par le code n'existe pas — la texture manque à
//     l'exécution, et rien ne le signale hors du navigateur ;
//   - un fichier reste sur le disque sans que personne ne le charge — c'est ainsi
//     que `public/assets/` a atteint 20 Mo et 4128 fichiers pour ~60 réellement
//     utilisés, dont 11 Mo de pack Kenney UI pour QUATRE images.
//
// On raisonne par NOM DE FICHIER, pas par chemin complet : les chemins sont souvent
// construits par gabarit (`${P}/btn-grey.png`), donc un test qui cherche des chemins
// littéraux passe à côté de la moitié des références. Vérifié par mutation : remettre
// l'ancien chemin Kenney fait bien échouer le test.
//
// Les sources sont lues via `import.meta.glob` plutôt que `node:fs` : le projet
// n'embarque pas `@types/node` et ne veut pas exposer les globales Node à tout `src/`.
// ============================================================

/** Sources du projet, en texte brut. */
const SOURCES: Record<string, string> = import.meta.glob("/src/**/*.ts", {
  query: "?raw", import: "default", eager: true,
}) as Record<string, string>;

/**
 * Hors de `src/` : le PWA manifest (icône d'installation) cite un asset sans
 * passer par un `scene.load.*` — un fichier qui n'y apparaît QUE parce que ces
 * sources sont ignorées serait un faux orphelin.
 */
const OTHER_SOURCES: Record<string, string> = import.meta.glob(
  ["/index.html", "/public/manifest.webmanifest"], { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

/** Fichiers présents sous public/assets (clés seulement : non-eager, rien n'est chargé). */
const ASSET_FILES: string[] = Object.keys(import.meta.glob("/public/assets/**/*"));

/**
 * Assets versionnés mais pas encore câblés. Une entrée ici est une DETTE, pas une
 * exemption permanente : ce qui atterrit dans cette réserve doit être branché ou
 * supprimé. Migration du pack Tiny Swords en cours : panneaux et boutons sont
 * branchés (`render/uiSkin.ts`) ; restent les rubans/bannières de titre, le
 * château, le décor et les FX.
 */
const RESERVE: RegExp[] = [/^\/public\/assets\/tiny-swords\//];

/** Licences et notes : jamais chargées par le jeu, mais obligatoires (CC0 / CC BY). */
const NEVER_LOADED: RegExp = /(?:License[^/]*\.txt|README\.md)$/i;

/** Concaténation des sources, hors ce fichier (qui cite des noms en exemple). */
const CODE: string = Object.entries(SOURCES)
  .filter(([p]) => !p.endsWith("assets.integrity.test.ts"))
  .map(([, src]) => src)
  .concat(Object.values(OTHER_SOURCES))
  .join("\n");

const basename = (p: string) => p.slice(p.lastIndexOf("/") + 1);

/** Noms de fichiers présents sur le disque. */
const ON_DISK: Set<string> = new Set(ASSET_FILES.map(basename));

/** Noms de fichiers cités dans le code, quelle que soit la façon dont le chemin est bâti. */
// La négation en tête écarte les appels de méthode : sans elle, `scene.load.svg(…)`
// est lu comme un fichier nommé « load.svg ».
const CITED: string[] = [...new Set(CODE.match(/(?<![.\w])[A-Za-z0-9_@-]+\.(?:png|svg|json|ogg)/g) ?? [])];

describe("intégrité des assets", () => {
  it("ne cite aucun fichier absent du disque", () => {
    // Le vrai piège : renommer un fichier et oublier un `load.image`. Le typage ne
    // voit rien, les tests passent, et la texture manque à l'exécution.
    const missing: string[] = CITED.filter((n) => !ON_DISK.has(n));
    expect(missing, "fichiers cités dans le code mais absents de public/assets").toEqual([]);
  });

  it("ne conserve aucun fichier que personne ne charge", () => {
    const orphans: string[] = ASSET_FILES.filter((p) => {
      if (NEVER_LOADED.test(p)) return false;
      if (RESERVE.some((re) => re.test(p))) return false;
      return !CODE.includes(basename(p));
    });
    expect(orphans, "fichiers présents sur le disque mais jamais chargés").toEqual([]);
  });
});

// Le rebut de système de fichiers (`._*` AppleDouble, `.DS_Store`) ne peut PAS être
// testé ici : `import.meta.glob` ignore les fichiers cachés, donc un tel test
// passerait toujours — un test vert qui ne vérifie rien est pire que pas de test.
// C'est `.gitignore` qui tient ce rôle, et git qui l'applique.
