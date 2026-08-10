// ============================================================
// main.ts — Bootstrap Phaser. Scale FIT : jouable desktop et mobile.
// ============================================================

import Phaser from "phaser";
import { LocalStorageSaveAdapter } from "./meta/save";
import { ProfileService } from "./meta/profile";
import { GameScene } from "./render/GameScene";
import { MenuScene } from "./render/MenuScene";
import { RENDER_SCALE } from "./render/ui";

const profileSvc = new ProfileService(new LocalStorageSaveAdapter());

// Texte net : les Text sont rasterisés à la densité du device (sinon flou après upscale).
const origText = Phaser.GameObjects.GameObjectFactory.prototype.text;
Phaser.GameObjects.GameObjectFactory.prototype.text = function (this: Phaser.GameObjects.GameObjectFactory, ...args: Parameters<typeof origText>) {
  const t = origText.apply(this, args);
  t.setResolution(RENDER_SCALE * 1.5);
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
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    // Framebuffer à l'échelle réelle d'affichage — chaque scène recadre via setupCamera()
    // (coordonnées logiques 800×600). Voir ADR-009 : évite le flou d'étirement CSS de Scale.FIT.
    width: 800 * RENDER_SCALE,
    height: 600 * RENDER_SCALE,
    backgroundColor: "#1a140e",
    // Art Kenney TD = vectoriel lisse → filtrage LINEAR (pixelArt désactivé), échelles fractionnaires OK.
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [MenuScene, GameScene],
  });

  game.scene.start("menu", { profileSvc });

  // Hook debug : permet de piloter le jeu depuis la console (tests visuels automatisés).
  (window as unknown as { __game: Phaser.Game }).__game = game;
});
