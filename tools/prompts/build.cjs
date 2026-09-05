// Génère docs/PROMPTS-GEMINI.md. Le préambule est le même dans chaque bloc, à
// dessein : le PO copie UN bloc, pas deux morceaux à assembler.
const fs = require("fs");
const D = require("./data.cjs");

const STYLE = [
  "Art de jeu vidéo cartoon fantasy : couleurs saturées avec modelé peint à l'intérieur des formes (volumes, ombres et lumières, jamais des aplats plats), épais contour NOIR uniforme sur tout le pourtour du personnage.",
  "Le contour extérieur est noir et rien d'autre : aucun liseré blanc, aucun halo, aucune bordure de découpe autour de la silhouette.",
  "Proportions stylisées, pas réalistes : tête surdimensionnée, corps compact.",
];


/**
 * Prompt d'UNE rangée, adossé au gabarit joint (ADR-073/074).
 *
 * C'est le format en vigueur, et le seul qui ait jamais produit une rangée de
 * face correcte.
 *
 * Réécrit en phrases courtes et règles numérotées après que le PO a jugé les
 * trois templates peu compréhensibles, y compris pour un humain — et a fait le
 * lien avec l'échec du générateur : un texte qu'on doit relire deux fois pour
 * le comprendre ne peut pas être suivi du premier coup par un modèle qui ne le
 * relit pas. Le prompt pour le DOS était en plus ABSENT : la version publiée
 * demandait de modifier soi-même le texte du prompt FACE (« remplacer telle
 * phrase par telle autre »). `ROW_PROMPT` génère maintenant les trois versions
 * complètes, sans manipulation de texte à la charge du PO.
 */
const VIEW_TEXT = {
  front: {
    lecture: "Vu de FACE : il marche droit vers toi.",
    tenue: "Il reste vu de FACE dans les 4 cases (jamais de profil, jamais de trois-quarts).",
  },
  side: {
    lecture: "Vu de PROFIL : il marche vers la droite de l'image.",
    tenue: "Il reste vu de PROFIL dans les 4 cases (toujours le même côté du corps, jamais l'autre).",
  },
  back: {
    lecture: "Vu de DOS : il s'éloigne de toi.",
    tenue: "Il reste vu de DOS dans les 4 cases (jamais de profil, jamais de trois-quarts).",
  },
};

/**
 * Prompt complet pour UNE vue. `chained` = deux images en entrée (le
 * personnage déjà dessiné + le gabarit de cette vue) plutôt qu'une seule.
 */
const ROW_PROMPT = (view, subject, chained) => {
  const v = VIEW_TEXT[view];
  return [
    chained ? "Tu donnes DEUX images." : "Voici une image de référence : un mannequin gris en 4 cases.",
    "",
    ...(chained ? [
      "IMAGE 1 : le personnage déjà dessiné, en 4 poses de marche. C'est LUI qu'il faut redessiner —",
      "mêmes couleurs, mêmes proportions, même équipement, même style de trait.",
      "",
      "IMAGE 2 : un mannequin gris en 4 cases qui montre les poses à prendre.",
      "",
    ] : []),
    (chained ? "L'image 2 ne" : "Elle ne") + " montre pas à quoi ressemble le personnage. Elle montre juste la",
    "position de ses bras et de ses jambes, case par case.",
    "",
    "Comment la lire :",
    "- " + v.lecture,
    "- Le gris plus foncé, c'est le bras ou la jambe le plus loin de toi — une ombre légère suffit à le montrer.",
    "- Le trait noir sur la tête, c'est le nez : juste un repère pour savoir où regarde le personnage.",
    "- La ligne grise horizontale, c'est le sol.",
    "",
    chained
      ? "TA TÂCHE : dessine le personnage de l'image 1, dans les poses de l'image 2."
      : "TA TÂCHE : dessine le personnage décrit plus bas, dans les 4 poses du mannequin.",
    "",
    "Règles, dans l'ordre d'importance :",
    "",
    "1. Copie exactement la pose de chaque case : mêmes angles de bras et de jambes, même jambe",
    "   en avant, même pied levé. Ne change rien à la pose.",
    "",
    chained
      ? [
        "2. Le personnage doit rester reconnaissable comme celui de l'image 1 : mêmes couleurs, mêmes",
        "   proportions, même équipement, même style de trait, et la même taille à l'écran (du sol au",
        "   sommet de la tête).",
      ].join("\n")
      : [
        "2. Le personnage est rigoureusement identique dans les 4 cases : mêmes couleurs, mêmes",
        "   proportions, même équipement. Seule la position des bras et des jambes change.",
      ].join("\n"),
    "",
    "3. " + v.tenue,
    "",
    "4. Une ligne de sol fine et grise, sous les pieds, traverse toute l'image sans interruption.",
    "",
    "5. Fond blanc uni. Pas de cadre, pas de grille visible, pas de texte, pas d'ombre portée au sol.",
    ...(chained ? [] : [
      "",
      "6. Le personnage peut être plus grand ou plus large que le mannequin : seule sa pose doit",
      "   correspondre, pas sa carrure.",
    ]),
    "",
    STYLE.join("\n"),
    "Chaque case doit rester lisible réduite à 50 px de haut.",
    "",
    ...(chained ? [] : ["Sujet : " + subject]),
  ].filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n").trim();
};

