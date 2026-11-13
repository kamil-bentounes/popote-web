# Parcours « Aujourd'hui » : la référence visuelle

Le prototype animé du deuxième parcours (l'accueil, noter ce qu'on mange, Popote à l'écrit et à la voix), au style
« Jeu », validé par le propriétaire le 13/11/2026. La spec est dans
`docs/superpowers/specs/2026-11-13-parcours-aujourdhui-design.md`, le plan du front dans
`docs/superpowers/plans/2026-11-13-parcours-aujourdhui.md`.

| Fichier | Rôle |
|---|---|
| `prototype.html` | Le film du parcours et ses 19 moments rejouables, sur téléphone et sur PC. À ouvrir dans un navigateur, sans serveur. |
| `captures/` | 38 captures : les étapes de chaque moment (390 px), états d'erreur compris, et l'écran PC. |
| `img/` | La photo d'exemple du plat. Voir `CREDITS.md`. |

## Ce qui fait foi

- Le prototype fait foi pour le dessin et le mouvement ; la spec pour les textes, les états et les données.
- Le style vient de `.design/systeme/` : en cas d'écart, le système gagne.

## Ce que le prototype n'est pas

- Son script est une démonstration. Il charge GSAP depuis cdnjs, avec une empreinte d'intégrité (`integrity`), ce que l'appli ne fera jamais : dans l'appli, le
  mouvement passe par Motion, avec les durées et les courbes des jetons, et rien ne vient d'un autre domaine.
- Il ne respecte pas le réglage « mouvement réduit », sauf pour la tuile mise en avant : l'appli, elle, le fera.
- Les réponses de Popote y sont écrites d'avance : rien n'y appelle un assistant.
- L'écran du budget et celui de « Nouvelle session » ne sont que des aperçus : ils appartiennent à leurs parcours.
- Certains états de la spec n'y sont pas joués (§ 14, C7).
- Ses moments ne forment pas une seule soirée : « Un soir sans rien de prévu » et « Après la session » sont deux
  soirs différents, avec deux stocks différents.
- Dans le mode vocal du prototype, le micro se rouvre sans attendre : la règle de validation à la voix est celle de
  la spec (§ 7).
- Ses polices sont celles de `.design/systeme/polices/`.
- « Sam », « Léa », les plats, les chiffres et le budget sont des exemples. Aucune donnée personnelle.
