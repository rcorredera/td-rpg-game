// ============================================================
// content/towers.ts — Catalogue des tours : coûts, paliers, spécialisations
// (ADR-003, extrait de `index.ts` par ADR-057).
// ============================================================

import type { TowerDef } from "../core/types";

export const TOWERS: Record<string, TowerDef> = {
  tower_archer: {
    id: "tower_archer", name: "Archerie",
    lore: "L'épine du Bastion. Une flèche, une cible — y compris ce qui vole.\nPolyvalente et bon marché : le socle de toute défense.",
    // Socle POLYVALENT : elle touche tout, donc elle paie sa polyvalence en
    // rendement. Quand elle était la meilleure en dégâts par pièce d'or ET la
    // seule anti-aérienne, il n'y avait aucune raison de construire autre chose
    // (mesuré : archerie seule 9 victoires sur 10, mélange 1 — ADR-020).
    costs: [70, 90, 130],
    levels: [
      { range: 130, damage: 11, fireRate: 1.4 },
      { range: 145, damage: 18, fireRate: 1.5 },
      { range: 160, damage: 28, fireRate: 1.7 },
    ],
    groundOnly: false, splashRadius: 0, requiresUnlock: null,
    // Niveau 4 : multi-cibles OU portée extrême (GDD §Spécialisations)
    specs: [
      {
        id: "spec_volley", name: "Salve", desc: "Tire sur 3 cibles à la fois",
        cost: 200, stats: { range: 175, damage: 40, fireRate: 1.8 }, multishot: 3,
      },
      {
        id: "spec_longbow", name: "Arc long", desc: "Portée immense, flèches lourdes",
        cost: 200, stats: { range: 290, damage: 70, fireRate: 1.5 },
      },
    ],
  },
  tower_catapult: {
    id: "tower_catapult", name: "Catapulte",
    lore: "Des rochers rendus à l'envoyeur, par-dessus les rangs.\nDévastatrice contre les groupes au sol — mais aveugle au ciel.",
    // Reine des GROUPES : lente et médiocre sur une cible isolée, dévastatrice
    // dès qu'il y a du monde. Son rayon décide de tout — à 55 il ne couvrait que
    // l'espacement d'un seul ennemi (~75 px entre deux spawns), donc elle payait
    // son coût de tour à zone en ne touchant qu'une cible (ADR-020).
    costs: [100, 120, 160],
    levels: [
      { range: 150, damage: 28, fireRate: 0.5 },
      { range: 165, damage: 45, fireRate: 0.55 },
      { range: 180, damage: 70, fireRate: 0.6 },
    ],
    groundOnly: true, splashRadius: 85, requiresUnlock: null,
    // Niveau 4 : frappe lourde lointaine OU zone incendiaire
    specs: [
      {
        id: "spec_trebuchet", name: "Trébuchet", desc: "Plus loin, plus fort, plus large",
        cost: 240, stats: { range: 245, damage: 140, fireRate: 0.4 }, splashRadius: 70,
      },
      {
        id: "spec_greekfire", name: "Feu grégeois", desc: "La zone brûle 3% PV max/s (4s)",
        cost: 240, stats: { range: 185, damage: 85, fireRate: 0.5 }, splashRadius: 80,
        burn: { pctMaxHpPerS: 0.03, durationS: 4 },
      },
    ],
  },
  tower_frost: {
    id: "tower_frost", name: "Tour de givre",
    lore: "Un éclat de faille scellé dans la pierre.\nNe tue presque rien, mais le froid gagne toutes les batailles.",
    // MULTIPLICATEUR : elle ne tue presque rien, elle allonge le temps que les
    // autres ont pour tuer. Son ralentissement ne valait rien tant qu'il visait
    // UNE cible à la fois — sur une vague de 50 ennemis, en freiner un seul ne
    // change aucune issue. Il s'applique désormais en zone (ADR-020).
    costs: [70, 90, 120],
    levels: [
      { range: 125, damage: 5, fireRate: 1.0 },
      { range: 135, damage: 8, fireRate: 1.1 },
      { range: 145, damage: 12, fireRate: 1.2 },
    ],
    groundOnly: false, splashRadius: 70,
    slow: { factor: 0.45, duration: 2.2 },
    // Disponible d'emblée (ADR-024). Elle était verrouillée derrière un achat, ce
    // qui rendait le chapitre 1 très rude sans elle — et un joueur qui n'y arrive
    // pas ne gagne pas de quoi la débloquer. Le triangle de rôles n'a de sens que
    // si ses trois côtés sont posables dès la première partie.
    requiresUnlock: null,
    // Niveau 4 : aura de zone OU givre qui brûle
    specs: [
      {
        id: "spec_blizzard", name: "Blizzard", desc: "Aura de givre continue (ralentit + dégâts), ne tire plus",
        cost: 220, stats: { range: 0, damage: 0, fireRate: 0 },
        // Rayon relevé (170→200) : à 170 l'aura ne couvrait guère plus que la
        // portée d'une Archerie de base (130-160) alors que la tour renonce à
        // TOUT dégât de tir pour ce rôle — le sacrifice n'était pas assez payé.
        // `dps` plat (armure normale) et non en % PV max : un chip damage
        // léger, pas une brûlure — ce rôle-là reste à Givre ardent (`burn`).
        // Les deux bornés par le garde-fou d'ADR-024 : le chapitre 10 doit
        // rester infranchissable sans la Forge, quelle que soit la stratégie
        // (vérifié par `autoplay.test.ts`).
        aura: { radius: 200, slowFactor: 0.35, dps: 3 }, slow: null,
      },
      {
        id: "spec_frostfire", name: "Givre ardent", desc: "Gèle ET brûle 2.5% PV max/s (4s)",
        cost: 220, stats: { range: 155, damage: 20, fireRate: 1.2 },
        burn: { pctMaxHpPerS: 0.025, durationS: 4 },
      },
    ],
  },
};