const SHEET = (subject) => [
  "Planche de sprites d'un personnage de jeu vidéo : UNE seule image organisée en TROIS RANGÉES et QUATRE COLONNES, soit douze cases.",
  "",
  "RÈGLE ABSOLUE 1 — LE PERSONNAGE NE CHANGE JAMAIS :",
  "- Exactement les mêmes couleurs dans les douze cases, teinte pour teinte. Aucune variation de saturation, de luminosité ou de nuance, même très légère.",
  "- Exactement les mêmes proportions, la même taille, le même équipement, les mêmes détails. Rien n'apparaît ni ne disparaît d'une case à l'autre.",
  "- Même éclairage partout, venant de la même direction.",
  "- Même style de trait et même épaisseur de contour dans les douze cases.",
  "- SEULE EXCEPTION autorisée : le membre le plus ÉLOIGNÉ du spectateur (bras ou jambe arrière) est peint dans une teinte légèrement plus sombre, comme dans tous les cycles de marche classiques. C'est ce qui permet de voir lequel des deux est devant.",
  "",
  "RÈGLE ABSOLUE 2 — LE PERSONNAGE NE TOURNE PAS :",
  "- À l'intérieur d'une rangée, l'angle de vue est rigoureusement identique d'une case à l'autre. Le personnage ne pivote pas, ne se tourne pas de trois-quarts, ne montre jamais l'autre côté de son corps.",
  "- Il ne tourne pas PROGRESSIVEMENT au fil des cases. La quatrième case est vue sous exactement le même angle que la première. Une rangée qui commence de face et finit de trois-quarts est un ÉCHEC.",
  "- Aucun saut, aucun accroupissement, aucune génuflexion, aucune torsion du buste, aucune pose d'attaque, aucune pose de repos.",
  "- Le sommet de la tête reste à la même hauteur dans les quatre cases d'une rangée : le personnage AVANCE, il ne monte ni ne descend.",
  "",
  "Chaque RANGÉE montre le même personnage sous un angle différent :",
  "- Rangée du HAUT : de FACE STRICTE dans les quatre cases. Les épaules restent parallèles au bord de l'image, le nez pointe vers le spectateur, on voit les deux côtés du visage à parts égales. Le personnage marche vers le spectateur, il ne s'éloigne jamais sur le côté.",
  "- Rangée du MILIEU : de PROFIL STRICT dans les quatre cases, marchant vers la DROITE de l'image. On voit exactement un seul côté du corps, jamais l'autre.",
  "- Rangée du BAS : de DOS STRICT dans les quatre cases, s'éloignant droit du spectateur. Les épaules restent parallèles au bord de l'image.",
  "",
  "Les trois rangées montrent LE MÊME cycle de marche, avec la MÊME amplitude de jambes. La rangée du BAS n'est pas une pose debout : c'est la même marche, vue de derrière.",
  "",
  "Chaque rangée contient QUATRE poses successives d'un même pas, de gauche à droite :",
  "1. CONTACT : cuisse GAUCHE en avant, environ 30 degrés devant la verticale ; cuisse DROITE en arrière, environ 25 degrés derrière. Les deux pieds posés au sol. Bras DROIT porté en avant, coude à demi plié, main à hauteur de hanche ; bras GAUCHE en arrière, presque tendu.",
  "2. PASSAGE : la jambe DROITE remonte et croise la gauche, genou droit plié à environ 60 degrés, pied droit nettement décollé du sol. Les deux jambes presque jointes. Les deux bras passent près du corps, à la verticale.",
  "3. CONTACT INVERSE : l'exact inverse de la pose 1. Cuisse DROITE en avant à 30 degrés, cuisse GAUCHE en arrière à 25 degrés, les deux pieds au sol. Bras GAUCHE porté en avant, bras DROIT en arrière.",
  "4. PASSAGE INVERSE : l'exact inverse de la pose 2. La jambe GAUCHE remonte et croise la droite, genou gauche plié, pied gauche nettement décollé.",
  "",
  "LES DEUX JAMBES ALTERNENT — c'est le point le plus important de la planche :",
  "- Aux poses 1 et 3, ce n'est PAS la même jambe qui est devant. La pose 3 est le miroir exact de la pose 1 quant aux jambes.",
  "- En vue de PROFIL, on doit voir laquelle des deux jambes est la plus proche du spectateur : elle masque partiellement l'autre, et l'autre est peinte plus sombre. Pose 1 : c'est la jambe GAUCHE qui est devant et masque la droite. Pose 3 : c'est la jambe DROITE qui est devant et masque la gauche.",
  "- Une rangée où la même jambe reste devant sur les quatre cases n'est pas une marche : c'est un balancement sur place, et c'est un ÉCHEC.",
  "- Même exigence de face et de dos : la jambe qui avance change à chaque pose de contact.",
  "",
  "BALANCIER DES BRAS — aucun bras immobile :",
  "- Le bras porté en avant est TOUJOURS celui du côté OPPOSÉ à la jambe portée en avant. C'est la règle du balancier, sans aucune exception dans les douze cases.",
  "- Aux poses de CONTACT, l'écart entre les deux mains est maximal.",
  "- Si le personnage tient une arme, le bras armé balance comme l'autre. L'arme ne change jamais de main et garde la même orientation.",
  "- Un bras qui reste collé au corps sur les quatre poses est un ÉCHEC.",
  "",
  "LES JAMBES SONT LE SUJET PRINCIPAL DE CETTE PLANCHE :",
  "- Aux poses de CONTACT, la distance entre les deux talons vaut environ la MOITIÉ de la hauteur totale du personnage. C'est une grande enjambée, pas un pas timide.",
  "- Aux poses de PASSAGE, les deux jambes se touchent presque.",
  "- Les quatre poses d'une même rangée doivent être NETTEMENT différentes au niveau des jambes. Ne jamais redessiner deux fois la même position de jambes. Faire varier les bras sans faire varier les jambes est un ÉCHEC.",
  "",
  "CADRE :",
  "- Échelle rigoureusement identique dans les douze cases.",
  "- Une LIGNE DE SOL horizontale fine, grise, traverse toute la largeur de l'image SOUS CHAQUE RANGÉE, d'un bord à l'autre et sans interruption. Les pieds posés de chaque pose la touchent exactement.",
  "- Espacement régulier et LARGE entre les colonnes. Aucun chevauchement entre deux poses, y compris les armes.",
  "- Aucun aplat de fond blanc enfermé entre un bras et le torse : si le bras s'écarte du corps, le vide entre les deux doit être franchement ouvert sur le fond.",
  "- Fond BLANC UNI. Aucun cadre, aucune grille, aucune séparation verticale, aucun numéro, aucun texte, aucune ombre portée.",
  "",
  "AVANT DE RENDRE L'IMAGE, VÉRIFIER LES TROIS POINTS SUIVANTS :",
  "1. Dans chaque rangée, la jambe qui est devant à la pose 1 est bien celle qui est DERRIÈRE à la pose 3.",
  "2. Dans chaque rangée, les quatre cases sont vues sous le même angle : la case 4 n'est pas plus tournée que la case 1.",
  "3. Les couleurs du personnage sont identiques dans les douze cases.",
  "",
  STYLE.join("\n"),
  "Chaque case doit rester lisible réduite à 50 px de haut : silhouette franche, détails minimaux.",
  "",
  "Sujet : " + subject,
].join("\n");

