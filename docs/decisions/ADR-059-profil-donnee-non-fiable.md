# ADR-059 — Le profil est une donnée NON FIABLE, borné à l'entrée de la simulation

## Statut
Accepté (2026-08-20).

## Contexte

Le projet compte 217 assertions non-null (`x[i]!`) hors tests. Le chiffre à lui seul ne dit rien :
sous `noUncheckedIndexedAccess`, indexer un tableau dans une boucle bornée par sa propre longueur
oblige à une assertion, et c'est légitime — `path[i]!` dans `for (i < path.length)` ne peut pas
échouer.

En triant ces 217 par PROVENANCE de l'index plutôt qu'en les comptant, une famille se distingue :
celles dont l'index vient du **profil du joueur**. Le profil est chargé depuis `localStorage`. Il
peut donc avoir été écrit par une version antérieure du jeu, avoir survécu à une réduction du
content, ou avoir été modifié à la main dans la console du navigateur — pour un jeu web, cette
dernière hypothèse n'est pas théorique.

`normalize` (`meta/save.ts`) vérifie que les champs ont le bon TYPE, pas que leurs valeurs
désignent quelque chose :

```ts
whirlwind: typeof parsed.skills?.whirlwind === "number" ? parsed.skills.whirlwind : 1,
```

`99` est un nombre. Il traversait donc intact jusqu'à
`c.hero.skills.rally.levels[98]!.fireRateMult`, dans la phase de tir des tours.

**Défaut reproduit avant correction** : un profil portant `skills.rally: 99` fait planter la partie
au premier tir de tour — `TypeError: Cannot read properties of undefined (reading 'fireRateMult')`.
Pas au chargement, pas au menu : en pleine bataille, une fois les tours posées et la première vague
lancée. Aucun des 272 tests ne l'attrapait.

## Décision

**Les niveaux venus du profil sont bornés à `createRun`**, l'unique endroit où le profil entre dans
la simulation — pas à chacun des trois sites d'usage, qui augmenteront :

```ts
function clampSkillLevel(level: number | undefined, track: SkillTrack<unknown>): number {
  const n: number = Math.floor(level ?? 1);
  if (!Number.isFinite(n)) return 1;
  return Math.min(Math.max(1, n), track.levels.length);
}
```

**On borne, on ne réinitialise pas.** Ramener un niveau hors table à 1 « corrigerait » le crash en
dépouillant silencieusement un joueur de la progression qu'il a payée en Sceaux. Un niveau trop
haut retombe sur le palier MAXIMAL.

Les autres assertions ne sont pas touchées, et c'est délibéré. Elles se répartissent en deux
groupes qui ne posent pas le même problème :

- **index borné par une boucle** (`path[i]!`, `lengths[…]!`, `s.pendingSpawns[i]!`) : l'assertion
  est la seule façon d'exprimer un invariant que le compilateur ne voit pas. Les retirer
  demanderait des gardes mortes qui n'attraperaient jamais rien.
- **index venu du CONTENT** (`c.enemies[id]!`, `ch.map.paths[e.pathIndex]!`) : l'invariant est
  désormais garanti à la source par `content/integrity.test.ts` (PR #76), qui vérifie que tout
  identifiant cité désigne quelque chose. Le content est du code versionné, pas une entrée
  utilisateur : le garder au build est le bon niveau.

Le profil, lui, n'est ni l'un ni l'autre : c'est une donnée EXTERNE qui entre à l'exécution. D'où
un traitement différent.

## Conséquences

- `core/profileTrust.test.ts` garde la famille : les deux sorts × six valeurs aberrantes (`99`,
  `0`, `-3`, `1.5`, `NaN`, `Infinity`), sur une partie jouée jusqu'aux premiers TIRS — c'est là que
  le défaut frappait, pas au chargement.
- **Garde prouvé par mutation**, cinq fois : clamp retiré (3 tests tombent), borne haute supprimée,
  borne basse supprimée, réinitialisation au lieu de bornage, `NaN` non filtré. Chacune est
  détectée.
- Le test vérifie aussi qu'un niveau LÉGITIME traverse inchangé : une garde qui écraserait tout
  passerait les quatre premiers tests sans rien protéger.

## Alternatives écartées

- **Borner dans `normalize` (`meta/save.ts`)** : ce serait le plus tôt possible, mais `save.ts` n'a
  pas accès au `ContentPack` — et lui en donner un ferait dépendre la persistance du contenu, alors
  qu'ADR-002 la garde volontairement ignorante de ce qu'elle sérialise. `createRun` reçoit déjà les
  deux.
- **Rendre `normalize` plus strict en rejetant le profil entier** : écarté — un profil légèrement
  abîmé ferait perdre au joueur toute sa progression. Borner un champ coûte moins cher que jeter le
  reste.
- **Une passe sur les 217 assertions** : écarté. Le nombre est un symptôme, pas un problème. Le
  travail utile est de trier par provenance de l'index ; le faire sans ce tri produirait des
  centaines de gardes mortes et diluerait la vraie.
