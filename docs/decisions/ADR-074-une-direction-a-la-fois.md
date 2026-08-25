# ADR-074 — Une direction à la fois, recollées par l'outil

## Statut
Accepté (2026-08-25)

## Contexte

Première planche générée à partir du gabarit d'ADR-073. Le PO : « il s'en sort
que pour la première ligne, je sais pas si on devrait pas faire ligne par ligne,
ça augmente le risque que le design du monstre change mais là il n'arrive pas à
faire les 12 positions correctement ».

Constat partagé, et c'est un progrès : **la rangée de face est correcte pour la
première fois**, après cinq planches où elle ne l'avait jamais été. Le gabarit
fonctionne. Mais le générateur décroche sur douze cases — la rangée de profil ne
contient que deux poses réelles dupliquées, celle de dos est immobile.

Douze cases dans une seule image, c'est douze fois l'occasion de simplifier.

## Décision

Demander une direction à la fois, et recoller.

`npm run mannequin -- <destination> --view front|side|back` rend le gabarit d'une
seule rangée : quatre cases, plus grandes, un seul angle de vue à tenir.

`npm run sprite` accepte désormais PLUSIEURS sources, la destination étant le
dernier chemin. Les images sont empilées avant tout traitement ; chacune portant
sa ligne de sol, la pile en compte une par rangée, et la suite de la chaîne ne
fait aucune différence avec une planche générée d'un bloc.

Vérifié : les trois gabarits passés séparément produisent un fichier **identique
au bit près** à la planche traitée d'un seul tenant.

## Conséquences

### Le risque se déplace, il ne disparaît pas

Le PO l'a nommé lui-même : trois générations séparées, c'est trois occasions pour
le personnage de changer de couleur, de proportions ou d'échelle. Chaque rangée
peut être correcte isolément et le RAPPORT entre elles fautif.

L'outil le mesure : le rapport annonce l'écart de taille entre la pose la plus
grande et la plus petite, et avertit au-delà d'un douzième de la hauteur de case.
Sur une planche d'un bloc l'écart est faible par construction ; sur trois images,
c'est le premier signe d'une dérive d'échelle.

La parade côté prompt est le CHAÎNAGE : générer la rangée de face, puis la
joindre comme seconde référence pour les rangées suivantes. Le générateur a alors
sous les yeux le personnage à respecter, pas seulement sa description.

### Un défaut latent d'analyse des arguments

Accepter plusieurs sources oblige à prendre la destination comme DERNIER chemin.
Or `--max 256` déposait « 256 » parmi les chemins : le défaut restait invisible
tant que la destination était le deuxième positionnel, il devenait bloquant
ensuite. Les options à valeur sont désormais déclarées et leur argument sauté.

## Alternatives écartées

**Continuer sur douze cases en durcissant encore le prompt.** Cinq durcissements
ont chacun supprimé le défaut visé et laissé passer le suivant. Le gabarit a
apporté un gain réel mais partiel ; il n'y a pas de raison de croire qu'une
sixième consigne textuelle emporte les deux rangées restantes.

**Normaliser automatiquement l'échelle entre les sources.** Techniquement
possible — mesurer la hauteur du personnage par rangée et rééchantillonner. Mais
cela masquerait une dérive qui peut aussi porter sur les couleurs ou
l'équipement, que l'outil ne saurait pas corriger. Mieux vaut la signaler et
régénérer que la rattraper à moitié.

**Une seule image de quatre cases, et deux directions par miroir.** Le miroir ne
donne que la marche vers la gauche (ADR-067) ; il ne fabrique ni la face ni le
dos, qui montrent d'autres faces du corps.