const POSE = {
  portrait: "Pose : de face, en progression vers le spectateur, attitude d'avancée et non d'attaque. Aucune arme brandie au-dessus de la tête, aucun saut.",
  plongee: "Vue de 3/4 EN PLONGÉE, comme vue par un joueur au-dessus du champ de bataille — surtout pas de face à hauteur d'oeil, qui écraserait la silhouette. Les membres doivent être bien détachés les uns des autres.",
  vol: "Vue de face légèrement de 3/4, créature EN VOL, ailes largement DÉPLOYÉES et bien détachées du corps. Aucun appui au sol.",
};
const FRAME = {
  portrait: "Cadrage PORTRAIT, sujet plus haut que large.",
  plongee: "Cadrage carré, sujet centré.",
  vol: "Cadrage PAYSAGE, sujet plus large que haut : l'envergure prime.",
};

const single = (subject, kind, extra) => [
  STYLE.join("\n"),
  kind === "portrait" ? "Vue frontale, à hauteur d'oeil, sujet face au spectateur — pas de profil, pas de plongée." : "",
  POSE[kind],
  FRAME[kind],
  "Sujet unique, centré, cadré serré.",
  "Fond parfaitement transparent (PNG alpha), aucun sol, aucune ombre portée, aucun décor, aucun texte, aucun cadre.",
  extra || "",
  "Doit rester lisible réduit à 50 px de haut : silhouette franche, détails minimaux.",
  "",
  "Sujet : " + subject,
].filter(Boolean).join("\n");

