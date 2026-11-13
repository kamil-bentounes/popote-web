# Système de design « Jeu »

Le style de toute l'appli Popote, choisi le 13/11/2026 parmi cinq pistes animées : un jeu, pas une
appli de gestion. Fond crème, couleurs franches, contours d'encre épais, ombres dures, boutons qui
s'enfoncent, une marmite qui sert de visage à l'assistant, et des récompenses quand un geste réussit.

Ce dossier est la référence à porter en composants React. Il ne contient aucune bibliothèque et ne
charge rien d'un autre domaine.

## Les fichiers

| Fichier | Rôle |
|---|---|
| `jetons.css` | Source unique des valeurs, en `@theme` Tailwind 4 : couleurs, typographies, rayons, ombres, courbes, mesures. |
| `composants.css` | Le CSS de référence de chaque composant et de ses états. Il ne lit que les jetons. |
| `reference.html` | La page qui montre tout, état par état. À ouvrir dans un navigateur, sans serveur. |
| `jetons-racine.css` | Copie des jetons sous `:root`, pour que `reference.html` marche sans Tailwind. |
| `polices/` | Fredoka et Nunito en woff2 (latin et latin étendu), avec leurs licences OFL 1.1. |

Après une modification de `jetons.css`, régénérer la copie :

```bash
sed 's/^@theme {/:root {/' jetons.css > jetons-racine.css
```

## Les règles du style

1. **Un contour, une ombre dure.** Tout ce qui se touche ou porte du contenu a un contour d'encre de
   3,5 px et une ombre sans flou. Pas de dégradé décoratif, pas d'ombre floue.
2. **Un seul bouton plein par écran.** Menthe pour l'action principale, jaune pour envoyer ou valider
   une proposition de Popote, blanc pour le reste, tomate foncée pour le danger.
3. **Le texte est encre sur les couleurs franches.** Le blanc n'est permis que sur `tomate-fonce` et
   `ciel-fonce`, les seules à tenir 4,5:1.
4. **Fredoka pour ce qui se touche et s'annonce, Nunito en gras pour ce qui se lit.**
5. **Un bouton s'enfonce.** À l'appui il descend de 6 px et son ombre s'écrase, en 90 ms.
6. **Un écran arrive en rebondissant.** Il monte en 500 ms, puis ses éléments se posent l'un après
   l'autre, à 70 ms d'écart, avec la courbe `rebond`.
7. **Une réussite se fête, une seule fois.** Tampon, confettis et marmite en joie ne partent que sur un
   vrai aboutissement (repas noté, invitation envoyée, session lancée), jamais sur une navigation.
8. **Un geste grave se maintient.** Supprimer ou retirer quelqu'un : la liste de ce qui disparaît, reste
   et change, une preuve d'identité, puis un appui de 2 secondes.
9. **La pastille informe, elle ne se touche pas.** Ce qui se touche est un bouton ou un lien.
10. **Zone touchable de 44 px au moins**, anneau jaune de 4 px au clavier, et respect de
    `prefers-reduced-motion` : plus de rotation ni de saut, les états restent lisibles par leur dessin.

## Les composants et leurs états

| Composant | Classes | États |
|---|---|---|
| Bouton | `.bouton`, `--jaune`, `--blanc`, `--danger`, `--petit` | repos, appuyé, focus, désactivé, occupé (`aria-busy`) |
| Bouton à maintenir | `.bouton.maintenir` | repos, tenu (`data-tenu`, 2 s), abouti |
| Lien | `.lien`, `--danger` | repos, focus |
| Champ | `.champ` | repos, focus, erreur (`data-erreur`), désactivé |
| Cases du code | `.cases` | saisie, juste, faux (`data-etat`) |
| Bloc | `.bloc` | un seul |
| Pastille | `.pastille`, `--menthe`, `--rose`, `--lilas` | un seul |
| Tampon | `.tampon` | arrivée animée |
| Avatar | `.avatar`, `--menthe`, `--libre` | personne, place libre |
| Jauge | `.jauge`, `--ciel` | remplissage par `--part` |
| Suivi | `.suivi` | étape faite (`data-fait`) |
| Ligne d'effet | `.effet` | `data-sens` : perd, reste, change |
| Bulle | `.bulle` | un seul |
| Décor | `.soleil`, `--ciel`, `--rose`, `.sol` | un seul |
| Feuille | `.feuille` | arrivée animée |
| Entrée d'écran | `.entre` avec `--rang` | arrivée animée |
| Confettis | `.confetti` | lancés par script |
| Marmite | `.marmite` avec `data-etat` | repos, sommeil, écoute, réflexion, parole, joie, inquiétude |

## La marmite et l'assistant

| État | Quand |
|---|---|
| `repos` | Par défaut. Elle cligne. |
| `sommeil` | Le serveur se réveille (5 à 7 s) ; une connexion est en pause après trop d'essais. |
| `ecoute` | Le mode vocal attend ou reçoit la voix. |
| `reflexion` | L'assistant prépare une réponse ou une action. |
| `parole` | L'assistant répond, à l'écrit comme à voix haute. |
| `joie` | Un geste a abouti. Deux sauts, puis retour au repos. |
| `inquiet` | Une erreur, un lien expiré, un départ. |

## Ce que ce dossier ne fait pas

- Il ne fixe ni la navigation ni la mise en page des écrans : chaque parcours les décrit dans sa spec.
- Les scripts de `reference.html` (confettis, maintien) sont des démonstrations. Dans l'appli, les
  mouvements passent par Motion, avec les durées et les courbes des jetons.
- Les exemples utilisent un prénom d'exemple (« Léa ») et aucune donnée personnelle.

## Licences

Fredoka et Nunito sont sous SIL Open Font License 1.1 : voir `polices/LICENCE-fredoka-OFL.txt` et
`polices/LICENCE-nunito-OFL.txt`. Elles sont servies par notre domaine, comme l'exige la politique de
sécurité du contenu.
