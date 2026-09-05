# Générateur de `docs/PROMPTS-GEMINI.md`

```bash
node tools/prompts/build.cjs
```

## Pourquoi un générateur

Chaque bloc du document doit être **autonome** : le PO en copie un seul, sans rien
assembler. Le préambule — style, format de planche, contraintes — est donc répété
à l'identique dans les dix-huit blocs de créature.

Répété, donc impossible à corriger à la main sans oublier une occurrence. Chaque
leçon tirée d'une génération ratée (ADR-068 à 072) a modifié ce préambule ; il en
viendra d'autres. Le générateur est ce qui garantit que la vingtième révision
atteint les dix-huit blocs.

**Ne jamais éditer `docs/PROMPTS-GEMINI.md` directement** : la prochaine
exécution écraserait la correction.

## Où toucher quoi

| ce qu'on veut changer | fichier |
|---|---|
| la description d'une créature | `data.cjs` |
| le format de planche, les contraintes, le style | `build.cjs` |
| la revue, les seuils, la table des drapeaux | `build.cjs` |
| les images de gabarit affichées dans le document | `docs/gabarits/` — voir son README |

En `.cjs` et non `.js` : le `package.json` déclare `"type": "module"`, et ce
script utilise `require`. Il vit hors de `src/` parce qu'il ne participe ni au
jeu ni à sa compilation — `npm run build` ne le voit pas.
