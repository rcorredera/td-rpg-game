// ============================================================
// artprep/png.ts — Décodeur / encodeur PNG minimal, RGBA 8 bits (ADR-061).
//
// Le projet n'embarque aucune bibliothèque d'image, et n'a pas à en embarquer
// une pour un outil qui tourne à la main quelques dizaines de fois. zlib suffit :
// le reste du format PNG tient en un déterrage de filtres par ligne.
//
// Limites assumées : 8 bits par canal, pas d'entrelacement. Photoshop et Gemini
// n'exportent ni l'un ni l'autre ; toute autre variante lève plutôt que de
// produire des pixels faux en silence.
// ============================================================

import type { Rgba } from "./image";

// `node:zlib` est typé localement dans `node.d.ts` : le projet n'embarque pas
// `@types/node` et n'a pas à l'embarquer (ADR-001).
import { deflateSync, inflateSync } from "node:zlib";

const SIGNATURE: readonly number[] = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Canaux par type de couleur PNG. 3 = palette (un octet d'index). */
const CHANNELS: Readonly<Record<number, number>> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

let crcTable: Int32Array | null = null;

function crc32(buf: Uint8Array): number {
  if (crcTable === null) {
    crcTable = new Int32Array(256);
    for (let n: number = 0; n < 256; n++) {
      let c: number = n;
      for (let k: number = 0; k < 8; k++) c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c;
    }
  }
  let c: number = -1;
  for (let i: number = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

/** Prédicteur Paeth (filtre 4 de la spec PNG). */
function paeth(a: number, b: number, c: number): number {
  const p: number = a + b - c;
  const pa: number = Math.abs(p - a);
  const pb: number = Math.abs(p - b);
  const pc: number = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function readU32(buf: Uint8Array, at: number): number {
  return ((buf[at]! << 24) | (buf[at + 1]! << 16) | (buf[at + 2]! << 8) | buf[at + 3]!) >>> 0;
}

export function decode(buf: Uint8Array): Rgba {
  for (let i: number = 0; i < SIGNATURE.length; i++) {
    if (buf[i] !== SIGNATURE[i]) throw new Error("artprep: ce fichier n'est pas un PNG");
  }
  let pos: number = 8;
  let width: number = 0, height: number = 0, colorType: number = 0;
  let palette: Uint8Array | null = null;
  let trns: Uint8Array | null = null;
  const idat: Uint8Array[] = [];
  while (pos + 8 <= buf.length) {
    const len: number = readU32(buf, pos);
    const type: string = String.fromCharCode(buf[pos + 4]!, buf[pos + 5]!, buf[pos + 6]!, buf[pos + 7]!);
    const data: Uint8Array = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      width = readU32(data, 0);
      height = readU32(data, 4);
      if (data[8] !== 8) throw new Error(`artprep: profondeur ${data[8]} non gérée (8 attendu)`);
      if (data[12] !== 0) throw new Error("artprep: PNG entrelacé non géré");
      colorType = data[9]!;
    } else if (type === "PLTE") palette = data.slice();
    else if (type === "tRNS") trns = data.slice();
    else if (type === "IDAT") idat.push(data.slice());
    else if (type === "IEND") break;
    pos += 12 + len;
  }
  const channels: number | undefined = CHANNELS[colorType];
  if (channels === undefined) throw new Error(`artprep: type de couleur ${colorType} non géré`);

  const merged: Uint8Array = new Uint8Array(idat.reduce((n, c) => n + c.length, 0));
  let at: number = 0;
  for (const c of idat) { merged.set(c, at); at += c.length; }
  const raw: Uint8Array = inflateSync(merged);

  // Déterrage : chaque ligne est préfixée de son numéro de filtre.
  const stride: number = width * channels;
  const px: Uint8Array = new Uint8Array(height * stride);
  let rp: number = 0;
  for (let y: number = 0; y < height; y++) {
    const filter: number = raw[rp]!;
    rp++;
    const rowStart: number = y * stride;
    const prevStart: number = (y - 1) * stride;
    for (let x: number = 0; x < stride; x++) {
      const a: number = x >= channels ? px[rowStart + x - channels]! : 0;
      const b: number = y > 0 ? px[prevStart + x]! : 0;
      const c: number = y > 0 && x >= channels ? px[prevStart + x - channels]! : 0;
      const v: number = raw[rp + x]!;
      px[rowStart + x] = (filter === 0 ? v
        : filter === 1 ? v + a
          : filter === 2 ? v + b
            : filter === 3 ? v + ((a + b) >> 1)
              : v + paeth(a, b, c)) & 0xff;
    }
    rp += stride;
  }

  const out: Uint8Array = new Uint8Array(width * height * 4);
  for (let i: number = 0, n: number = width * height; i < n; i++) {
    const s: number = i * channels;
    const d: number = i * 4;
    if (colorType === 6) {
      out[d] = px[s]!; out[d + 1] = px[s + 1]!; out[d + 2] = px[s + 2]!; out[d + 3] = px[s + 3]!;
    } else if (colorType === 2) {
      out[d] = px[s]!; out[d + 1] = px[s + 1]!; out[d + 2] = px[s + 2]!; out[d + 3] = 255;
    } else if (colorType === 0) {
      out[d] = out[d + 1] = out[d + 2] = px[s]!; out[d + 3] = 255;
    } else if (colorType === 4) {
      out[d] = out[d + 1] = out[d + 2] = px[s]!; out[d + 3] = px[s + 1]!;
    } else {
      const idx: number = px[s]!;
      const p: number = idx * 3;
      out[d] = palette?.[p] ?? 0;
      out[d + 1] = palette?.[p + 1] ?? 0;
      out[d + 2] = palette?.[p + 2] ?? 0;
      out[d + 3] = trns !== null && idx < trns.length ? trns[idx]! : 255;
    }
  }
  return { width, height, data: out };
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out: Uint8Array = new Uint8Array(12 + data.length);
  out[0] = (data.length >>> 24) & 0xff;
  out[1] = (data.length >>> 16) & 0xff;
  out[2] = (data.length >>> 8) & 0xff;
  out[3] = data.length & 0xff;
  for (let i: number = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  const crc: number = crc32(out.subarray(4, 8 + data.length));
  out[8 + data.length] = (crc >>> 24) & 0xff;
  out[9 + data.length] = (crc >>> 16) & 0xff;
  out[10 + data.length] = (crc >>> 8) & 0xff;
  out[11 + data.length] = crc & 0xff;
  return out;
}

/**
 * Filtrage adaptatif : pour chaque ligne on essaie les 5 filtres PNG et on garde
 * celui dont la somme des écarts absolus est la plus faible (heuristique de la
 * spec). Écrire tout en filtre 0 coûte 4 à 5 fois le poids nécessaire sur un
 * sprite peint.
 */
function filterRows(img: Rgba): Uint8Array {
  const bpp: number = 4;
  const stride: number = img.width * bpp;
  const out: Uint8Array = new Uint8Array(img.height * (stride + 1));
  const candidate: Uint8Array = new Uint8Array(stride);
  const best: Uint8Array = new Uint8Array(stride);
  for (let y: number = 0; y < img.height; y++) {
    const rowStart: number = y * stride;
    const prevStart: number = (y - 1) * stride;
    let bestFilter: number = 0;
    let bestScore: number = Number.POSITIVE_INFINITY;
    for (let f: number = 0; f < 5; f++) {
      let score: number = 0;
      for (let x: number = 0; x < stride; x++) {
        const a: number = x >= bpp ? img.data[rowStart + x - bpp]! : 0;
        const b: number = y > 0 ? img.data[prevStart + x]! : 0;
        const c: number = y > 0 && x >= bpp ? img.data[prevStart + x - bpp]! : 0;
        const v: number = img.data[rowStart + x]!;
        const e: number = (f === 0 ? v
          : f === 1 ? v - a
            : f === 2 ? v - b
              : f === 3 ? v - ((a + b) >> 1)
                : v - paeth(a, b, c)) & 0xff;
        candidate[x] = e;
        score += e < 128 ? e : 256 - e;
      }
      if (score < bestScore) { bestScore = score; bestFilter = f; best.set(candidate); }
    }
    out[y * (stride + 1)] = bestFilter;
    out.set(best, y * (stride + 1) + 1);
  }
  return out;
}

export function encode(img: Rgba): Uint8Array {
  const ihdr: Uint8Array = new Uint8Array(13);
  ihdr[0] = (img.width >>> 24) & 0xff;
  ihdr[1] = (img.width >>> 16) & 0xff;
  ihdr[2] = (img.width >>> 8) & 0xff;
  ihdr[3] = img.width & 0xff;
  ihdr[4] = (img.height >>> 24) & 0xff;
  ihdr[5] = (img.height >>> 16) & 0xff;
  ihdr[6] = (img.height >>> 8) & 0xff;
  ihdr[7] = img.height & 0xff;
  ihdr[8] = 8;   // 8 bits par canal
  ihdr[9] = 6;   // RGBA
  const parts: Uint8Array[] = [
    new Uint8Array(SIGNATURE),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(filterRows(img), { level: 9 })),
    chunk("IEND", new Uint8Array(0)),
  ];
  const total: number = parts.reduce((n, p) => n + p.length, 0);
  const out: Uint8Array = new Uint8Array(total);
  let at: number = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}
