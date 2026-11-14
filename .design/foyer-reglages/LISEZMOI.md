# Le monde « Foyer et réglages » : la référence visuelle

Le prototype animé du sixième parcours (tout régler au même endroit : les objectifs, les notifications, la cuisine,
le foyer, ce que Popote garde et sait, signaler un bug, télécharger ses données), au style « Jeu ». La spec est dans
`docs/superpowers/specs/2026-11-14-monde-foyer-reglages-design.md`, le plan du front dans
`docs/superpowers/plans/2026-11-14-monde-foyer-reglages.md`.

| Fichier | Rôle |
|---|---|
| `prototype.html` | Le film du monde et ses 10 moments rejouables, sur téléphone et sur PC. À ouvrir dans un navigateur, sans serveur. |
| `captures/` | 50 captures : les étapes de chaque moment (390 px) et l'écran PC. |

## Ce qui fait foi

- Le prototype fait foi pour le dessin et le mouvement ; la spec pour les textes, les états, les règles et les données.
- Le style vient de `.design/systeme/` : en cas d'écart, le système gagne.

## Ce que le prototype n'est pas

- Son script est une démonstration. Il charge GSAP depuis cdnjs, avec une empreinte d'intégrité (`integrity`), ce
  que l'appli ne fera jamais : dans l'appli, le mouvement passe par Motion, avec les durées et les courbes des
  jetons, et rien ne vient d'un autre domaine.
- Il ne respecte pas le réglage « mouvement réduit » : l'appli, elle, le fera.
- Les réponses de Popote y sont écrites d'avance : les prénoms, les objectifs, les chiffres, le plat et les
  signalements sont des exemples.
- La notification d'essai y est dessinée dans la page ; dans l'appli, c'est une vraie notification du système, et son
  affichage dépend de l'autorisation donnée sur l'appareil.
- Le téléchargement des données y est simulé par une barre de progression.
- Les écrans « Mon compte » et « À propos » n'y sont pas dessinés : le hub ne fait que les relier.