const out = [];
const p = (...l) => out.push(...l);

p("# Prompts Gemini — un bloc autonome par entité",
  "",
  "**Chaque bloc de code se copie-colle tel quel, seul.** Rien à assembler, rien à compléter :",
  "le style, le format, les contraintes et le sujet y sont déjà réunis.",
  "",
  "> Généré par `tools/prompts/build.cjs` — **ne pas éditer à la main**, la prochaine",
  "> exécution écraserait la correction.",
  "",
  "Les règles d'intégration (renommage, chemins, licence) restent dans",
  "[REFONTE-GRAPHIQUE-GEMINI.md](REFONTE-GRAPHIQUE-GEMINI.md).",
  "",
  "> ⚠ Ne jamais ajouter le mot « sticker » au prompt : Gemini rajoute alors un liseré blanc de découpe.",
  "",
  "---",
  "",
  "# Comment on travaille",
  "",
  "1. Copier le bloc de la créature, le coller dans Gemini, récupérer l'image.",
  "2. La déposer dans `G:\\Romain\\Téléchargements\\Monstre rework\\` sous le nom de la créature.",
  "3. Passer la commande indiquée sous le bloc.",
  "4. **Lire les avertissements de l'outil, puis faire la revue ci-dessous.**",
  "",
  "L'étape 4 n'est pas une formalité. Les trois premiers monstres ont chacun demandé",
  "plusieurs passes parce qu'un défaut était passé au travers.",
  "",
  "## La revue, dans l'ordre",
  "",
  "| # | Contrôle | Qui le fait | Si ça cloche |",
  "|---|---|---|---|",
  "| 1 | **Le cycle bouge-t-il ?** | l'outil, automatiquement | ⚠ `MÊME image` ou `aucune alternance` → **régénérer**, rien ne se rattrape |",
  "| 2 | **Chaque case regarde-t-elle à droite ?** (rangée de profil) | à l'oeil, case par case | `--profile-left` si toute la rangée, `--mirror <rangée>:<pose>` si une seule case |",
  "| 3 | **L'équipement reste-t-il dans la même main ?** | à l'oeil, rangée par rangée | `--mirror` si le dessin est inversé, `--drop` si c'est l'autre flanc du personnage |",
  "| 4 | **Reste-t-il du blanc entre un bras et le torse ?** | l'outil recense, l'oeil tranche | `--fill-holes` après avoir vérifié qu'aucune poche n'est un reflet ou un oeil |",
  "| 5 | **Les pieds touchent-ils la ligne de sol ?** | l'outil (`écart au sol`) | régénérer si l'écart dépasse quelques pixels |",
  "",
  "Contrôles 2 et 3 : regarder la planche **PRODUITE**, jamais l'image source, et",
  "**case par case**. J'ai lu l'orientation à l'oeil sur une vignette source et je me suis",
  "trompé deux fois de suite ; le générateur se trompe case par case, pas rangée par rangée.",
  "",
  "## Chiffres de référence pour le contrôle 1",
  "",
  "Écart entre deux poses d'une même rangée, mesuré **sur les jambes seules** :",
  "",
  "| planche | écart maximal | verdict |",
  "|---|---|---|",
  "| une planche qui marche vraiment | **60 à 66 %** | bon |",
  "| planches refusées jusqu'ici | 16 à 26 % | glisse |",
  "| deux poses dupliquées | 1 à 5 % | la même image |",
  "",
  "---",
  "",
  "# 1. Créatures qui MARCHENT — une direction à la fois",
  "",
  "**Format en vigueur** (ADR-073/074). Le prompt ne décrit plus les poses : il pointe vers un",
  "gabarit joint. C'est le seul format qui ait produit une rangée de face correcte.",
  "",
  "Le corps du prompt est le MÊME pour toutes les créatures. Seule la dernière ligne change :",
  "recopier le `Sujet :` de la créature, dans la liste plus bas.",
  "",
  "**Ordre de travail** — commencer par le PROFIL, le seul format qui ait jamais réussi, puis",
  "chaîner : joindre l'image obtenue aux deux générations suivantes, pour que le personnage ne",
  "dérive pas.",
  "",
  "## Prompt 1 — le PROFIL (à faire en premier)",
  "",
  "Joindre cette image au prompt :",
  "",
  "![Gabarit de profil](gabarits/gabarit-profil.png)",
  "",
  "Fichier : [`docs/gabarits/gabarit-profil.png`](gabarits/gabarit-profil.png).",
  "Pour le régénérer : `npm run mannequin -- gabarit-profil.png --view side`.",
  "",
  "\`\`\`",
  ROW_PROMPT("side", "[recopier ici la ligne Sujet de la créature]", false),
  "\`\`\`",
  "",
  "## Prompt 2 — la FACE",
  "",
  "Une fois le profil validé, joindre DEUX images : lui, et le gabarit de face. Le générateur a",
  "le personnage sous les yeux, pas seulement sa description — c'est le chaînage.",
  "",
  "![Gabarit de face](gabarits/gabarit-face.png)",
  "",
  "Fichier : [`docs/gabarits/gabarit-face.png`](gabarits/gabarit-face.png).",
  "Pour le régénérer : `npm run mannequin -- gabarit-face.png --view front`.",
  "",
  "\`\`\`",
  ROW_PROMPT("front", "", true),
  "\`\`\`",
  "",
  "## Prompt 3 — le DOS",
  "",
  "Même principe, avec le gabarit de dos.",
  "",
  "![Gabarit de dos](gabarits/gabarit-dos.png)",
  "",
  "Fichier : [`docs/gabarits/gabarit-dos.png`](gabarits/gabarit-dos.png).",
  "Pour le régénérer : `npm run mannequin -- gabarit-dos.png --view back`.",
  "",
  "\`\`\`",
  ROW_PROMPT("back", "", true),
  "\`\`\`",
  "",
  "## Les sujets, un par créature",
  "",
  "| créature | `Sujet :` à recopier |",
  "|---|---|",
  ...D.WALKERS.map(([file, title, size, subject]) =>
    "| **" + title + "** (`" + file.replace(".png", "") + "`, taille " + size + ") | " + subject + " |"),
  "| **" + D.HERO[1] + "** (`" + D.HERO[0].replace(".png", "") + "`) | " + D.HERO[3] + " |",
  "",
  "---",
  "",
  "# 1 bis. Format ABANDONNÉ — la planche 3 × 4 d'un seul bloc",
  "",
  "Conservé pour mémoire, et parce qu'il documente ce qui a été essayé. **Ne pas l'utiliser** :",
  "cinq planches sur cinq ont échoué dans ce format, le générateur décrochant sur le profil et",
  "le dos. Les blocs ci-dessous sont ceux de cette tentative.",
  "",
  "Format retenu pour toute créature posée au sol sur deux jambes (ADR-067).",
  "La marche vers la GAUCHE n'est pas demandée : c'est le miroir du profil droit,",
  "calculé sans erreur possible. Six poses de moins, donc plus de pixels pour chacune.",
  "",
  "## Joindre le gabarit de poses (ADR-073)",
  "",
  "Le prompt a été durci quatre fois sans obtenir des poses fiables. Un gabarit dessiné les",
  "MONTRE au lieu de les décrire — squelette gris sans visage ni équipement, trois vues x quatre",
  "poses, membre éloigné assombri pour qu'on voie quelle jambe est devant.",
  "",
  "```bash",
  "npm run mannequin -- gabarit-poses.png",
  "```",
  "",
  "Joindre l'image au prompt, en demandant d'habiller le gabarit sans changer les poses.",
  "",
  "## Une direction à la fois (ADR-074)",
  "",
  "Le générateur tient quatre cases et décroche sur douze : mesuré, une planche 3x4 rend un",
  "profil à deux poses dupliquées et un dos immobile. On demande donc UNE rangée par image,",
  "avec le gabarit de la direction correspondante.",
  "",
  "```bash",
  "npm run mannequin -- gabarit-face.png --view front",
  "npm run mannequin -- gabarit-profil.png --view side",
  "npm run mannequin -- gabarit-dos.png --view back",
  "```",
  "",
  "Commencer par le PROFIL : c'est le seul format qui ait jamais réussi. Joindre ensuite",
  "l'image obtenue aux deux générations suivantes, pour que le personnage ne dérive pas.",
  "",
  "Puis recoller les trois images, dans l'ordre face, profil, dos :",
  "",
  "```bash",
  "npm run sprite -- face.png profil.png dos.png public/assets/skin-craftpix/<defId>.png --strip --poses 4 --views fsb --fill-holes",
  "```",
  "",
  "**`--views` n'est pas optionnel.** Le juge de cycle applique au profil un seuil deux fois plus",
  "exigeant qu'aux vues frontales ; sans cette déclaration il prend toute planche d'une seule",
  "rangée pour un profil, et refuse une rangée de face pourtant correcte.",
  "",
  "Pour traiter une rangée seule, en cours de mise au point :",
  "",
  "```bash",
  "npm run sprite -- face.png sortie.png --strip --poses 4 --views f",
  "```",
  "",
  "Commande de traitement, la même pour toutes :",
  "",
  "```bash",
  "npm run sprite -- \"G:/Romain/Téléchargements/Monstre rework/<source>.png\" public/assets/skin-craftpix/<defId>.png --strip --poses 4 --fill-holes",
  "```",
  "");

