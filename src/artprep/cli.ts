// ============================================================
// artprep/cli.ts — Préparation d'un sprite pour le jeu (ADR-061).
//
//   npm run sprite -- <source> <destination>
//   npm run sprite -- <source> <destination> --max 256
//   npm run sprite -- <source> <destination> --keep-fragments
//   npm run sprite -- <source> <destination> --strip     (planche de marche)
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
  BACKGROUND_MIN, crop, downscale, dropFragments, feather, floodBackground, lightBorderCount, resample,
  type FragmentResult, type FringeResult, type Rgba,
  stripFringe,
} from "./image";
import { decode, encode } from "./png";
import {
  type Band, detectGroundLine, eraseGroundLine, type FrameBox,
  packFrames, type PackedStrip, sliceFrames,
} from "./strip";

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
/** Planche de poses : découpe le cycle de marche en cases régulières (ADR-065). */
const asStrip: boolean = flags.includes("--strip");

/** Pixels de bord adoucis — 0 sur une planche, dont les cases ne sont pas rognées. */
let featheredPx: number = 0;

let img: Rgba = decode(readFileSync(src));
const sourceSize: string = `${img.width}x${img.height}`;

// La ligne de sol se cherche AVANT tout : elle ne touche pas les bords de
// l'image, donc le détourage la contournerait et elle survivrait au milieu du
// dessin. Effacée là où elle est libre, elle laisse les pieds intacts.
const band: Band | null = asStrip ? detectGroundLine(img, BACKGROUND_MIN) : null;
const groundErased: number = band === null ? 0 : eraseGroundLine(img, band, BACKGROUND_MIN);

// Détourage : Gemini livre sur fond blanc opaque. Sur une image déjà détourée,
// l'étape ne trouve rien et ne fait rien.
const background: number = floodBackground(img);
const fringe: FringeResult = stripFringe(img);
// Sur une PLANCHE, les poses sont par nature des composantes séparées : la
// détection de fragments y verrait N-1 « membres détachés » et noierait une
// vraie anomalie sous ses propres alertes. Le tri des miettes se fait alors par
// le seuil d'encre de `sliceFrames`, colonne par colonne.
const fragments: FragmentResult = keepFragments || asStrip
  ? { dropped: 0, droppedPx: 0, kept: [] }
  : dropFragments(img);

let packed: PackedStrip | null = null;
let cropped: string;
if (asStrip) {
  if (band === null) {
    console.error("artprep: --strip attend une LIGNE DE SOL traversant la planche, aucune trouvée.");
    process.exit(1);
  }
  const boxes: FrameBox[] = sliceFrames(img);
  if (boxes.length < 2) {
    console.error(`artprep: --strip n'a isolé que ${boxes.length} pose(s) — planche attendue.`);
    process.exit(1);
  }
  packed = packFrames(img, boxes, band.bottom);
  cropped = `${packed.sheet.width}x${packed.sheet.height}`;
  // Chaque case est rééchantillonnée aux MÊMES dimensions exactes : un facteur
  // d'échelle appliqué case par case dériverait par arrondi, et Phaser
  // découperait de travers.
  const scale: number = Math.min(1, maxSide / packed.cellH);
  const cw: number = Math.max(1, Math.round(packed.cellW * scale));
  const chh: number = Math.max(1, Math.round(packed.cellH * scale));
  const out: Uint8Array = new Uint8Array(cw * packed.count * chh * 4);
  for (let i: number = 0; i < packed.count; i++) {
    const cell: Rgba = { width: packed.cellW, height: packed.cellH, data: new Uint8Array(packed.cellW * packed.cellH * 4) };
    for (let y: number = 0; y < packed.cellH; y++) {
      const s: number = (y * packed.sheet.width + i * packed.cellW) * 4;
      cell.data.set(packed.sheet.data.subarray(s, s + packed.cellW * 4), y * packed.cellW * 4);
    }
    const small: Rgba = resample(cell, cw, chh);
    for (let y: number = 0; y < chh; y++) {
      out.set(small.data.subarray(y * cw * 4, (y + 1) * cw * 4), (y * cw * packed.count + i * cw) * 4);
    }
  }
  img = { width: cw * packed.count, height: chh, data: out };
} else {
  img = crop(img);
  const feathered: number = feather(img);
  cropped = `${img.width}x${img.height}`;
  img = downscale(img, maxSide);
  featheredPx = feathered;
}
const remaining: number = lightBorderCount(img);

writeFileSync(dst, encode(img));

const lines: string[] = [
  `${src} -> ${dst}`,
  `  source          ${sourceSize}`,
  ...(asStrip ? [`  ligne de sol    y=${band?.top}..${band?.bottom}, ${groundErased} px effacés`] : []),
  `  fond retiré     ${background} px`,
  `  frange claire   ${fringe.removed} px en ${fringe.passes} passe(s)`,
  `  fragments       ${fragments.dropped} détaché(s) supprimé(s), ${fragments.droppedPx} px`,
  asStrip ? `  planche         ${cropped}, ${packed?.count} cases de ${packed?.cellW}x${packed?.cellH}` : `  rognage         ${cropped}`,
  `  anticrénelage   ${featheredPx} px de bord`,
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
