// ============================================================
// balance/cli.ts — Point d'entrée du banc d'essai (ADR-018).
//
//   npm run balance                 rapport complet
//   npm run balance -- --chapter 3  pression + trace détaillée d'un chapitre
//   npm run balance -- --autoplay   les 3 politiques sur tous les chapitres
//   npm run balance -- --compo      chaque tour seule contre le mélange
//   npm run balance -- --no-hero    autoplay défense seule
//
// Seul fichier du dossier autorisé à écrire sur la sortie standard : tout le
// reste est pur et testable.
// ============================================================

import { CONTENT, UNLOCKS } from "../content/index";
import { autoplayAll, autoplayChapter, type Policy } from "./autoplay";
import {
  autoplayReport, chaptersReport, compositionReport, economyReport, enemiesReport,
  pressureReport, towersReport, waveTraceReport,
} from "./report";

/**
 * Surface Node déclarée localement plutôt qu'en tirant `@types/node`, qui
 * exposerait les globals Node à TOUT le projet : `core/` et `render/` n'ont
 * rien à faire avec le système de fichiers ou les process (ADR-001), et le
 * typecheck doit continuer à le leur refuser. Ce fichier est le seul point de
 * contact avec l'extérieur.
 */
declare const process: { argv: string[]; exit(code: number): never };

const argv: string[] = process.argv.slice(2);
const has = (flag: string) => argv.includes(flag);
const valueOf = (flag: string): string | undefined => {
  const i: number = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
};

const useHero: boolean = !has("--no-hero");
const chapterArg: string | undefined = valueOf("--chapter");
const out: string[] = [];

if (chapterArg !== undefined) {
  const index: number = Number.parseInt(chapterArg, 10) - 1;
  if (!Number.isInteger(index) || index < 0 || index >= CONTENT.chapters.length) {
    console.error(`Chapitre invalide : « ${chapterArg} » (attendu 1..${CONTENT.chapters.length})`);
    process.exit(1);
  }
  out.push(pressureReport(CONTENT, index));
  for (const policy of ["spread", "mixed", "focus"] as Policy[]) {
    out.push(waveTraceReport(autoplayChapter(CONTENT, index, { policy, useHero })));
  }
} else if (has("--compo")) {
  out.push(compositionReport(CONTENT, useHero));
} else if (has("--autoplay")) {
  for (const policy of ["spread", "mixed", "focus"] as Policy[]) {
    out.push(autoplayReport(autoplayAll(CONTENT, { policy, useHero })));
  }
} else {
  out.push(enemiesReport(CONTENT));
  out.push(towersReport(CONTENT));
  out.push(chaptersReport(CONTENT));
  out.push(economyReport(CONTENT, UNLOCKS));
  out.push(autoplayReport(autoplayAll(CONTENT, { policy: "mixed", useHero })));
}

console.log(out.join("\n"));
