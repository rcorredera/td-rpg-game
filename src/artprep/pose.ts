// ============================================================
// artprep/pose.ts — Squelette d'un cycle de marche (ADR-073).
//
// Cinq planches générées, cinq fois le même défaut : la même jambe devant d'un
// bout à l'autre, ou le personnage qui pivote au fil des cases. Le prompt a beau
// décrire les poses, le générateur ne les tient pas.
//
// Ce module les DESSINE. Un seul squelette, défini une fois dans l'espace, et
// trois PROJECTIONS — face, profil, dos. Les trois rangées montrent alors le
// même mouvement par construction, et non parce qu'on l'a demandé : c'est la
// différence entre une contrainte et un souhait.
//
// Repère : x vers la droite du personnage, y vers le HAUT, z dans la direction
// de la marche. L'origine est au sol, sous le bassin.
//
// PUR : aucun pixel, aucune dépendance. Le rendu est dans `mannequin.ts`.
// ============================================================

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Articulations d'une pose. Les paires sont indexées [gauche, droite] du point
 * de vue DU PERSONNAGE, jamais de celui du spectateur — c'est la convention des
 * prompts, et en changer ici ferait mentir la planche produite.
 */
export interface Joints {
  head: Vec3;
  /**
   * Bout du nez, seul repère d'orientation du gabarit.
   *
   * Sans lui, les rangées de FACE et de DOS sont exactement le même dessin, et
   * rien ne dit au générateur laquelle est laquelle. Il se voit au centre du
   * visage de face, dépasse à droite de profil, disparaît de dos : les trois
   * informations dont il a besoin, pour un seul trait.
   */
  nose: Vec3;
  neck: Vec3;
  pelvis: Vec3;
  shoulder: [Vec3, Vec3];
  elbow: [Vec3, Vec3];
  hand: [Vec3, Vec3];
  hip: [Vec3, Vec3];
  knee: [Vec3, Vec3];
  /** Cheville. */
  foot: [Vec3, Vec3];
  /** Bout du pied, en avant de la cheville : marque l'appui au sol. */
  toe: [Vec3, Vec3];
}

/** Proportions du mannequin, en unités de dessin. Silhouette cartoon : tête
 *  large, corps compact — c'est le gabarit du bestiaire (ADR-016). */
export const HEAD_R: number = 30;
export const HIP_Y: number = 96;
export const SHOULDER_Y: number = 168;
export const NECK_Y: number = 172;
export const HALF_SHOULDER: number = 34;
export const HALF_HIP: number = 20;
export const THIGH: number = 50;
export const SHIN: number = 46;
export const UPPER_ARM: number = 36;
export const FOREARM: number = 34;
export const FOOT: number = 22;
/** Main : une pièce à part, sinon elle serait dessinée au bout de l'avant-bras
 *  et le moteur ne pourrait plus la placer. */
export const HAND: number = 18;
/** Demi-épaisseur du pied : ce qui sépare la cheville du sol. */
export const FOOT_R: number = 9;
/** Longueur du nez, en avant du centre de la tête. */
export const NOSE: number = 30;

/** Nombre de poses du cycle. Quatre clés : contact, passage, contact inverse,
 *  passage inverse. Au-delà, un générateur interpole au lieu de créer. */
export const POSES: number = 4;

/**
 * Angles d'une pose, en degrés, comptés depuis la verticale et positifs vers
 * l'AVANT de la marche.
 *
 * `knee` est la flexion du genou, toujours vers l'arrière. `lift` marque le pied
 * décollé du sol : un cycle qui garde les deux pieds au sol en permanence
 * n'existe pas, et c'est ce qui distingue un passage d'un contact.
 */
interface Side {
  thigh: number;
  knee: number;
  arm: number;
  elbow: number;
  lift: boolean;
}

/**
 * Le cycle, décrit côté GAUCHE. Le côté droit est le même décalé de deux poses :
 * c'est la définition d'une marche, et l'écrire ainsi rend l'alternance
 * impossible à rater — le défaut qui a coulé les cinq planches précédentes.
 *
 * `arm` porte TOUJOURS le signe opposé à `thigh` : le bras d'un côté contre la
 * jambe du MÊME côté. Les avoir mis en phase aux poses de passage donnait un
 * balancier juste aux contacts et faux entre les deux — un défaut que l'œil ne
 * relève pas sur une image fixe.
 */
const LEFT: readonly Side[] = [
  { thigh: 30, knee: 4, arm: -25, elbow: 12, lift: false },   // contact, jambe gauche devant
  { thigh: -10, knee: 14, arm: 6, elbow: 16, lift: false },   // appui, la gauche pousse
  { thigh: -25, knee: 10, arm: 25, elbow: 12, lift: false },  // contact inverse, gauche derrière
  { thigh: 6, knee: 60, arm: -6, elbow: 16, lift: true },     // passage, la gauche remonte
];

/** Un demi-corps construit : les articulations d'un seul côté. */
interface Half {
  hip: Vec3;
  knee: Vec3;
  foot: Vec3;
  toe: Vec3;
  shoulder: Vec3;
  elbow: Vec3;
  hand: Vec3;
}

/** Angles du côté demandé pour une pose donnée. */
function sideAt(pose: number, right: boolean): Side {
  const i: number = ((right ? pose + 2 : pose) % POSES + POSES) % POSES;
  return LEFT[i]!;
}