for (const [file, title, size, subject] of D.WALKERS) {
  p("## `" + file + "` — " + title + " (taille " + size + ")", "", "```", SHEET(subject), "```", "");
}

p("---", "", "# 2. Héros", "",
  "Même format : il se déplace sur la carte comme les créatures.", "");
p("## `" + D.HERO[0] + "` — " + D.HERO[1], "", "```", SHEET(D.HERO[3]), "```", "");

p("---", "", "# 3. Créatures SANS cycle de marche — sprite unique",
  "",
  "Volants, rampants et créatures sans jambes. Leur mouvement est produit par le",
  "rendu (ADR-064) : une planche de marche n'aurait rien à montrer.",
  "",
  "Commande :",
  "",
  "```bash",
  "npm run sprite -- \"G:/Romain/Téléchargements/Monstre rework/<source>.png\" public/assets/skin-craftpix/<defId>.png",
  "```",
  "");

for (const [file, title, size, kind, subject] of D.STATICS) {
  p("## `" + file + "` — " + title + " (taille " + size + ")", "", "```", single(subject, kind), "```", "");
}

p("---", "", "# 4. Tours — vue de 3/4 quasi isométrique",
  "",
  "Une tour ne bouge pas : sprite unique. Les paliers d'une même famille doivent rester",
  "reconnaissables entre eux — c'est l'amélioration qui doit se voir, pas un autre bâtiment.",
  "");
