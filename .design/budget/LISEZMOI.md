# Le monde « Budget » : la référence visuelle

Le prototype animé du troisième parcours (poser le budget thème par thème, le virement de chacun vers le compte
joint, la banque en lecture seule, les opérations du soir, les avances, le point du mois), au style « Jeu », validé
par le propriétaire le 13/11/2026. La spec est dans `docs/superpowers/specs/2026-11-13-monde-budget-design.md`, le
plan du front dans `docs/superpowers/plans/2026-11-13-monde-budget.md`.

| Fichier | Rôle |
|---|---|
| `prototype.html` | Le film du monde et ses 15 moments rejouables, sur téléphone et sur PC. À ouvrir dans un navigateur, sans serveur. |
| `captures/` | 50 captures : les étapes de chaque moment (390 px), états d'erreur compris, et l'écran PC. |

## Ce qui fait foi

- Le prototype fait foi pour le dessin et le mouvement ; la spec pour les textes, les états, les règles de calcul et
  les données.
- Le style vient de `.design/systeme/` : en cas d'écart, le système gagne.

## Ce que le prototype n'est pas

- Son script est une démonstration. Il charge GSAP depuis cdnjs, avec une empreinte d'intégrité (`integrity`), ce
  que l'appli ne fera jamais : dans l'appli, le mouvement passe par Motion, avec les durées et les courbes des
  jetons, et rien ne vient d'un autre domaine.
- Il ne respecte pas le réglage « mouvement réduit » : l'appli, elle, le fera.
- Les réponses de Popote y sont écrites d'avance, et aucune banque n'y est branchée : les prénoms, la banque, les
  revenus, les charges et les opérations sont des exemples.
- L'écran « chez la banque » n'est qu'un schéma : dans l'appli, la personne quitte Popote pour le site ou l'appli de
  sa banque, puis revient.
- Ses moments ne forment pas un seul mois : la mise en place, le début du mois, un soir du 13 et le point du 30 sont
  joués chacun pour soi.
- Certains états de la spec n'y sont pas joués (§ 17, B-C8).
