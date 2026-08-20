// ============================================================
// artprep/cli.ts — Préparation d'un sprite pour le jeu (ADR-061).
//
//   npm run sprite -- <source> <destination>
//   npm run sprite -- <source> <destination> --max 256
//   npm run sprite -- <source> <destination> --keep-fragments
//
// Les deux chemins désignent des fichiers PNG. Aucun exemple de nom n'est écrit
// avec son extension dans ce fichier, à dessein : `assets.integrity.test.ts`
// balaie tout `src/**/*.ts` à la recherche de noms d'assets, et prendrait un
// nom d'exemple pour une texture manquante. Le test a raison de le faire —
// c'est la formulation de l'aide qui doit céder.
//
// Chaîne : décapage de la frange claire, suppression des miettes de sélection,
// rognage des marges transparentes, anticrénelage du bord, réduction.
//
// Seul fichier du dossier autorisé à toucher au système de fichiers et à la
// sortie standard : tout le reste est pur et testable (même règle que
// `balance/cli.ts`).
// ============================================================

import {
  crop, downscale, dropFragments, feather, lightBorderCount,
  type FragmentResult, type FringeResult, type Rgba,
  stripFringe,
} from "./image";
import { decode, encode } from "./png";

// `node:fs` est typé localement dans `node.d.ts` (ADR-001).
import { readFileSync, writeFileSync } from "node:fs";

declare const process: { argv: string[]; exit(code: number): never };

/**
 * Plafond de résolution de stockage. Les sprites ne dépassent jamais 62 px à
 * l'affichage (portrait du Bestiaire, `render/menu/helpers.ts`) ni 82 px en jeu
 * (le boss) : 256 laisse un facteur 3 pour les écrans à forte densité, et
 * au-delà on ne stocke que du poids.
 */
const DEFAULT_MAX_SIDE: number = 256;

const argv: string[] = process.argv.slice(2);
const flags: string[] = argv.filter((a) => a.startsWith("--"));
const positional: string[] = argv.filter((a) => !a.startsWith("--"));
const src: string | undefined = positional[0];
const dst: string | undefined = positional[1];

if (src === undefined || dst === undefined) {
  console.error("usage : npm run sprite -- <source> <destination> [--max 256] [--keep-fragments]");
  process.exit(1);
}

const maxIndex: number = argv.indexOf("--max");
const maxSide: number = maxIndex >= 0 ? Number(argv[maxIndex + 1]) : DEFAULT_MAX_SIDE;
if (!Number.isFinite(maxSide) || maxSide <= 0) {
  console.error(`--max attend un nombre positif, reçu « ${argv[maxIndex + 1]} »`);
  process.exit(1);
}
const keepFragments: boolean = flags.includes("--keep-fragments");

let img: Rgba = decode(readFileSync(src));
const sourceSize: string = `${img.width}x${img.height}`;

const fringe: FringeResult = stripFringe(img);
const fragments: FragmentResult = keepFragments
  ? { dropped: 0, droppedPx: 0, kept: [] }
  : dropFragments(img);
img = crop(img);
const feathered: number = feather(img);
const cropped: string = `${img.width}x${img.height}`;
img = downscale(img, maxSide);
const remaining: number = lightBorderCount(img);

writeFileSync(dst, encode(img));

const lines: string[] = [
  `${src} -> ${dst}`,
  `  source          ${sourceSize}`,
  `  frange claire   ${fringe.removed} px en ${fringe.passes} passe(s)`,
  `  fragments       ${fragments.dropped} détaché(s) supprimé(s), ${fragments.droppedPx} px`,
  `  rognage         ${cropped}`,
  `  anticrénelage   ${feathered} px de bord`,
  `  sortie          ${img.width}x${img.height}`,
  `  bord clair      ${remaining} px restant(s)`,
];
console.log(lines.join("\n"));

// Les deux seuls cas où le résultat mérite un œil humain avant intégration.
if (fringe.saturated) {
  console.warn("  ⚠ plafond de passes atteint : l'érosion mordait peut-être le dessin, vérifier le contour.");
}
for (const k of fragments.kept) {
  console.warn(`  ⚠ fragment détaché de ${k.size} px CONSERVÉ (au-dessus du seuil de miette) — membre légitime ou doublon ?`);
}
if (remaining > 0) {
  console.warn(`  ⚠ ${remaining} px de bord encore clairs : le contour du sprite n'est pas noir partout.`);
}
