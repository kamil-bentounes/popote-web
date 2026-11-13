# Parcours « Entrer » : la référence visuelle

Le prototype animé du premier parcours (entrer, inviter, rejoindre, compte, départs), au style « Jeu », validé par le
propriétaire le 13/11/2026. La spec est dans `docs/superpowers/specs/2026-11-13-parcours-entrer-design.md`, le plan
du front dans `docs/superpowers/plans/2026-11-13-parcours-entrer.md`.

| Fichier | Rôle |
|---|---|
| `prototype.html` | Le film du parcours et ses 29 moments rejouables, sur téléphone et sur PC. À ouvrir dans un navigateur, sans serveur. |
| `captures/` | 35 captures : l'état d'arrivée de chaque moment (390 px), états d'erreur compris, et les deux écrans PC. |
| `img/` | La photo d'exemple de l'accueil. Voir `CREDITS.md`. |

## Ce qui fait foi

- Le prototype fait foi pour le dessin et le mouvement ; la spec pour les textes, les états et les données.
- Le style vient de `.design/systeme/` : en cas d'écart, le système gagne.

## Ce que le prototype n'est pas

- Son script est une démonstration. Il charge GSAP depuis cdnjs, ce que l'appli ne fera jamais : dans l'appli, le
  mouvement passe par Motion, avec les durées et les courbes des jetons, et rien ne vient d'un autre domaine.
- Il ne respecte pas le réglage « mouvement réduit » : l'appli, elle, le fera (fondation du front).
- Les textes des états communs (pas de réseau, panne) y sont montrés pour l'aspect : leur formulation appartient à la
  fondation (F18 à F21).
- Ses polices sont celles de `.design/systeme/polices/`.
- « Sam », « Léa », leurs adresses, les plats et les chiffres sont des exemples. Aucune donnée personnelle.
- L'écran d'accueil qui suit le réveil n'est qu'un aperçu : il appartient au parcours « Aujourd'hui ».
