# Le banc

Une page de développement qui montre chaque composant du système « Jeu » dans chacun de ses états, et les contrôles
qui la parcourent dans de vrais navigateurs. Elle n'est **jamais livrée** : `banc.html` est une seconde entrée Vite,
construite seulement en mode `banc` ; `scripts/verifie-build.mjs` refuse un `banc.html` dans un build normal.

## L'ouvrir
- Avec le relais local, CSP en `enforce` (ce que jouent les e2e) : `npm run build:banc`, puis
  `npx wrangler dev --port 4173 --var CSP_MODE:enforce --var RELAY_SECRET:banc --var API_ORIGIN:http://127.0.0.1:9` (les e2e y ajoutent
  `--var CSP:` : la CSP de `wrangler.jsonc` sans `upgrade-insecure-requests`, que WebKit applique même en `http://127.0.0.1`), page `/banc`
  (l'hébergement des fichiers redirige `/banc.html` vers `/banc`). `?fige` met les animations de Motion à leur état final.
- Avec Vite, sans CSP : `npm run dev`, page `/banc.html`.

## Les contrôles (`npm run e2e`, job `banc` de la CI)
Trois projets : `telephone` (Chromium 390 × 844), `pc` (Chromium 1440 × 900), `iphone` (WebKit). WebKit exige des
bibliothèques système (`npx playwright install-deps`) : sans elles, `--project=telephone --project=pc`.
- `garde.spec.ts` : aucune violation de CSP, aucune erreur de console ni exception ; la garde relève bien un style injecté
  et un appel vers un hôte tiers, et la CSP les **bloque** (le style n'est pas appliqué, le leurre n'est jamais atteint) : c'est
  ce qui prouve `enforce`, car l'événement de violation part aussi en `report-only`.
- `banc.axe.spec.ts` : axe (WCAG 2.0 à 2.2, A et AA, **contraste compris**) sur chaque section, avec et sans mouvement réduit ;
  le test compte aussi les contrastes mesurés (axe laisse « incomplet » un fond en dégradé ou recouvert : le nombre admis est borné, sa raison écrite).
- `banc.cibles.spec.ts` : cibles de 44 × 44 px (exceptions écrites une à une), ordre de `Tab`, indicateur de focus, `Maj+Tab`, aucun piège.
- `comparaison.spec.ts` : chaque cas du banc est capturé à côté de la même section de `.design/systeme/reference.html` (`captures/comparaison/<projet>/`).
  Le test échoue seulement si l'appariement est faux ou si une capture est vide, jamais sur un écart de pixels : la session de design juge.
  `node --experimental-strip-types e2e/comparaison/ecrit-index.ts captures/comparaison` (Node 22.18 ou plus) en tire `index.html` (une ligne par cas,
  la légende de la référence appariée, les deux images, les dimensions, « ÉCART » et un fond rouge au-delà de 2 px dans un sens) ; la CI le dépose en artefact `comparaison`.
- `banc.entree.spec.ts` : l'entrée d'écran (`Enter`) en Chromium : départ invisible, rapetissé et plus bas, arrivée dans l'ordre des rangs (70 ms
  d'écart), et, sous `prefers-reduced-motion`, ni déplacement ni agrandissement. `Enter` pose `data-entree="en-cours"` puis `"arrive"` : `attendLeRepos`
  l'attend avant toute mesure (mi-fondu, un texte a un faux contraste pour axe).
- `banc.base.spec.ts` : le lien d'évitement reste au-dessus d'un `.soleil` (`elementFromPoint`) ; l'anneau de focus de chaque
  composant (encre de 4 px, halo jaune de 11 px) est mesuré tel que Chromium le dessine.

Le banc se construit dans `dist/`, comme la prod : après `npm run e2e`, refaire `npm run build` avant tout `wrangler deploy` à la
main (la CI et `garde-du-build.sh` refusent un `banc.html` dans un build normal). `captures/` (F8b) est ignoré par Git.

## Ajouter une section
Un fichier de `src/banc/sections/` exporte `section: Section` (`src/banc/section.ts`) : `reference` (le `h2` de la section de
`.design/systeme/reference.html`) ou, sans pendant, `titre`, `colonne` (la largeur minimale d'une colonne de la grille en px, comme dans la
référence, ou `'pleine'` pour un bloc seul : sans elle, la comparaison mesure des cas plus larges ou plus étroits), et des `cas` : `legende`, `rendu`, et `reference`, le
**début** de la légende de la référence (sans casse ni espaces multiples ; l'égalité exacte l'emporte ; il doit désigner une seule
légende, sinon la comparaison échoue ; sans lui, le cas est signalé « sans pendant »). Une légende de la référence que le banc n'a pas
encore, dans une section déjà portée, fait échouer la comparaison : on porte une section en entier. Quand un autre lot porte le reste,
la section le dit par `reportees` (les débuts de légende à venir : « À maintenir » pour F10, les cases du code pour F11) ; le lot qui ajoute
le cas **retire** la déclaration, et une déclaration que le banc contredit échoue. Aucune liste à éditer : le banc
charge le dossier par `import.meta.glob`. Plusieurs fichiers de même titre sont fusionnés (le titre est `reference`, sauf `titre` explicite).
Pas de `style=` dans le HTML ; le prop `style` de React est admis, avec des `var(--…)`. Aucune donnée réelle : « Léa », `@exemple.fr`.
