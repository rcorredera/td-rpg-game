// ============================================================
// eslint.config.js — Formalise les conventions de typage du projet
// (.ai/conventions.md) : typage explicite, pas d'échappatoire au
// système de types, pas de code mort.
// ============================================================
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", "public/**"] },
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    rules: {
      "prefer-const": "error",
      "no-var": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": "error",
      // Interdit `(x as { champ?: T })` pour étendre un objet à la volée :
      // le champ doit être déclaré sur son type réel (cf. `ShotFx.hit`).
      "@typescript-eslint/consistent-type-assertions": ["error", {
        assertionStyle: "as",
        objectLiteralTypeAssertions: "never",
      }],
      // Règle dépréciée côté typescript-eslint (l'équipe recommande l'inférence),
      // activée ici sur demande explicite du projet : chaque `const`/`let` porte
      // son type (primitif ou interface), plutôt que de le laisser inférer.
      "@typescript-eslint/typedef": ["error", {
        variableDeclaration: true,
        variableDeclarationIgnoreFunction: true,
      }],
    },
  },
);
