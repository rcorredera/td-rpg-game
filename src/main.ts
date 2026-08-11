// ============================================================
// main.ts — Bootstrap Phaser. Scale FIT : jouable desktop et mobile.
// ============================================================

import Phaser from "phaser";
import { LocalStorageSaveAdapter } from "./meta/save";
import { ProfileService } from "./meta/profile";
import { GameScene } from "./render/GameScene";
import { MenuScene } from "./render/MenuScene";
import { attachViewport, initialViewport, scaleFont, viewport } from "./render/viewport";

const profileSvc = new ProfileService(new LocalStorageSaveAdapter());

// Deux garanties appliquées à CHAQUE Text, au point de création plutôt qu'à
// chaque appel dispersé dans les scènes :
//
// 1. Netteté — rasterisation au zoom courant de la caméra, soit 1 texel par pixel
//    physique. Lu à la création (pas figé au boot) : après une rotation, les écrans
//    reconstruits repartent au bon facteur.
// 2. Lisibilité — l'échelle typographique est recalée en pixels RÉELS. Les tailles
//    sont écrites en unités logiques, qui ne valent pas la même chose selon l'écran :
//    sur mobile paysage, un « 12px » tombait à ~7 px réels, illisible. `scaleFont`
//    remonte l'échelle en préservant la hiérarchie, et ne mord pas sur grand écran
//    (ADR-015).
const origText = Phaser.GameObjects.GameObjectFactory.prototype.text;
Phaser.GameObjects.GameObjectFactory.prototype.text = function (this: Phaser.GameObjects.GameObjectFactory, ...args: Parameters<typeof origText>) {
  const t = origText.apply(this, args);
  t.setResolution(Math.max(1, viewport().zoom));
  const asked = Number.parseFloat(String(t.style.fontSize));
  if (Number.isFinite(asked)) {
    const px = scaleFont(asked);
    if (px > asked) t.setFontSize(px);
  }
  return t;
};

// Les polices doivent être prêtes AVANT la création des scènes : Phaser rasterise
// chaque Text à la création — une police arrivée après donne le fallback figé.
async function loadFonts(): Promise<void> {
  try {
    const faces = [
      new FontFace("Cinzel", 'url("fonts/Cinzel.ttf")', { weight: "400 900" }),
      new FontFace("Alegreya", 'url("fonts/Alegreya.ttf")', { weight: "400 900" }),
    ];
    for (const f of await Promise.all(faces.map((f) => f.load()))) document.fonts.add(f);
  } catch {
    // Polices système en secours — le jeu reste jouable.
  }
}

void loadFonts().then(() => {
  const v0 = initialViewport();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    // Le framebuffer couvre la fenêtre ENTIÈRE, à la densité réelle du device : plus
    // de cadre 4:3 posé au milieu du noir, et 1 pixel de canvas = 1 pixel physique
    // (donc aucun étirement flou). Scale.NONE : c'est attachViewport qui pilote la
    // taille du canvas et son étirement CSS, y compris au resize/rotation (ADR-010).
    width: v0.canvasW,
    height: v0.canvasH,
    backgroundColor: "#1a140e",
    // Art Kenney TD = vectoriel lisse → filtrage LINEAR (pixelArt désactivé), échelles fractionnaires OK.
    scale: { mode: Phaser.Scale.NONE, autoCenter: Phaser.Scale.NO_CENTER },
    scene: [MenuScene, GameScene],
  });

  attachViewport(game);
  game.scene.start("menu", { profileSvc });

  // Hook debug : permet de piloter le jeu depuis la console (tests visuels automatisés).
  (window as unknown as { __game: Phaser.Game }).__game = game;
});
