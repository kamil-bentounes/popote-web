# Le monde « Semaine et Frigo » : la référence visuelle

Le prototype animé du cinquième parcours (qui mange quoi et quand, ce qu'il y a au frigo, au congélateur et au
placard, ajouter des produits en parlant ou en photo), au style « Jeu ». La spec est dans
`docs/superpowers/specs/2026-11-14-monde-semaine-frigo-design.md`, le plan du front dans
`docs/superpowers/plans/2026-11-14-monde-semaine-frigo.md`.

| Fichier | Rôle |
|---|---|
| `prototype.html` | Le film du monde et ses 14 moments rejouables, sur téléphone et sur PC. À ouvrir dans un navigateur, sans serveur. |
| `captures/` | 68 captures : les étapes de chaque moment (390 px) et l'écran PC. |

## Les 14 moments

| Chapitre | Moments |
|---|---|
| La semaine | Popote place les parts · Changer un repas · Une part en plus · Rattraper un jour passé · Le détail d'un jour · La semaine en chiffres |
| Le frigo | Ouvrir le frigo · La fiche d'un plat · Une part à jeter · Sortir du congélateur |
| Ajouter | En le disant · Photographier le frigo · Le placard, en parlant |
| Sur PC | La semaine et le frigo en large |

## Ce qui fait foi

- Le prototype fait foi pour le dessin et le mouvement ; la spec pour les textes, les états, les règles et les données.
- Le style vient de `.design/systeme/` : en cas d'écart, le système gagne.

## Ce que le prototype n'est pas

- Son script est une démonstration. Il charge GSAP depuis cdnjs, avec une empreinte d'intégrité (`integrity`), ce
  que l'appli ne fera jamais : dans l'appli, le mouvement passe par Motion, avec les durées et les courbes des
  jetons, et rien ne vient d'un autre domaine.
- Il ne respecte pas le réglage « mouvement réduit » : l'appli, elle, le fera.
- Les réponses de Popote y sont écrites d'avance : les prénoms, les plats, les quantités et les chiffres sont des
  exemples.
- Il n'y a aucune photo : chaque plat y a une vignette dessinée (fond de couleur, pictogramme au trait épais). L'appli
  affichera la photo du plat quand il y en a une, et cette vignette quand il n'y en a pas.
- La caméra et la reconnaissance des produits y sont dessinées : dans l'appli, c'est la vraie caméra de l'appareil et
  une vraie reconnaissance, avec l'autorisation donnée sur l'appareil.
- La grille de la semaine sur PC y est une maquette large : l'appli y gardera les mêmes règles que sur téléphone.
