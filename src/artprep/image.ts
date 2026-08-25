// ============================================================
// artprep/image.ts — Opérations PURES sur une image RGBA (ADR-061).
//
// Cœur testable de la préparation des sprites : aucune E/S, aucune API Node,
// aucun Phaser. `cli.ts` lit et écrit les fichiers, `png.ts` encode et décode,
// ce module ne fait que transformer des pixels.
//
// Le contexte : Gemini livre un JPEG sur fond blanc, la compression crée un
// dégradé entre le contour noir et le fond, et le détourage laisse une frange
// claire tout autour du sujet. Cette frange survit à la réduction et donne un
// liseré blanc autour de chaque créature à l'écran.
// ============================================================

/** Image en mémoire : RGBA 8 bits non prémultiplié, ligne par ligne. */
export interface Rgba {
  width: number;
  height: number;
  data: Uint8Array;
}

/**
 * Luminance au-delà de laquelle un pixel de BORD est tenu pour un résidu de
 * détourage. Repose sur une propriété vraie de tout le bestiaire : le contour
 * d'un sprite est NOIR (cf. `docs/PROMPTS-GEMINI.md`). Un pixel clair qui touche
 * le vide n'est donc jamais du dessin.
 */
export const FRINGE_LUMA: number = 110;

/**
 * Garde-fou : au-delà, on préfère signaler que continuer.
 *
 * Ce n'est plus le compteur qui borne l'érosion mais `isFringe`, qui s'arrête au
 * dessin. Mesuré sur les sprites livrés, le décapage converge en 7 à 14 passes,
 * la première en retirant 95 % et les suivantes tombant à 1-2 px. Un plafond bas
 * ne protégeait de rien — il tronquait juste la fin de la frange.
 */
export const MAX_FRINGE_PASSES: number = 24;

/** En dessous, une composante détachée est une miette de sélection, pas un membre. */
export const MIN_FRAGMENT_PX: number = 64;

/** Luminance perceptuelle (Rec. 709) du pixel commençant à l'octet `i`. */
export function luma(data: Uint8Array, i: number): number {
  return 0.2126 * data[i]! + 0.7152 * data[i + 1]! + 0.0722 * data[i + 2]!;
}

/** Un pixel est de BORD s'il est visible et touche le vide — bord de l'image compris,
 *  sinon un sujet qui déborde du cadre garderait sa frange sur cette arête. */
export function isBorder(img: Rgba, x: number, y: number): boolean {
  const { width: w, height: h, data } = img;
  const p: number = y * w + x;
  if (data[p * 4 + 3] === 0) return false;
  return (x === 0 || data[(p - 1) * 4 + 3] === 0)
    || (x === w - 1 || data[(p + 1) * 4 + 3] === 0)
    || (y === 0 || data[(p - w) * 4 + 3] === 0)
    || (y === h - 1 || data[(p + w) * 4 + 3] === 0);
}

/** Écart de luminance minimal avec le dessin situé DERRIÈRE, pour qu'un pixel de
 *  bord soit tenu pour de la frange et non pour un trait clair du dessin. */
export const FRINGE_CONTRAST: number = 6;

/** Décalages des quatre voisins, et le pas vers l'intérieur qui leur fait face. */
const NEIGHBOURS: readonly (readonly [number, number])[] = [[-1, 0], [1, 0], [0, -1], [0, 1]];

/**
 * Ce pixel de bord est-il de la FRANGE, ou du dessin ?
 *
 * Être clair ne suffit pas. Une créature à la peau pâle ou à la lame claire a
 * des pixels clairs sur sa propre silhouette ; les décaper parce qu'ils sont
 * clairs ronge le dessin, couche après couche, sans jamais s'épuiser — mesuré
 * sur le troll et le chef de guerre, qui perdaient 400 à 650 px À CHAQUE PASSE
 * quand les autres sprites tombaient à zéro dès la deuxième.
 *
 * La frange est un DÉGRADÉ VERS LE FOND : elle est donc toujours plus claire que
 * ce qu'elle borde. On compare le pixel à ce qui se trouve juste DERRIÈRE lui,
 * du côté opposé au vide. Plus clair que tout ce qui est derrière → frange.
 * Aussi sombre ou plus → c'est le dessin, et l'érosion s'arrête là.
 */