const TOWER_STYLE = [
  STYLE.join("\n"),
  "Vue de 3/4 en légère PLONGÉE, angle de tower defense : on voit la façade et un pan de côté, ainsi que le dessus de la plateforme.",
  "Cadrage PORTRAIT, bâtiment unique, centré, cadré serré, posé de façon stable — la base doit sembler reposer sur le sol.",
  "Fond parfaitement transparent (PNG alpha), aucun terrain, aucune ombre portée, aucun décor, aucun personnage, aucun texte.",
  "Doit rester lisible réduit à 60 px de haut : silhouette franche, un seul élément distinctif fort au sommet.",
].join("\n");
for (const [file, title, subject] of D.TOWERS) {
  p("## `" + file + "` — " + title, "", "```", TOWER_STYLE + "\n\nSujet : " + subject, "```", "");
}

p("---", "", "# 5. Bâtiments & emblèmes du Campement", "");
for (const [file, title, fmt, subject] of D.UI) {
  p("## `" + file + "` — " + title + " (" + fmt + ")", "", "```",
    [STYLE.join("\n"),
     "Vue de face, objet unique, centré, cadré serré.",
     "Format " + fmt + ".",
     "Fond parfaitement transparent (PNG alpha), aucune ombre portée, aucun décor, aucun texte.",
     "Doit rester lisible réduit à 64 px : silhouette franche, détails minimaux.",
     "",
     "Sujet : " + subject].join("\n"), "```", "");
}

