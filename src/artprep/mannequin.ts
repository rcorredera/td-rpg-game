// ============================================================
// artprep/mannequin.ts — Rasterise la planche de poses de référence (ADR-073).
//
// Volontairement sans style : ni visage, ni équipement, ni couleur d'espèce. Ce
// n'est pas un sprite mais un GABARIT, et tout détail qu'on y mettrait serait un
// détail que le générateur recopierait au lieu d'inventer le monstre.
//
// PUR : rend un tampon RGBA, n'écrit aucun fichier.
// ============================================================

import { type Rgba } from "./image";
import {
  FOOT, FOOT_R, FOREARM, HAND, HEAD_R, HIP_Y, type Joints, NECK_Y, NOSE, POSES, project,
  type Projected, SHIN, THIGH, UPPER_ARM, type Vec3, type View, VIEWS, walkPose,
} from "./pose";

/** Une case de la planche. Assez grande pour que le générateur lise la pose. */
export const CELL_W: number = 256;
export const CELL_H: number = 288;
/** Marge sous les pieds : la ligne de sol s'y trace. */
export const GROUND_PAD: number = 14;

/** Épaisseur des membres, en pixels de rayon. */
const LIMB_R: number = 13;
const TORSO_R: number = 26;
const OUTLINE: number = 4;

const INK: readonly [number, number, number] = [24, 24, 28];
/** Membre le plus PROCHE du spectateur. */
const NEAR: readonly [number, number, number] = [214, 214, 220];
/**
 * Membre le plus ÉLOIGNÉ, assombri.
 *
 * Sans ce contraste, deux jambes de la même teinte vues de profil sont
 * indiscernables et rien ne dit laquelle est devant — précisément l'information
 * que les planches générées ne portaient pas. C'est la convention de tous les
 * cycles de marche dessinés.
 */
const FAR: readonly [number, number, number] = [138, 138, 148];

function put(img: Rgba, x: number, y: number, c: readonly [number, number, number]): void {
  if (x < 0 || y < 0 || x >= img.width || y >= img.height) return;
  const i: number = (y * img.width + x) * 4;
  img.data[i] = c[0];
  img.data[i + 1] = c[1];
  img.data[i + 2] = c[2];
  img.data[i + 3] = 255;
}

/** Distance d'un point au segment [a,b], au carré. */
function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx: number = bx - ax;
  const dy: number = by - ay;
  const len: number = dx * dx + dy * dy;
  const t: number = len === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len));
  const qx: number = ax + t * dx;
  const qy: number = ay + t * dy;
  return (px - qx) * (px - qx) + (py - qy) * (py - qy);
}

/** Capsule pleine entre deux points. MUTE `img`. */
export function capsule(img: Rgba, a: Projected, b: Projected, r: number, c: readonly [number, number, number]): void {
  const x0: number = Math.floor(Math.min(a.x, b.x) - r);
  const x1: number = Math.ceil(Math.max(a.x, b.x) + r);
  const y0: number = Math.floor(Math.min(a.y, b.y) - r);
  const y1: number = Math.ceil(Math.max(a.y, b.y) + r);
  for (let y: number = y0; y <= y1; y++) {
    for (let x: number = x0; x <= x1; x++) {
      if (distToSegment(x, y, a.x, a.y, b.x, b.y) <= r * r) put(img, x, y, c);
    }
  }
}

/** Un segment de membre : ses deux bouts à l'écran et sa profondeur moyenne. */
interface Bone {
  a: Projected;
  b: Projected;
  r: number;
  depth: number;
}

function bone(from: Vec3, to: Vec3, view: View, r: number, ox: number, oy: number): Bone {
  const a: Projected = place(project(from, view), ox, oy);
  const b: Projected = place(project(to, view), ox, oy);
  return { a, b, r, depth: (a.depth + b.depth) / 2 };
}

/** Passe du repère du squelette (y vers le haut, sol à 0) à celui de l'image. */
function place(p: Projected, ox: number, oy: number): Projected {
  return { x: ox + p.x, y: oy - p.y, depth: p.depth };
}

/**
 * Dessine une pose dans la case dont le coin haut-gauche est (ox, oy).
 *
 * Les os sont triés par profondeur et peints du plus LOINTAIN au plus proche :
 * c'est ce qui fait qu'une jambe en masque une autre, et donc qu'on voit
 * laquelle est devant. Peindre dans l'ordre anatomique donnerait des occlusions
 * fausses une pose sur deux.
 */
