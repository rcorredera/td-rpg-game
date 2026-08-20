// ============================================================
// Aucun `setTexture` nu sur un élément HABILLÉ.
//
// Ce test existe parce que le défaut était invisible au repos et frappait
// exactement au moment où le joueur touche l'écran.
//
// Phaser ne recalcule PAS les marges de découpe d'un nine-slice quand on lui
// change sa texture : `setTexture` remplace l'image et laisse les tranches de
// l'ancienne. Or les planches du pack ne composent pas toutes à la même taille —
// le bouton bleu au repos donne 52×52 avec 22 de marge, sa variante enfoncée
// 48×41 avec 22 et 16, parce qu'un bouton enfoncé est dessiné plus plat. Poser
// 22 de marge en haut ET en bas sur 41 px de texture fait se recouvrir les
// tranches : tout bouton virait au noir sous le doigt, au campement comme en jeu.
//
// Le correctif est un point d'entrée unique, `uiSkinSetTexture`, qui repose la
// texture ET ses marges. Ce test interdit la forme qui le contourne — sinon le
// prochain bouton écrit reproduira le bug, qui ne se voit qu'en tapant dessus.
//
// On lit la source plutôt que la scène : le défaut est une propriété du CODE.
// Même idiome que `layoutLiterals.test.ts` et `assets.integrity.test.ts`.
// ============================================================

import { describe, expect, it } from "vitest";

const SOURCES: Record<string, string> = import.meta.glob("/src/render/**/*.ts", {
  query: "?raw", import: "default", eager: true,
}) as Record<string, string>;

/**
 * Fichiers autorisés à appeler `setTexture` directement.
 *
 * - `uiSkin.ts` : c'est LUI le point d'entrée, il doit bien poser la texture.
 * - `EntityLayer.ts` : des sprites du monde, pas des nine-slice — un sprite n'a
 *   pas de marge de découpe, donc pas de piège.
 *
 * Allonger cette liste doit rester un acte délibéré : si l'objet visé est un
 * nine-slice habillé, la bonne réponse est `uiSkinSetTexture`, pas une dérogation.
 */
const DEROGATIONS: string[] = ["/src/render/skin/uiSkin.ts", "/src/render/EntityLayer.ts"];

describe("habillage : changement de texture", () => {
  it("ne pose aucune texture sans reposer ses marges", () => {
    const fautes: string[] = [];
    for (const [chemin, src] of Object.entries(SOURCES)) {
      if (DEROGATIONS.includes(chemin) || chemin.endsWith(".test.ts")) continue;
      src.split("\n").forEach((ligne, i) => {
        // Les lignes de commentaire parlent du piège, elles ne le commettent pas.
        if (/^\s*(?:\/\/|\*|\/\*)/.test(ligne)) return;
        if (/\.setTexture\s*\(/.test(ligne)) {
          fautes.push(`${chemin}:${i + 1} → ${ligne.trim().slice(0, 80)}`);
        }
      });
    }
    expect(fautes, "passer par uiSkinSetTexture : setTexture seul garde les marges de l'ancienne planche")
      .toEqual([]);
  });

  it("surveille bien les fichiers attendus", () => {
    // Un glob qui ne remonte rien rendrait le test ci-dessus vert et inutile.
    const surveilles: string[] = Object.keys(SOURCES).filter(
      f => !DEROGATIONS.includes(f) && !f.endsWith(".test.ts"));
    expect(surveilles).toContain("/src/render/GameScene.ts");
    expect(surveilles).toContain("/src/render/components/button.ts");
    expect(DEROGATIONS.every(f => f in SOURCES), "dérogation pour un fichier disparu").toBe(true);
  });
});
