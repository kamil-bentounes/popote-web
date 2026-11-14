# Le monde « Cuisiner » : la référence visuelle

Le prototype animé du quatrième parcours (composer le menu, choisir ou ajouter une recette, inventer une recette,
les courses à deux, le plan qui fusionne les gestes, la cuisine pas à pas, l'imprévu, le rangement, la session sur
PC), au style « Jeu », validé par le propriétaire le 14/11/2026. La spec est dans
`docs/superpowers/specs/2026-11-14-monde-cuisiner-design.md`, le plan du front dans
`docs/superpowers/plans/2026-11-14-monde-cuisiner.md`.

| Fichier | Rôle |
|---|---|
| `prototype.html` | Le film du monde et ses 11 moments rejouables, sur téléphone et sur PC. À ouvrir dans un navigateur, sans serveur. |
| `captures/` | 79 captures : les étapes de chaque moment (390 px) et l'écran PC (1500 px). |

## Ce que le prototype montre

Le film enchaîne le menu, les courses, le plan, la cuisine et le rangement. Chaque moment se rejoue seul depuis la
liste de gauche (ou le bouton « Les moments » sur un écran étroit) :

| Étape | Moments |
|---|---|
| Préparer | `menu` (nouvelle session, Popote propose), `choisir` (les filtres, la fiche d'une recette), `recette` (ajouter sa recette en photo), `inventer` (une envie, Popote invente) |
| Les courses | `courses` (la liste à deux, un introuvable remplacé, un article retiré, un reste), `ticket` (le prix par part, le ticket scanné) |
| Cuisiner | `plan` (les briques s'envolent vers la frise), `cuisine` (une carte à la fois, minuteurs, voix), `imprevu` (une personne doit partir, un souci, la pause) |
| Ranger | `ranger` (dresser, peser, frigo ou congélateur, la fin de session) |
| Sur PC | `pccui` (le menu, la frise en grand, Popote à droite) |

## Ce qui fait foi

- Le prototype fait foi pour le dessin et le mouvement ; la spec pour les textes, les états, les règles de calcul et
  les données.
- Le style vient de `.design/systeme/` : en cas d'écart, le système gagne.

## Ce qui est un exemple

- Les prénoms (« Sam » et « Léa »), les recettes, les ingrédients, les durées, l'enseigne du ticket et tous les
  prix sont inventés.
- Les images des plats sont des vignettes dessinées, une par recette : l'appli affichera la photo de chaque
  recette, avec sa source.
- Les réponses de Popote sont écrites d'avance : aucun modèle, aucune voix, aucun appareil photo ne tourne.

## Ce que le prototype n'est pas

- Son script est une démonstration. Il charge GSAP depuis cdnjs, avec une empreinte d'intégrité (`integrity`), ce
  que l'appli ne fera jamais : dans l'appli, le mouvement passe par Motion, avec les durées et les courbes des
  jetons, et rien ne vient d'un autre domaine.
- Il ne respecte pas le réglage « mouvement réduit » : l'appli, elle, le fera.
- Le plan est un calcul figé : l'ordre et les durées des briques sont écrits à la main, pas calculés (la règle est
  dans la spec, § 10.3).
- Ses moments ne forment pas une seule session : chacun repart d'une page neuve.
- Certains états de la spec n'y sont pas joués.