export function drawPose(img: Rgba, j: Joints, view: View, ox: number, oy: number): void {
  const bones: Bone[] = [
    bone(j.hip[0], j.knee[0], view, LIMB_R, ox, oy),
    bone(j.knee[0], j.foot[0], view, LIMB_R, ox, oy),
    bone(j.foot[0], j.toe[0], view, FOOT_R, ox, oy),
    bone(j.hip[1], j.knee[1], view, LIMB_R, ox, oy),
    bone(j.knee[1], j.foot[1], view, LIMB_R, ox, oy),
    bone(j.foot[1], j.toe[1], view, FOOT_R, ox, oy),
    bone(j.shoulder[0], j.elbow[0], view, LIMB_R - 2, ox, oy),
    bone(j.elbow[0], j.hand[0], view, LIMB_R - 3, ox, oy),
    bone(j.shoulder[1], j.elbow[1], view, LIMB_R - 2, ox, oy),
    bone(j.elbow[1], j.hand[1], view, LIMB_R - 3, ox, oy),
  ];
  const torso: Bone = bone(j.pelvis, j.neck, view, TORSO_R, ox, oy);
  const head: Bone = bone(j.head, j.head, view, HEAD_R, ox, oy);
  // Le nez part du centre de la tête : sa moitié arrière est donc toujours
  // enfouie dans le crâne, et seule la pointe dépasse — de face au centre du
  // visage, de profil sur le côté, de dos pas du tout. C'est ce qui distingue
  // la rangée de face de celle de dos, sans rien dessiner de plus.
  const nose: Bone = bone(j.head, j.nose, view, 9, ox, oy);

  // Le torse et la tête sont à profondeur nulle : les membres qui passent
  // derrière eux doivent être peints avant, ceux qui passent devant après.
  const all: Bone[] = [...bones, torso, head].sort((p, q) => p.depth - q.depth);
  for (const b of all) capsule(img, b.a, b.b, b.r + OUTLINE, INK);
  for (const b of all) capsule(img, b.a, b.b, b.r, b.depth < -0.5 ? FAR : NEAR);
  // Le nez se peint APRÈS tout le reste et en ENCRE, pas en teinte de membre :
  // vu de face il est entièrement contenu dans la tête, et de la couleur du
  // crâne il y serait invisible — exactement la rangée où le repère manquerait.
  // De dos il reste derrière la tête, donc caché, ce qui est le but.
  // En PROFIL le nez est dans le plan médian, donc à profondeur nulle : exiger
  // une profondeur strictement positive le faisait disparaître de la seule vue
  // où il dépasse vraiment.
  if (nose.depth >= 0) capsule(img, nose.a, nose.b, 9, INK);
}

/**
 * Planche complète : trois vues × quatre poses, sur fond blanc, chaque rangée
 * posée sur sa ligne de sol.
 *
 * Le format est celui qu'attend `npm run sprite -- --strip` : c'est la même
 * planche que celle demandée au générateur, ce qui permet de la passer dans la
 * chaîne pour vérifier qu'elle s'y découpe bien.
 */
export function mannequinSheet(only?: View): Rgba {
  // Une seule direction à la fois, sur demande : le générateur tient les quatre
  // poses d'une rangée mais décroche sur douze cases — mesuré, il rend alors un
  // profil à deux poses dupliquées et un dos immobile (ADR-074).
  const rows: readonly View[] = only === undefined ? VIEWS : [only];
  const width: number = CELL_W * POSES;
  const height: number = CELL_H * rows.length;
  const img: Rgba = { width, height, data: new Uint8Array(width * height * 4).fill(255) };

  rows.forEach((view, row) => {
    const baseline: number = (row + 1) * CELL_H - GROUND_PAD;
    for (let pose: number = 0; pose < POSES; pose++) {
      drawPose(img, walkPose(pose), view, pose * CELL_W + CELL_W / 2, baseline);
    }
    // Ligne de sol : continue d'un bord à l'autre, comme l'exige `--strip`.
    for (let x: number = 0; x < width; x++) put(img, x, baseline, [120, 120, 128]);
  });
  return img;
}