export function isFringe(img: Rgba, x: number, y: number): boolean {
  const { width: w, height: h, data } = img;
  const p: number = y * w + x;
  const i: number = p * 4;
  const here: number = luma(data, i);
  if (here <= FRINGE_LUMA) return false;

  // Un pixel à la couleur du FOND est un résidu, quoi qu'il y ait derrière. Sans
  // ce cas, un halo blanc UNIFORME resterait : chacune de ses couches ressemble
  // à la suivante, donc aucune n'est « plus claire que ce qu'elle borde ». C'est
  // ce que produit une sélection dure sous Photoshop. `floodBackground` l'ôte
  // déjà en amont, mais `stripFringe` doit rester correcte seule.
  if (data[i]! >= BACKGROUND_MIN && data[i + 1]! >= BACKGROUND_MIN && data[i + 2]! >= BACKGROUND_MIN) {
    return true;
  }

  let behind: number = -1;
  for (const [dx, dy] of NEIGHBOURS) {
    const nx: number = x + dx;
    const ny: number = y + dy;
    const outside: boolean = nx < 0 || ny < 0 || nx >= w || ny >= h;
    if (!outside && data[(ny * w + nx) * 4 + 3] !== 0) continue; // ce voisin n'est pas le vide
    const bx: number = x - dx;
    const by: number = y - dy;
    if (bx < 0 || by < 0 || bx >= w || by >= h) continue;
    const q: number = by * w + bx;
    if (data[q * 4 + 3] === 0) continue;
    const l: number = luma(data, q * 4);
    if (l > behind) behind = l;
  }
  // Aucun pixel derrière : éclat isolé d'un ou deux pixels, jamais du dessin.
  if (behind < 0) return true;
  return here > behind + FRINGE_CONTRAST;
}

/**
 * Au-dessus, un pixel est tenu pour du FOND (le blanc sur lequel Gemini livre).
 * Volontairement haut : la compression JPEG dégrade le blanc au contact du
 * contour noir, et descendre le seuil ferait mordre le remplissage dans le
 * dessin. Ce qui reste de ce dégradé est ôté ensuite par `stripFringe`, dont
 * c'est exactement le rôle — les deux étapes se complètent.
 */
export const BACKGROUND_MIN: number = 236;

/**
 * Retire le fond par REMPLISSAGE depuis les bords de l'image. MUTE `img`.
 *
 * Depuis les bords, et non « tout pixel clair » : les zones claires ENFERMÉES
 * dans le dessin — un reflet sur une armure, un œil, une dent — ne sont pas
 * atteintes et survivent. C'est le piège classique du détourage par couleur, et
 * il avait déjà coûté une passe au projet (ADR-050, « la passe des poches
 * enfermées mangeait les reflets »).
 *
 * Sur une image DÉJÀ détourée, l'opération ne trouve aucun fond clair et ne
 * fait rien : inutile de la conditionner à un drapeau.
 */
export function floodBackground(img: Rgba, threshold: number = BACKGROUND_MIN): number {
  const { width: w, height: h, data } = img;
  const seen: Uint8Array = new Uint8Array(w * h);
  const stack: number[] = [];

  const isBackground = (p: number): boolean => {
    const i: number = p * 4;
    if (data[i + 3] === 0) return true;
    return data[i]! >= threshold && data[i + 1]! >= threshold && data[i + 2]! >= threshold;
  };
  const push = (p: number): void => {
    if (seen[p] === 1 || !isBackground(p)) return;
    seen[p] = 1;
    stack.push(p);
  };

  for (let x: number = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y: number = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }

  let removed: number = 0;
  while (stack.length > 0) {
    const p: number = stack.pop()!;
    if (data[p * 4 + 3] !== 0) { data[p * 4 + 3] = 0; removed++; }
    const px: number = p % w;
    const py: number = (p - px) / w;
    if (px > 0) push(p - 1);
    if (px < w - 1) push(p + 1);
    if (py > 0) push(p - w);
    if (py < h - 1) push(p + w);
  }
  return removed;
}