p("---", "", "# 6. Ce que l'outil rapporte, et pourquoi le lire", "",
  "| ligne | ce qu'elle dit | quand s'inquiéter |",
  "|---|---|---|",
  "| `lignes de sol` | combien de rangées ont été trouvées | un nombre autre que 3 sur une planche complète |",
  "| `poches fermées` | zones blanches enfermées dans le dessin | > 0 sans `--fill-holes` : elles resteront blanches en jeu |",
  "| `frange claire` | pixels de dégradé JPEG décapés autour du trait | `plafond de passes atteint` : l'érosion mordait peut-être le dessin |",
  "| `planche` | directions × poses et taille de case | un compte de poses différent de celui demandé |",
  "| `écart au sol` | dispersion des pieds autour de leur ligne | quelques pixels passent, au-delà la créature tressautera |",
  "| `bord clair` | pixels clairs restants sur le pourtour | informatif : une lame ou un casque clair en produit légitimement |",
  "",
  "## Les drapeaux",
  "",
  "| drapeau | à quoi il sert |",
  "|---|---|",
  "| `--strip` | traiter l'image comme une planche de poses |",
  "| `--poses N` | forcer le nombre de poses par rangée si la détection se trompe |",
  "| `--fill-holes` | boucher les poches de fond enfermées, APRÈS les avoir regardées |",
  "| `--profile-left` | la rangée de profil ENTIÈRE regarde à gauche |",
  "| `--mirror <rangée>:<pose>` | une case isolée est dessinée en miroir |",
  "| `--drop <pose>` | retirer une pose du cycle, dans toutes les rangées |",
  "| `--max N` | plafond de résolution de stockage (256 par défaut) |",
  "",
  "Les index de `--mirror` s'entendent **après** `--drop`.",
  "",
  "## Ce que l'outil refuse",
  "",
  "- Une planche `--strip` **sans ligne de sol** : il n'a alors aucun moyen d'aligner les poses",
  "  entre elles, et une pose 3 px plus basse fait tressauter la créature à chaque cycle.",
  "- Un découpage **incomplet** : si une rangée rend moins de poses que les autres, le rangement",
  "  par direction se décale et chaque direction irait puiser dans la suivante.",
  "",
  "## Si la ligne de sol est dessinée en deux segments",
  "",
  "Le générateur la trace parfois en tronçons. L'outil tolère une interruption courte et",
  "recolle les morceaux — mais si le rapport annonce moins de trois lignes sur une planche",
  "complète, c'est que le trou était trop large : régénérer en insistant sur « d'un bord à",
  "l'autre et sans interruption ».",
  "");

fs.writeFileSync("docs/PROMPTS-GEMINI.md", out.join("\n") + "\n");
console.log("écrit : " + out.length + " lignes");
