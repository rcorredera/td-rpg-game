// ============================================================
// Aucune ABSCISSE en dur dans les scènes.
//
// Ce test existe parce que la même erreur est revenue trois fois.
//
// Le monde est passé de 800×600 à 960×540 (ADR-027). Le centre `400` écrit en dur
// à une vingtaine d'endroits a survécu au changement et décalait tout l'écran de
// menu — corrigé alors en dérivant le centre de `WORLD_W`. Mais les abscisses
// SATELLITES de ce centre, elles, sont restées : `120`, `170`, `500`, `680` pour
// les colonnes des Chroniques, `110 + artW` pour le texte des fiches du Bestiaire,
// `412` pour la pastille des Failles. Le panneau des Chroniques va de 180 à 780 —
// le rang « #1 » était donc posé 60 unités HORS de son panneau, et le libellé sur
// sa volute d'angle. Personne ne l'a vu tant que les panneaux étaient des aplats
// sombres sans bord dessiné ; l'habillage ouvragé (ADR-030) l'a rendu criant.
//
// Une abscisse se DÉRIVE toujours — de `WORLD_W`, de `viewport()`, ou de la boîte
// qui la contient. Un test qui ne garde qu'un cas particulier ne garde rien : ici
// on interdit la forme entière.
//
// On lit la source plutôt que la scène : monter Phaser demanderait un DOM, et le
// défaut est une propriété du CODE, pas de l'exécution. Même idiome que
// `assets.integrity.test.ts`.
// ============================================================

import { describe, expect, it } from "vitest";

const SOURCES = import.meta.glob("/src/render/*Scene.ts", {
  query: "?raw", import: "default", eager: true,
}) as Record<string, string>;

/**
 * Premier argument d'un `add.text(` / `add.image(` / `uiChip(scene, `.
 *
 * Seuil à 100 : en deçà, un littéral est un décalage local (`0`, `8`, `-40`)
 * relatif à un conteneur, pas une position d'écran. Au-delà, c'est forcément une
 * coordonnée du monde — donc une valeur qui devait être dérivée.
 */
const ABSCISSE_EN_DUR = /(?:add\.(?:text|image)\(|ui(?:Chip|Panel|Button|Tile)\(\s*(?:this|scene)\s*,\s*)\s*(\d{3,})\s*,/g;

describe("mise en page des scènes", () => {
  it("ne pose aucune abscisse en dur", () => {
    const fautes: string[] = [];
    for (const [chemin, src] of Object.entries(SOURCES)) {
      const lignes = src.split("\n");
      lignes.forEach((ligne, i) => {
        for (const m of ligne.matchAll(ABSCISSE_EN_DUR)) {
          fautes.push(`${chemin}:${i + 1} → « ${m[1]} » (${ligne.trim().slice(0, 70)})`);
        }
      });
    }
    expect(fautes, "abscisses en dur : les dériver de WORLD_W, viewport() ou de la boîte parente")
      .toEqual([]);
  });

  it("surveille bien les fichiers attendus", () => {
    // Un glob qui ne remonte rien rendrait le test ci-dessus vert et inutile.
    expect(Object.keys(SOURCES).sort()).toEqual([
      "/src/render/GameScene.ts",
      "/src/render/MenuScene.ts",
    ]);
  });
});