/**
 * Empile plusieurs images en une seule, alignées à gauche, fond blanc.
 *
 * Le générateur tient les quatre poses d'une rangée mais décroche sur douze
 * cases (ADR-074) : on lui en demande une direction à la fois, et c'est ici que
 * les morceaux se recollent. Chaque source portant sa propre ligne de sol, la
 * pile en compte une par rangée — exactement ce qu'attend la suite de la chaîne,
 * qui ne fait donc aucune différence avec une planche générée d'un bloc.
 *
 * Les largeurs sont complétées en BLANC et non en transparent : le détourage
 * part des bords et prendrait un remplissage transparent pour du dessin déjà
 * découpé, laissant une frange le long du raccord.
 */
export function stack(parts: readonly Rgba[]): Rgba {
  const width: number = Math.max(...parts.map(p => p.width));
  const height: number = parts.reduce((h, p) => h + p.height, 0);
  const out: Rgba = { width, height, data: new Uint8Array(width * height * 4).fill(255) };
  let y0: number = 0;
  for (const p of parts) {
    for (let y: number = 0; y < p.height; y++) {
      const src: number = y * p.width * 4;
      out.data.set(p.data.subarray(src, src + p.width * 4), ((y0 + y) * width) * 4);
    }
    y0 += p.height;
  }
  return out;
}

/** Une poche de fond ENFERMÉE dans le dessin : sa taille, sa boîte, sa graine. */
export interface Hole {
  size: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /**
   * Index d'un pixel de la poche, d'où la reparcourir pour la boucher.
   *
   * Une graine plutôt que la boîte englobante : deux poches voisines — les deux
   * échancrures d'un même fer de hache — se chevauchent en boîte, et boucher par
   * boîte effacerait la seconde sans qu'elle ait été recensée ni décidée.
   */
  seed: number;
}

/**
 * Recense les zones claires que `floodBackground` n'a pas pu atteindre.
 *
 * Ne MUTE RIEN, à dessein. Une aisselle — le creux entre un bras et le torse,
 * fermé par l'arme que la créature tient — est du fond, et le PO l'a signalée
 * sur les deux planches. Un reflet d'armure, un œil, une dent, l'échancrure
 * blanche d'un croissant de hache : ce sont les mêmes composantes pour
 * l'algorithme. Boucher automatiquement, c'est le piège d'ADR-050, où la passe
 * des poches enfermées mangeait les reflets.
 *
 * Le recensement sert donc deux usages : avertir l'opérateur qu'il y a quelque
 * chose à regarder, et alimenter `fillHoles` quand il a regardé et tranché.
 */
export function findHoles(img: Rgba, threshold: number = BACKGROUND_MIN): Hole[] {
  const { width: w, height: h, data } = img;
  const seen: Uint8Array = new Uint8Array(w * h);
  const holes: Hole[] = [];

  const isLight = (p: number): boolean => {
    const i: number = p * 4;
    if (data[i + 3] === 0) return false;   // déjà retiré : c'est le fond extérieur
    return data[i]! >= threshold && data[i + 1]! >= threshold && data[i + 2]! >= threshold;
  };

  for (let start: number = 0; start < w * h; start++) {
    if (seen[start] === 1 || !isLight(start)) continue;
    const stack: number[] = [start];
    seen[start] = 1;
    const hole: Hole = { size: 0, x0: w, y0: h, x1: 0, y1: 0, seed: start };
    while (stack.length > 0) {
      const p: number = stack.pop()!;
      const px: number = p % w;
      const py: number = (p - px) / w;
      hole.size++;
      if (px < hole.x0) hole.x0 = px;
      if (px > hole.x1) hole.x1 = px;
      if (py < hole.y0) hole.y0 = py;
      if (py > hole.y1) hole.y1 = py;
      const push = (q: number): void => {
        if (seen[q] === 1 || !isLight(q)) return;
        seen[q] = 1;
        stack.push(q);
      };
      if (px > 0) push(p - 1);
      if (px < w - 1) push(p + 1);
      if (py > 0) push(p - w);
      if (py < h - 1) push(p + w);
    }
    holes.push(hole);
  }
  return holes;
}

