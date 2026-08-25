// ============================================================
// artprep/mannequin.cli.ts — Écrit la planche de poses de référence (ADR-073).
//
//   npm run mannequin -- <destination>
//   npm run mannequin -- <destination> --view front | side | back
//
// Le fichier produit se donne à Gemini EN MÊME TEMPS que le prompt : il montre
// les poses au lieu de les décrire. Aucun nom d'asset n'est écrit ici avec son
// extension — `assets.integrity.test.ts` balaie tout `src/**/*.ts` et prendrait
// un exemple pour une texture manquante.
//
// Seul fichier de la paire autorisé à toucher au disque et à la sortie standard.
// ============================================================

import { type Rgba } from "./image";
import { CELL_H, CELL_W, mannequinSheet } from "./mannequin";
import { encode } from "./png";
import { POSES, type View, VIEWS } from "./pose";

// `node:fs` est typé localement dans `node.d.ts` (ADR-001).
import { writeFileSync } from "node:fs";

declare const process: { argv: string[]; exit(code: number): never };

const argv: string[] = process.argv.slice(2);
const dst: string | undefined = argv.filter((a) => !a.startsWith("--"))[0];

/** Une seule direction, plutôt que la planche entière (ADR-074). */
const viewIndex: number = argv.indexOf("--view");
const viewArg: string | undefined = viewIndex >= 0 ? argv[viewIndex + 1] : undefined;
if (viewArg !== undefined && !VIEWS.includes(viewArg as View)) {
  console.error(`--view attend ${VIEWS.join(" | ")}, reçu « ${viewArg} »`);
  process.exit(1);
}
const only: View | undefined = viewArg as View | undefined;
if (dst === undefined) {
  console.error("usage : npm run mannequin -- <destination> [--view front|side|back]");
  process.exit(1);
}

const sheet: Rgba = mannequinSheet(only);
writeFileSync(dst, encode(sheet));

console.log([
  `mannequin -> ${dst}`,
  `  planche         ${sheet.width}x${sheet.height}`,
  `  grille          ${only ? 1 : VIEWS.length} vue(s) x ${POSES} pose(s), cases de ${CELL_W}x${CELL_H}`,
  `  vues            ${only ?? VIEWS.join(", ")}`,
  "",
  "  À joindre au prompt comme image de référence : il montre les poses",
  "  au lieu de les décrire. Le membre le plus éloigné est assombri.",
].join("\n"));