/**
 * Grossissement des pièces sur leur planche.
 *
 * Les proportions RELATIVES sont conservées — une tête reste deux fois plus
 * large qu'une cuisse. C'est ce qui permet au générateur de dessiner des pièces
 * qui iront ensemble ; les mettre chacune à la taille de sa case donnerait un
 * personnage aux membres dépareillés une fois assemblé.
 */
const PIECE_SCALE: number = 2;

/** Segment vertical centré dans sa case. Une pièce se range à PLAT, jamais dans
 *  une pose : c'est le moteur qui l'inclinera (piste des pièces détachées, non tranchée). */
function upright(img: Rgba, cx: number, cy: number, len: number, r: number): void {
  const half: number = len / 2;
  const a: Projected = { x: cx, y: cy - half, depth: 0 };
  const b: Projected = { x: cx, y: cy + half, depth: 0 };
  capsule(img, a, b, r + OUTLINE, INK);
  capsule(img, a, b, r, NEAR);
}

/** Tête vue sous un angle : un disque, plus le nez qui donne l'orientation. */
function headPiece(img: Rgba, cx: number, cy: number, view: View): void {
  const r: number = HEAD_R * PIECE_SCALE;
  const c: Projected = { x: cx, y: cy, depth: 0 };
  capsule(img, c, c, r + OUTLINE, INK);
  capsule(img, c, c, r, NEAR);
  if (view === "back") return;                       // de dos, le nez est caché
  const reach: number = NOSE * PIECE_SCALE;
  const tip: Projected = view === "side"
    ? { x: cx + reach, y: cy - r * 0.25, depth: 0 }   // de profil, il dépasse
    : { x: cx, y: cy - r * 0.25, depth: 0 };          // de face, il reste au centre
  capsule(img, { x: cx, y: cy - r * 0.25, depth: 0 }, tip, 9 * PIECE_SCALE * 0.6, INK);
}

/**
 * Planche de PIÈCES DÉTACHÉES : ce qu'il faut dessiner pour qu'un moteur
 * assemble lui-même toutes les poses (piste des pièces détachées, non tranchée).
 *
 * Trois têtes et trois torses — un par direction, les seules pièces dont
 * l'aspect change avec l'angle —, puis quatre membres réutilisés partout. Le
 * générateur n'a plus rien à savoir du mouvement : il dessine des objets à plat,
 * ce qu'il réussit. Le cycle vient de `pose.ts`, qui est testé.
 *
 * Les deux côtés du corps ne sont pas demandés : le rendu réutilise la même
 * pièce à gauche et à droite en assombrissant celle qui s'éloigne. Cela divise
 * par deux ce qu'il faut dessiner et supprime le risque qu'un bras gauche et un
 * bras droit ne se ressemblent pas.
 */
export function piecesSheet(): Rgba {
  const cols: number = 4;
  const rows: number = 4;
  const width: number = CELL_W * cols;
  const height: number = CELL_H * rows;
  const img: Rgba = { width, height, data: new Uint8Array(width * height * 4).fill(255) };
  const cx = (col: number): number => col * CELL_W + CELL_W / 2;
  const cy = (row: number): number => row * CELL_H + CELL_H / 2;

  VIEWS.forEach((view, col) => {
    headPiece(img, cx(col), cy(0), view);
    upright(img, cx(col), cy(1), (NECK_Y - HIP_Y) * PIECE_SCALE, TORSO_R * PIECE_SCALE);
  });

  // Six membres, pas quatre : `drawPose` peint aussi les PIEDS, et une main se
  // distingue d'un avant-bras. Les omettre imposerait un second tour de
  // génération au PO pour les pièces manquantes, après coup.
  const limbs: readonly [number, number][] = [
    [UPPER_ARM, LIMB_R - 2],
    [FOREARM, LIMB_R - 3],
    [HAND, LIMB_R - 3],
    [THIGH, LIMB_R],
    [SHIN, LIMB_R],
    [FOOT, FOOT_R],
  ];
  limbs.forEach(([len, r], i) => {
    const col: number = i % cols;
    const row: number = 2 + Math.floor(i / cols);
    upright(img, cx(col), cy(row), len * PIECE_SCALE, r * PIECE_SCALE);
  });
  return img;
}