/**
 * Rend transparentes les poches recensées. MUTE `img`.
 *
 * À appeler AVANT `stripFringe` : ouvrir une poche découvre le dégradé JPEG qui
 * la bordait, et c'est au décapage de frange de l'ôter. Dans l'autre ordre, il
 * resterait un liseré clair au creux de chaque aisselle — le défaut d'origine
 * déplacé de quelques pixels.
 */
export function fillHoles(img: Rgba, holes: readonly Hole[], threshold: number = BACKGROUND_MIN): number {
  const { width: w, height: h, data } = img;
  const isLight = (p: number): boolean => {
    const i: number = p * 4;
    if (data[i + 3] === 0) return false;
    return data[i]! >= threshold && data[i + 1]! >= threshold && data[i + 2]! >= threshold;
  };
  let removed: number = 0;
  for (const hole of holes) {
    if (!isLight(hole.seed)) continue;
    const stack: number[] = [hole.seed];
    while (stack.length > 0) {
      const p: number = stack.pop()!;
      if (!isLight(p)) continue;
      data[p * 4 + 3] = 0;                 // efface AVANT d'empiler : sert de marquage
      removed++;
      const px: number = p % w;
      const py: number = (p - px) / w;
      if (px > 0) stack.push(p - 1);
      if (px < w - 1) stack.push(p + 1);
      if (py > 0) stack.push(p - w);
      if (py < h - 1) stack.push(p + w);
    }
  }
  return removed;
}

/** Résultat d'un décapage de frange. `saturated` = le plafond de passes a été
 *  atteint, donc l'érosion mordait peut-être encore le dessin : à inspecter. */
export interface FringeResult {
  removed: number;
  passes: number;
  saturated: boolean;
}

/**
 * Supprime la frange claire, par passes successives : ôter une couche en expose
 * une autre, la compression JPEG en produisant plusieurs d'affilée. MUTE `img`.
 */
export function stripFringe(img: Rgba, maxPasses: number = MAX_FRINGE_PASSES): FringeResult {
  const { width: w, height: h, data } = img;
  let removed: number = 0;
  for (let pass: number = 1; pass <= maxPasses; pass++) {
    const kill: number[] = [];
    for (let y: number = 0; y < h; y++) {
      for (let x: number = 0; x < w; x++) {
        const i: number = (y * w + x) * 4;
        if (data[i + 3] === 0) continue;
        if (isBorder(img, x, y) && isFringe(img, x, y)) kill.push(i);
      }
    }
    if (kill.length === 0) return { removed, passes: pass - 1, saturated: false };
    for (const i of kill) data[i + 3] = 0;
    removed += kill.length;
  }
  return { removed, passes: maxPasses, saturated: true };
}

/** Composantes connexes des pixels visibles, en 4-connexité, de la plus grande
 *  à la plus petite. Itératif : une récursion déborderait la pile sur 250 000 px. */
export function components(img: Rgba): number[][] {
  const { width: w, height: h, data } = img;
  const seen: Uint8Array = new Uint8Array(w * h);
  const out: number[][] = [];
  const stack: number[] = [];
  for (let s: number = 0; s < w * h; s++) {
    if (seen[s] === 1 || data[s * 4 + 3] === 0) continue;
    const pixels: number[] = [];
    stack.push(s);
    seen[s] = 1;
    while (stack.length > 0) {
      const p: number = stack.pop()!;
      pixels.push(p);
      const px: number = p % w;
      const py: number = (p - px) / w;
      if (px > 0) push(p - 1);
      if (px < w - 1) push(p + 1);
      if (py > 0) push(p - w);
      if (py < h - 1) push(p + w);
    }
    out.push(pixels);
  }
  function push(q: number): void {
    if (seen[q] === 1 || data[q * 4 + 3] === 0) return;
    seen[q] = 1;
    stack.push(q);
  }
  return out.sort((a, b) => b.length - a.length);
}

