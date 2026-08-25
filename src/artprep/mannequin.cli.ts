// ============================================================
// artprep/mannequin.cli.ts — Écrit la planche de poses de référence (ADR-073).
//
//   npm run mannequin -- <destination>
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
import { POSES, VIEWS } from "./pose";

// `node:fs` est typé localement dans `node.d.ts` (ADR-001).
import { writeFileSync } from "node:fs";

declare const process: { argv: string[]; exit(code: number): never };

const dst: string | undefined = process.argv.slice(2).filter((a) => !a.startsWith("--"))[0];
if (dst === undefined) {
  console.error("usage : npm run mannequin -- <destination>");
  process.exit(1);
}

const sheet: Rgba = mannequinSheet();
writeFileSync(dst, encode(sheet));

console.log([
  `mannequin -> ${dst}`,
  `  planche         ${sheet.width}x${sheet.height}`,
  `  grille          ${VIEWS.length} vue(s) x ${POSES} pose(s), cases de ${CELL_W}x${CELL_H}`,
  `  vues            ${VIEWS.join(", ")}`,
  "",
  "  À joindre au prompt comme image de référence : il montre les poses",
  "  au lieu de les décrire. Le membre le plus éloigné est assombri.",
].join("\n"));
