// ============================================================
// artprep/node.d.ts — Surface Node déclarée localement (ADR-061).
//
// Le projet n'embarque pas `@types/node`, et ne doit pas : cela exposerait les
// globals Node à TOUT `src/`, alors que `core/` et `render/` n'ont rien à faire
// avec le système de fichiers (ADR-001). Le typecheck doit continuer à le leur
// refuser. Même parti pris que `balance/cli.ts`, qui déclare `process` sur place.
//
// Ces déclarations vivent dans un `.d.ts` SANS import ni export de premier
// niveau : c'est ce qui en fait des déclarations ambiantes. Écrites dans un
// module (un fichier qui importe), TypeScript les lirait comme l'augmentation
// d'un module existant et refuserait de les résoudre.
//
// On ne déclare que ce qu'`artprep/` utilise réellement. Un jour où ce module
// aurait besoin d'autre chose, on l'ajoute ici — pas ailleurs.
// ============================================================

declare module "node:zlib" {
  export function inflateSync(buf: Uint8Array): Uint8Array;
  export function deflateSync(buf: Uint8Array, opts?: { level?: number }): Uint8Array;
}

declare module "node:fs" {
  export function readFileSync(path: string): Uint8Array;
  export function writeFileSync(path: string, data: Uint8Array): void;
}