/** Composante détachée conservée parce qu'elle dépasse le seuil de miette :
 *  peut-être un membre légitimement séparé, peut-être un doublon à retirer. */
export interface KeptFragment {
  size: number;
}

export interface FragmentResult {
  dropped: number;
  droppedPx: number;
  kept: KeptFragment[];
}

/** Efface les composantes détachées plus petites que `minSize`. MUTE `img`. */
export function dropFragments(img: Rgba, minSize: number = MIN_FRAGMENT_PX): FragmentResult {
  const comps: number[][] = components(img);
  const kept: KeptFragment[] = [];
  let dropped: number = 0;
  let droppedPx: number = 0;
  for (const comp of comps.slice(1)) {
    if (comp.length >= minSize) {
      kept.push({ size: comp.length });
      continue;
    }
    for (const p of comp) img.data[p * 4 + 3] = 0;
    dropped++;
    droppedPx += comp.length;
  }
  return { dropped, droppedPx, kept };
}

/** Boîte englobante des pixels visibles. `null` si l'image est entièrement vide. */
export interface Box { x0: number; y0: number; x1: number; y1: number }

export function opaqueBox(img: Rgba): Box | null {
  const { width: w, height: h, data } = img;
  let x0: number = w, y0: number = h, x1: number = -1, y1: number = -1;
  for (let y: number = 0; y < h; y++) {
    for (let x: number = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] === 0) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

/**
 * Rogne les marges transparentes. Ce n'est pas cosmétique : `fitSquare` cale le
 * PLUS GRAND CÔTÉ sur la taille voulue (ADR-046), donc du vide dans le cadre
 * rapetisse le sprite d'autant à l'écran. Renvoie une NOUVELLE image.
 */
export function crop(img: Rgba): Rgba {
  const box: Box | null = opaqueBox(img);
  if (box === null) return img;
  const w: number = box.x1 - box.x0 + 1;
  const h: number = box.y1 - box.y0 + 1;
  const data: Uint8Array = new Uint8Array(w * h * 4);
  for (let y: number = 0; y < h; y++) {
    const src: number = ((y + box.y0) * img.width + box.x0) * 4;
    data.set(img.data.subarray(src, src + w * 4), y * w * 4);
  }
  return { width: w, height: h, data };
}

/**
 * Réintroduit un anticrénelage sur le bord. Un détourage à la baguette magique
 * produit un alpha BINAIRE, donc un contour en escalier ; l'alpha des pixels de
 * bord est moyenné sur leur voisinage 3×3.
 *
 * Leur COULEUR est reprise du voisin opaque le plus sombre — c'est-à-dire du
 * contour noir. Sans cela, adoucir un pixel de bord clair le rendrait simplement
 * translucide au lieu de le supprimer, et réintroduirait la frange qu'on vient
 * d'ôter. MUTE `img`.
 */
export function feather(img: Rgba): number {
  const { width: w, height: h, data } = img;
  const alpha: Uint8Array = new Uint8Array(w * h);
  for (let p: number = 0; p < w * h; p++) alpha[p] = data[p * 4 + 3]!;
  const next: Uint8Array = new Uint8Array(alpha);
  let touched: number = 0;
  for (let y: number = 0; y < h; y++) {
    for (let x: number = 0; x < w; x++) {
      const p: number = y * w + x;
      if (alpha[p] === 0 || !isBorder(img, x, y)) continue;
      let sum: number = 0;
      let count: number = 0;
      let darkest: number = -1;
      let darkestLuma: number = Number.POSITIVE_INFINITY;
      for (let dy: number = -1; dy <= 1; dy++) {
        for (let dx: number = -1; dx <= 1; dx++) {
          const nx: number = x + dx;
          const ny: number = y + dy;
          count++;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const q: number = ny * w + nx;
          sum += alpha[q]!;
          if (alpha[q] !== 255) continue;
          const l: number = luma(data, q * 4);
          if (l < darkestLuma) { darkestLuma = l; darkest = q; }
        }
      }
      next[p] = Math.round(sum / count);
      touched++;
      if (darkest >= 0) {
        data[p * 4] = data[darkest * 4]!;
        data[p * 4 + 1] = data[darkest * 4 + 1]!;
        data[p * 4 + 2] = data[darkest * 4 + 2]!;
      }
    }
  }
  for (let p: number = 0; p < w * h; p++) data[p * 4 + 3] = next[p]!;
  return touched;
}

/**
 * Réduit l'image pour que son plus grand côté vaille `target`, par moyenne de
 * boîte PRÉMULTIPLIÉE par l'alpha. Sans prémultiplication, les pixels
 * transparents (dont la couleur est arbitraire) tirent la moyenne et cernent le
 * sprite d'un halo sombre — exactement le défaut qu'on vient de corriger.
 * Renvoie une NOUVELLE image ; en deçà de `target`, renvoie l'originale.
 */
export function downscale(img: Rgba, target: number): Rgba {
  if (Math.max(img.width, img.height) <= target) return img;
  const scale: number = target / Math.max(img.width, img.height);
  return resample(img, Math.max(1, Math.round(img.width * scale)), Math.max(1, Math.round(img.height * scale)));
}

/**
 * Rééchantillonne vers des dimensions EXACTES, par moyenne de boîte prémultipliée.
 *
 * Séparé de `downscale` pour les planches de poses : leurs cases doivent toutes
 * finir à la même taille au pixel près, sinon Phaser découpe de travers. Un
 * facteur d'échelle appliqué case par case dériverait par arrondi.
 */
export function resample(img: Rgba, nw: number, nh: number): Rgba {
  const { width: w, height: h, data } = img;
  const out: Uint8Array = new Uint8Array(nw * nh * 4);
  for (let y: number = 0; y < nh; y++) {
    for (let x: number = 0; x < nw; x++) {
      const x0: number = Math.floor(x * w / nw);
      const x1: number = Math.max(x0 + 1, Math.floor((x + 1) * w / nw));
      const y0: number = Math.floor(y * h / nh);
      const y1: number = Math.max(y0 + 1, Math.floor((y + 1) * h / nh));
      let r: number = 0, g: number = 0, b: number = 0, a: number = 0, n: number = 0;
      for (let sy: number = y0; sy < y1; sy++) {
        for (let sx: number = x0; sx < x1; sx++) {
          const i: number = (sy * w + sx) * 4;
          const al: number = data[i + 3]! / 255;
          r += data[i]! * al;
          g += data[i + 1]! * al;
          b += data[i + 2]! * al;
          a += data[i + 3]!;
          n++;
        }
      }
      const o: number = (y * nw + x) * 4;
      const meanAlpha: number = a / n / 255;
      out[o] = meanAlpha > 0 ? Math.round(r / n / meanAlpha) : 0;
      out[o + 1] = meanAlpha > 0 ? Math.round(g / n / meanAlpha) : 0;
      out[o + 2] = meanAlpha > 0 ? Math.round(b / n / meanAlpha) : 0;
      out[o + 3] = Math.round(a / n);
    }
  }
  return { width: nw, height: nh, data: out };
}

/** Nombre de pixels de bord encore clairs — 0 attendu après `stripFringe`.
 *  C'est le critère de recette du nettoyage, pas une statistique décorative. */
export function lightBorderCount(img: Rgba): number {
  let n: number = 0;
  for (let y: number = 0; y < img.height; y++) {
    for (let x: number = 0; x < img.width; x++) {
      if (!isBorder(img, x, y)) continue;
      if (luma(img.data, (y * img.width + x) * 4) > FRINGE_LUMA) n++;
    }
  }
  return n;
}
