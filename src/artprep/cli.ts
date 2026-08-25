// ============================================================
// artprep/cli.ts — Préparation d'un sprite pour le jeu (ADR-061).
//
//   npm run sprite -- <source> <destination>
//   npm run sprite -- <source> <destination> --max 256
//   npm run sprite -- <source> <destination> --keep-fragments
//   npm run sprite -- <source> <destination> --strip     (planche de marche)
//   npm run sprite -- <source> <destination> --strip --poses 4 --profile-left
//   npm run sprite -- <source> <destination> --strip --mirror 1:2
//   npm run sprite -- <source> <destination> --strip --drop 2
//   npm run sprite -- <source> <destination> --strip --fill-holes
//   npm run sprite -- <face> <profil> <dos> <destination> --strip   (une image par direction)
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
  BACKGROUND_MIN, crop, downscale, dropFragments, feather, fillHoles, findHoles, floodBackground,
  type Hole, lightBorderCount, resample, stack,
  type FragmentResult, type FringeResult, type Rgba,
  stripFringe,
} from "./image";
import { cycleReport, cycleWarnings } from "./cycle";
import { decode, encode } from "./png";
import {
  type Band, detectGroundLines, dropPoses, eraseGroundLine,
  type MirrorPredicate, packRows, type PackedStrip, sliceFrames, sliceRowInto, type StripRow,
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

/**
 * Options qui CONSOMMENT l'argument suivant.
 *
 * Sans cette liste, `--max 256` déposait « 256 » parmi les chemins. Tant que la
 * destination était le DEUXIÈME positionnel, le défaut restait invisible ; il
 * devient bloquant dès qu'on accepte plusieurs sources et que la destination est
 * le dernier (ADR-074).
 */
const VALUED: readonly string[] = ["--max", "--poses", "--mirror", "--drop"];

const positional: string[] = [];
for (let i: number = 0; i < argv.length; i++) {
  const a: string = argv[i]!;
  if (a.startsWith("--")) {
    if (VALUED.includes(a)) i++;
    continue;
  }
  positional.push(a);
}
// Une source, ou PLUSIEURS à empiler — une par direction. La destination est
// toujours le dernier chemin, ce qui laisse le nombre de sources libre.
const sources: string[] = positional.slice(0, -1);
const dst: string | undefined = positional[positional.length - 1];

if (sources.length === 0 || dst === undefined) {
  console.error("usage : npm run sprite -- <source...> <destination> [--max 256] [--keep-fragments]");
  process.exit(1);
}
if (sources.length > 1 && !flags.includes("--strip")) {
  console.error("artprep: plusieurs sources n'ont de sens qu'avec --strip, une rangée par image.");
  process.exit(1);
}
const src: string = sources.join(" + ");

const maxIndex: number = argv.indexOf("--max");
const maxSide: number = maxIndex >= 0 ? Number(argv[maxIndex + 1]) : DEFAULT_MAX_SIDE;
if (!Number.isFinite(maxSide) || maxSide <= 0) {
  console.error(`--max attend un nombre positif, reçu « ${argv[maxIndex + 1]} »`);
  process.exit(1);
}
const keepFragments: boolean = flags.includes("--keep-fragments");
/**
 * Boucher les poches de fond enfermées dans le dessin (ADR-071).
 *
 * Sur demande, jamais d'office : l'algorithme ne distingue pas une aisselle
 * d'un reflet d'armure ou d'un œil. Le rapport recense les poches dans tous les
 * cas — regarder la carte, puis décider.
 */
const fillHolesFlag: boolean = flags.includes("--fill-holes");
/** Planche de poses : découpe le cycle de marche en cases régulières (ADR-065). */
const asStrip: boolean = flags.includes("--strip");
/** Force le nombre de poses par rangée quand la détection se trompe. */
const posesIndex: number = argv.indexOf("--poses");
const posesFlag: number = posesIndex >= 0 ? Number(argv[posesIndex + 1]) : 0;
if (posesIndex >= 0 && (!Number.isInteger(posesFlag) || posesFlag < 1)) {
  console.error(`--poses attend un entier positif, reçu « ${argv[posesIndex + 1]} »`);
  process.exit(1);
}
/** La rangée de profil regarde à GAUCHE : la retourner pour tenir la convention. */
const profileLeft: boolean = flags.includes("--profile-left");
/**
 * Poses à RETIRER du cycle, dans toutes les rangées (ADR-070).
 *
 * Le remède de premier choix quand le générateur rate une case : la retourner
 * en échange son équipement de main, et le clignotement se voit. Trois poses
 * cohérentes valent mieux que quatre dont une saute.
 */
const dropIndex: number = argv.indexOf("--drop");
const dropPosesFlag: Set<number> = new Set<number>();
if (dropIndex >= 0) {
  for (const part of (argv[dropIndex + 1] ?? "").split(",")) {
    const n: number = Number(part.trim());
    if (!Number.isInteger(n) || n < 0) {
      console.error(`--drop attend des index de pose séparés par des virgules, reçu « ${part} »`);
      process.exit(1);
    }
    dropPosesFlag.add(n);
  }
}
/**
 * Poses ISOLÉES à retourner, en `rangée:pose` séparées par des virgules.
 *
 * Le générateur ne se trompe pas toujours sur une rangée entière : `--mirror`
 * désigne la seule case fautive là où `--profile-left` retournerait aussi les
 * poses saines. À ne garder QUE si la pose porte un équipement symétrique —
 * sinon `--drop` (ADR-070).
 */
const mirrorIndex: number = argv.indexOf("--mirror");
const mirrorArg: string = mirrorIndex >= 0 ? (argv[mirrorIndex + 1] ?? "") : "";
const mirrorCells: Set<string> = new Set<string>();
if (mirrorIndex >= 0) {
  for (const part of mirrorArg.split(",")) {
    const m: RegExpMatchArray | null = part.trim().match(/^(\d+):(\d+)$/);
    if (m === null) {
      console.error(`--mirror attend des couples « rangée:pose » séparés par des virgules, reçu « ${part} »`);
      process.exit(1);
    }
    mirrorCells.add(`${Number(m[1])}:${Number(m[2])}`);
  }
}

/** Rangées dont le cycle ne bouge pas assez (ADR-072). */
let cycleAlerts: string[] = [];

/** Pixels de bord adoucis — 0 sur une planche, dont les cases ne sont pas rognées. */
let featheredPx: number = 0;

let img: Rgba = stack(sources.map(f => decode(readFileSync(f))));
const sourceSize: string = `${img.width}x${img.height}`;

// La ligne de sol se cherche AVANT tout : elle ne touche pas les bords de
// l'image, donc le détourage la contournerait et elle survivrait au milieu du
// dessin. Effacée là où elle est libre, elle laisse les pieds intacts.
// Une planche complète porte UNE ligne par direction dessinée (ADR-067) : face,
// profil, dos. Une planche à une seule direction n'en a qu'une, et la suite de
// la chaîne ne fait pas la différence.
const bands: Band[] = asStrip ? detectGroundLines(img, BACKGROUND_MIN) : [];
let groundErased: number = 0;
for (const b of bands) groundErased += eraseGroundLine(img, b, BACKGROUND_MIN);

// Détourage : Gemini livre sur fond blanc opaque. Sur une image déjà détourée,
// l'étape ne trouve rien et ne fait rien.
const background: number = floodBackground(img);
// Poches de fond ENFERMÉES : le creux entre un bras et le torse quand la
// créature tient son arme devant elle, l'échancrure d'un croissant de hache.
// Le remplissage part des bords et ne les atteint jamais (ADR-071).
// Toujours RECENSÉES, bouchées seulement sur demande : les mêmes composantes
// portent aussi les reflets et les yeux, et les boucher d'office est le piège
// déjà payé en ADR-050.
const holes: Hole[] = findHoles(img);
const holesPx: number = fillHolesFlag ? fillHoles(img, holes) : 0;
// Le décapage vient APRÈS : ouvrir une poche découvre le dégradé JPEG qui la
// bordait, et sans cette passe il resterait un liseré clair dans chaque aisselle.
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
  if (bands.length === 0) {
    console.error("artprep: --strip attend une LIGNE DE SOL traversant la planche, aucune trouvée.");
    process.exit(1);
  }
  // Une rangée va de la fin de la ligne précédente à sa propre ligne : c'est ce
  // qui la sépare de sa voisine, sans avoir à supposer une hauteur régulière.
  const rowRange = (i: number): [number, number] => [i === 0 ? 0 : bands[i - 1]!.bottom + 1, bands[i]!.bottom];

  // Combien de poses par rangée ? Le comptage par les TROUS entre poses ne suffit
  // pas : mesuré sur la planche du gobelin, les poses n'étaient séparées que de
  // 15 à 29 px — moins que le seuil qui rattache un fer d'épée à sa pose — et en
  // vue de profil elles se CHEVAUCHAIENT. On retient donc le compte de la rangée
  // la mieux séparée, puis on découpe TOUTES les rangées à ce compte, en coupant
  // aux creux du profil d'encre.
  const detected: number[] = bands.map((_, i) => sliceFrames(img, 30, 2, ...rowRange(i)).length);
  const poses: number = posesFlag > 0 ? posesFlag : Math.max(...detected);
  if (poses < 1) {
    console.error("artprep: --strip n'a isolé aucune pose — lignes de sol mal détectées ?");
    process.exit(1);
  }
  const cut: StripRow[] = bands.map((b, i) => ({
    baseline: b.bottom,
    frames: sliceRowInto(img, poses, ...rowRange(i)),
  }));
  if (cut.some(r => r.frames.length !== poses)) {
    console.error(`artprep: découpage incomplet (${cut.map(r => r.frames.length).join(", ")} contre ${poses} attendues).`);
    process.exit(1);
  }
  // Le retrait vient APRÈS le contrôle de complétude : il doit porter sur un
  // découpage sain, sinon `--drop 2` masquerait une rangée mal coupée.
  if (dropPosesFlag.size >= poses) {
    console.error(`artprep: --drop retirerait les ${poses} poses de chaque rangée.`);
    process.exit(1);
  }
  const rows: StripRow[] = dropPoses(cut, dropPosesFlag);
  // La convention du registre veut un profil tourné vers la DROITE (ADR-067) :
  // la marche vers la gauche en est le miroir. Un générateur qui dessine le
  // profil à gauche se corrige ici, pose par pose — retourner la bande entière
  // inverserait aussi l'ORDRE des poses, et le cycle marcherait à l'envers.
  // Sur une planche complète, le profil est la DEUXIÈME rangée (face, profil,
  // dos). Sur une planche à une seule rangée, cette rangée EST le profil — s'en
  // tenir à l'indice 1 y rendait le drapeau silencieusement inopérant, et le
  // sprite se retournait alors à l'envers en jeu.
  // Le miroir se décide POSE PAR POSE (ADR-069) : `--profile-left` couvre toute
  // la rangée de profil, `--mirror` désigne les cases isolées que le générateur
  // a dessinées à l'envers au milieu d'une rangée saine.
  const profileRow: number = bands.length >= 2 ? 1 : 0;
  const mirror: MirrorPredicate = (row: number, pose: number): boolean =>
    (profileLeft && row === profileRow) || mirrorCells.has(`${row}:${pose}`);
  const sheet: PackedStrip = packRows(img, rows, 2, mirror);
  packed = sheet;
  // Le cycle BOUGE-t-il ? Mesuré sur la planche empaquetée, avant réduction :
  // une planche peut être parfaitement découpée et ne contenir aucune marche
  // (ADR-072). Ce contrôle-là, l'œil l'a raté deux fois.
  cycleAlerts = cycleWarnings(cycleReport(sheet.sheet, sheet.cellW, sheet.rows, sheet.poses));
  cropped = `${sheet.sheet.width}x${sheet.sheet.height}`;
  // Chaque case est rééchantillonnée aux MÊMES dimensions exactes : un facteur
  // d'échelle appliqué case par case dériverait par arrondi, et Phaser
  // découperait de travers.
  const scale: number = Math.min(1, maxSide / sheet.cellH);
  const cw: number = Math.max(1, Math.round(sheet.cellW * scale));
  const chh: number = Math.max(1, Math.round(sheet.cellH * scale));
  const out: Uint8Array = new Uint8Array(cw * sheet.count * chh * 4);
  for (let i: number = 0; i < sheet.count; i++) {
    const cell: Rgba = { width: sheet.cellW, height: sheet.cellH, data: new Uint8Array(sheet.cellW * sheet.cellH * 4) };
    for (let y: number = 0; y < sheet.cellH; y++) {
      const s: number = (y * sheet.sheet.width + i * sheet.cellW) * 4;
      cell.data.set(sheet.sheet.data.subarray(s, s + sheet.cellW * 4), y * sheet.cellW * 4);
    }
    const small: Rgba = resample(cell, cw, chh);
    for (let y: number = 0; y < chh; y++) {
      out.set(small.data.subarray(y * cw * 4, (y + 1) * cw * 4), (y * cw * sheet.count + i * cw) * 4);
    }
  }
  img = { width: cw * sheet.count, height: chh, data: out };
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
  ...(asStrip ? [`  lignes de sol   ${bands.length} (${bands.map(b => b.bottom).join(", ")}), ${groundErased} px effacés`] : []),
  `  fond retiré     ${background} px`,
  `  poches fermées  ${holes.length} recensée(s)${fillHolesFlag ? `, ${holesPx} px bouchés` : " (--fill-holes pour les boucher)"}`,
  `  frange claire   ${fringe.removed} px en ${fringe.passes} passe(s)`,
  `  fragments       ${fragments.dropped} détaché(s) supprimé(s), ${fragments.droppedPx} px`,
  asStrip ? `  planche         ${cropped}, ${packed?.rows} direction(s) x ${packed?.poses} pose(s) = ${packed?.count} cases de ${packed?.cellW}x${packed?.cellH}` : `  rognage         ${cropped}`,
  // Dispersion des pieds autour de leur ligne de sol. Calculée depuis toujours
  // par `packRows`, elle n'était jamais montrée : une pose 3 px plus basse fait
  // tressauter la créature à chaque cycle, et rien ne le disait avant le jeu.
  ...(asStrip ? [`  écart au sol    ${packed?.baselineSpread} px entre la pose la plus haute et la plus basse`] : []),
  // Écart de TAILLE entre les poses. Sur une planche d'un bloc il est faible par
  // construction ; sur trois images générées séparément, c'est le premier signe
  // que le personnage a changé d'échelle d'une direction à l'autre (ADR-074).
  ...(asStrip ? [`  écart de taille ${packed?.heightSpread} px entre la pose la plus grande et la plus petite`] : []),
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
// La plus grosse poche mérite un œil : sur les planches vues jusqu'ici, une
// aisselle plafonne à ~400 px pour une image de 1024. Bien au-delà, c'est
// probablement une surface claire DESSINÉE — un crâne, une aile pâle — et la
// boucher ferait un trou.
const biggest: number = holes.reduce((m, h) => Math.max(m, h.size), 0);
if (fillHolesFlag && biggest > 2000) {
  console.warn(`  ⚠ poche de ${biggest} px bouchée : anormalement grande, vérifier qu'il n'y a pas de trou dans le dessin.`);
}
if (!fillHolesFlag && holes.length > 0) {
  console.warn(`  ⚠ ${holes.length} poche(s) de fond enfermée(s) — creux entre un bras et le torse, échancrure d'arme.`);
  console.warn("    Elles restent BLANCHES en jeu. Les regarder, puis relancer avec --fill-holes si c'est bien du fond.");
}
// Une créature qui change de taille selon la direction qu'elle prend. Le risque
// propre à la génération image par image (ADR-074) : chaque rangée est correcte
// isolément, et c'est leur RAPPORT qui cloche. Le seuil vaut un douzième de la
// hauteur de case — en deçà, l'écart se confond avec le jeu des poses.
const sizeSpread: number = packed?.heightSpread ?? 0;
if (packed !== null && sizeSpread > packed.cellH / 12) {
  console.warn(`  ⚠ ${sizeSpread} px d'écart de taille entre poses (${(sizeSpread / packed.cellH * 100).toFixed(0)} % de la case)`);
  console.warn(`    ${sources.length > 1 ? "Les sources n'ont pas la même échelle : régénérer en imposant la taille du personnage." : "Poses dessinées à des échelles différentes dans la source."}`);
}
// Le défaut le plus coûteux : une planche impeccable où la créature ne marche
// pas. Il survit à toutes les autres vérifications, et se voit seulement en jeu.
for (const w of cycleAlerts) {
  console.warn(`  ⚠ ${w}`);
}
if (remaining > 0) {
  console.warn(`  ⚠ ${remaining} px de bord encore clairs : le contour du sprite n'est pas noir partout.`);
}
