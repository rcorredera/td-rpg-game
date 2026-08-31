# Gabarits de poses

Images de référence à joindre aux prompts de génération (ADR-073/074). Elles
montrent les poses au lieu de les décrire — le prompt seul n'y suffisait pas,
cinq planches sur cinq l'ont prouvé.

Versionnées ici, et non seulement produites à la demande, pour deux raisons :
[`PROMPTS-GEMINI.md`](../PROMPTS-GEMINI.md) les affiche en regard du prompt qui
les réclame, et le PO doit pouvoir les récupérer sans lancer de commande.

| fichier | contenu | commande |
|---|---|---|
| `gabarit-profil.png` | 4 poses, vue de profil | `npm run mannequin -- <dst> --view side` |
| `gabarit-face.png` | 4 poses, vue de face | `npm run mannequin -- <dst> --view front` |
| `gabarit-dos.png` | 4 poses, vue de dos | `npm run mannequin -- <dst> --view back` |
| `gabarit-pieces.png` | 12 pièces détachées | `npm run mannequin -- <dst> --pieces` |

**Fichiers générés — ne pas les retoucher à la main.** Ils sortent de
`src/artprep/mannequin.ts`, lui-même adossé au squelette de `src/artprep/pose.ts`,
et toute correction doit passer par là sous peine d'être écrasée à la prochaine
exécution. C'est aussi ce qui garantit que le gabarit reste d'accord avec le
cycle que le jeu joue vraiment.

Comment les lire : le gris foncé marque le membre le plus éloigné du spectateur,
le trait noir sur la tête est le nez — donc l'orientation du visage —, et la
ligne grise horizontale est le sol.