/**
 * Écartement latéral supplémentaire de la jambe qui avance, en pixels.
 *
 * Physiquement, une marche se fait dans le plan sagittal et n'a pas de raison de
 * s'écarter. Mais en projection orthographique de FACE, une jambe avancée ne se
 * distingue que par son raccourci en `cos(angle)` — 13 px sur 96, presque rien.
 * Les cycles de marche 2D exagèrent donc l'écart latéral, et le gabarit doit
 * montrer ce qu'on attend du dessin, pas ce qu'exigerait l'anatomie.
 *
 * Tenu bien en deçà du demi-bassin : au-delà, la jambe avancée passerait de
 * l'autre côté du corps en vue de PROFIL, où `x` porte la profondeur, et
 * l'occlusion s'inverserait.
 */
export const SPLAY: number = 9;

/** Extrémité d'un segment partant de `from`, incliné de `deg` vers l'avant. */
function extend(from: Vec3, deg: number, len: number): Vec3 {
  const a: number = (deg * Math.PI) / 180;
  return { x: from.x, y: from.y - len * Math.cos(a), z: from.z + len * Math.sin(a) };
}

/**
 * Squelette d'une pose du cycle, pieds calés sur le sol.
 *
 * La hauteur du bassin n'est PAS une constante : au contact, les jambes écartées
 * rapprochent mécaniquement le bassin du sol. La fixer ferait flotter le pied
 * avant — exactement le défaut que le rendu ancre par les pieds ferait ressortir
 * (ADR-064). On construit donc autour du bassin, puis on translate pour poser le
 * pied le plus bas.
 */
export function walkPose(pose: number): Joints {
  const pelvis: Vec3 = { x: 0, y: HIP_Y, z: 0 };
  const build = (right: boolean): Half => {
    const s: Side = sideAt(pose, right);
    const sign: number = right ? 1 : -1;
    const hip: Vec3 = { x: sign * HALF_HIP, y: HIP_Y, z: 0 };
    const splay: number = sign * SPLAY * Math.sin((s.thigh * Math.PI) / 180);
    const knee0: Vec3 = extend(hip, s.thigh, THIGH);
    const knee: Vec3 = { x: knee0.x + splay, y: knee0.y, z: knee0.z };
    // Le genou plie vers l'ARRIÈRE : le tibia part de l'angle de la cuisse moins
    // la flexion. Ajouter la flexion casserait le genou dans le mauvais sens.
    const foot: Vec3 = extend(knee, s.thigh - s.knee, SHIN);
    // Le pied pointe vers l'avant de la marche et reste horizontal : un pied
    // aligné sur le tibia donnerait une pointe de danseur au lieu d'un appui.
    // Au passage, seul instant où il quitte le sol, il pointe vers le bas.
    const toe: Vec3 = { x: foot.x, y: foot.y - (s.lift ? FOOT * 0.5 : 0), z: foot.z + FOOT };
    const shoulder: Vec3 = { x: sign * HALF_SHOULDER, y: SHOULDER_Y, z: 0 };
    const elbow: Vec3 = extend(shoulder, s.arm, UPPER_ARM);
    const hand: Vec3 = extend(elbow, s.arm - s.elbow, FOREARM);
    return { hip, knee, foot, toe, shoulder, elbow, hand };
  };
  const l: Half = build(false);
  const r: Half = build(true);

  // Cale le DESSOUS du pied sur le sol, pas la cheville : sinon le pied dessiné
  // déborderait sous la ligne de sol, et le découpage la prendrait pour du corps.
  const lowest: number = Math.min(l.foot.y, r.foot.y) - FOOT_R;
  const drop = (p: Vec3): Vec3 => ({ x: p.x, y: p.y - lowest, z: p.z });
  return {
    head: drop({ x: 0, y: NECK_Y + HEAD_R * 0.9, z: 0 }),
    nose: drop({ x: 0, y: NECK_Y + HEAD_R * 0.75, z: NOSE }),
    neck: drop({ x: 0, y: NECK_Y, z: 0 }),
    pelvis: drop(pelvis),
    shoulder: [drop(l.shoulder), drop(r.shoulder)],
    elbow: [drop(l.elbow), drop(r.elbow)],
    hand: [drop(l.hand), drop(r.hand)],
    hip: [drop(l.hip), drop(r.hip)],
    knee: [drop(l.knee), drop(r.knee)],
    foot: [drop(l.foot), drop(r.foot)],
    toe: [drop(l.toe), drop(r.toe)],
  };
}

/** Les trois directions dessinées, dans l'ordre des rangées (ADR-067). */
export type View = "front" | "side" | "back";
export const VIEWS: readonly View[] = ["front", "side", "back"];

/** Point projeté à l'écran, plus sa profondeur vis-à-vis du spectateur. */
export interface Projected {
  x: number;
  y: number;
  /** Croissante VERS le spectateur : ce qui a la plus grande valeur est devant. */
  depth: number;
}

/**
 * Projection orthographique d'une articulation dans une vue.
 *
 * Orthographique et non perspective, à dessein : une jambe avancée y apparaît
 * naturellement raccourcie de `cos(angle)`, ce qui suffit à lire le mouvement de
 * face sans introduire de point de fuite dont le générateur n'aurait que faire.
 *
 * De FACE, le personnage marche vers le spectateur : ce qui avance en z est donc
 * plus PROCHE. De DOS il s'éloigne, et le rapport s'inverse — c'est ce qui fait
 * que la même pose s'occulte correctement dans les deux rangées.
 */
export function project(p: Vec3, view: View): Projected {
  switch (view) {
    case "front": return { x: p.x, y: p.y, depth: p.z };
    case "back": return { x: -p.x, y: p.y, depth: -p.z };
    case "side": return { x: p.z, y: p.y, depth: -p.x };
  }
}
