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
10. **Zone touchable de 44 px au moins.** Au clavier, un anneau d'encre de 4 px cerné de jaune : l'encre tient
    plus de 3:1 sur tous nos fonds, le jaune seul ne le tenait pas. Avec `prefers-reduced-motion`, plus rien ne
    bouge tout seul, et chaque état reste lisible par son dessin.

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

Chaque état a un signe dessiné, qui se lit sans aucun mouvement ; le mouvement s'ajoute par-dessus.

| État | Signe dessiné | Mouvement | Quand |
|---|---|---|---|
| `repos` | yeux ouverts, sourire | elle cligne | par défaut |
| `sommeil` | yeux fermés, « z z » | elle respire | le serveur se réveille (5 à 7 s) ; une connexion est en pause |
| `ecoute` | ondes de chaque côté, couvercle levé, grands yeux | les ondes battent | le mode vocal attend ou reçoit la voix |
| `reflexion` | vapeur, regard en l'air, couvercle de travers | le couvercle mijote | l'assistant prépare une réponse ou une action |
| `parole` | bouche ouverte | la bouche bat | l'assistant répond, à l'écrit comme à voix haute |
| `joie` | yeux rieurs | deux sauts, puis retour au repos | un geste a abouti |
| `inquiet` | bouche à l'envers, goutte, regard baissé | aucun | une erreur, un lien expiré, un départ |

## À porter (consignes pour la fondation du front)

Ces points viennent de la relecture adverse de la demande de fusion #38. Ils ne changent rien à la page de
référence ; ils s'appliquent au moment de porter le système en composants React.

- **Couche CSS.** Mettre les composants dans `@layer components`, pour qu'une utilité Tailwind (`p-2`) puisse les
  ajuster. Les `@font-face` et les `@keyframes` restent hors couche.
- **Jetons Tailwind.** Fermer les valeurs par défaut (`--color-*: initial;`, de même pour `--text-*`, `--radius-*`
  et `--shadow-*`), sinon `bg-red-500` ou `rounded-xl` contournent le système. Les courbes et durées lues par Motion
  demandent `@theme static` ; les ombres qui lisent `var(--color-encre)` demandent `@theme inline`.
- **Politique de sécurité du contenu.** Pas de `<style>` ni de `<script>` en ligne dans l'appli, pas d'attribut
  `style="…"` écrit dans le HTML : des classes, ou la propriété `style` de React. La marmite devient un composant
  `<Marmite etat="…">`, sans `innerHTML`. Les polices passent par les ressources de Vite, les deux woff2 latins
  sont préchargés.
- **Bouton à maintenir.** Le maintien marche au doigt, à la souris et au clavier (Espace ou Entrée tenue 2 s),
  et sa progression s'annonce (`role="status"`). La page de référence montre le comportement attendu.
- **Bouton occupé.** `aria-busy` ne suffit pas : ajouter `aria-disabled` et une garde, pour que le clavier ne
  relance pas l'action.
- **Marmite et lecteurs d'écran.** Elle est décorative (`aria-hidden`) ; c'est le texte qui l'accompagne (bulle,
  état de l'assistant) qui porte `role="status"`.
- **Champ.** L'aide et l'erreur sont hors du libellé, reliées par `aria-describedby` ; l'erreur pose
  `aria-invalid` et s'annonce.
- **Jamais la couleur seule.** Étape de suivi faite : une coche et `aria-current` sur l'étape en cours. Cases
  justes ou fausses : le texte dessous le dit toujours. Jauge : `role="progressbar"` et sa valeur.
- **Mouvement sans fin.** Le soleil et le clignement sont du décor ; les rayures de la jauge ne défilent qu'à son
  arrivée (2 s), puis s'arrêtent.
- **Divers.** Ajouter le focus visible des cases et des avatars quand ils deviennent touchables ; régler `html` et
  les marges de sécurité des téléphones dans la coque ; retirer `.jeu *` (le preflight de Tailwind le fait) ;
  vérifier en CI que `jetons-racine.css` est bien la copie de `jetons.css` ; ne jamais écrire de texte en
  `--color-erreur` sur `--color-tomate-pale` (4,25:1).

## Ce que ce dossier ne fait pas

- Il ne fixe ni la navigation ni la mise en page des écrans : chaque parcours les décrit dans sa spec.
- Les scripts de `reference.html` (confettis, maintien) sont des démonstrations. Dans l'appli, les
  mouvements passent par Motion, avec les durées et les courbes des jetons.
- Les exemples utilisent un prénom d'exemple (« Léa ») et aucune donnée personnelle.

## Licences

Fredoka et Nunito sont sous SIL Open Font License 1.1 : voir `polices/LICENCE-fredoka-OFL.txt` et
`polices/LICENCE-nunito-OFL.txt`. Elles sont servies par notre domaine, comme l'exige la politique de
sécurité du contenu.
