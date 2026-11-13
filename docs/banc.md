# Le banc

Une page de développement qui montre chaque composant du système « Jeu » dans chacun de ses états, et les contrôles
qui la parcourent dans de vrais navigateurs. Elle n'est **jamais livrée** : `banc.html` est une seconde entrée Vite,
construite seulement en mode `banc` ; `scripts/verifie-build.mjs` refuse un `banc.html` dans un build normal.

## L'ouvrir
- Avec le relais local, CSP en `enforce` (ce que jouent les e2e) : `npm run build:banc`, puis
  `npx wrangler dev --port 4173 --var CSP_MODE:enforce --var RELAY_SECRET:banc --var API_ORIGIN:http://127.0.0.1:9`, page `/banc`
  (le relais redirige `/banc.html` vers `/banc`). `?fige` met les animations de Motion à leur état final.
- Avec Vite, sans CSP : `npm run dev`, page `/banc.html`.

## Les contrôles (`npm run e2e`, job `banc` de la CI)
Trois projets : `telephone` (Chromium 390 × 844), `pc` (Chromium 1440 × 900), `iphone` (WebKit). WebKit exige des
bibliothèques système (`npx playwright install-deps`) : sans elles, `--project=telephone --project=pc`.
- `garde.spec.ts` : aucune violation de CSP, aucune erreur de console ni exception ; la garde relève bien un style injecté
  et un appel vers un hôte tiers, et la CSP bloque (c'est ce qui prouve `enforce`).
- `banc.axe.spec.ts` : axe (WCAG 2.0 à 2.2, A et AA, **contraste compris**) sur chaque section, avec et sans mouvement réduit.
- `banc.cibles.spec.ts` : cibles de 44 × 44 px (exceptions écrites une à une), ordre de `Tab`, indicateur de focus, `Maj+Tab`, aucun piège.
- `banc.base.spec.ts` : le lien d'évitement reste au-dessus d'un `.soleil` (`elementFromPoint`) ; l'anneau de focus de chaque
  composant (encre de 4 px, halo jaune de 11 px) est mesuré tel que Chromium le dessine.

## Ajouter une section
Un fichier de `src/banc/sections/` exporte `section: Section` (`src/banc/section.ts`) : `reference` (le `h2` de la section de
`.design/systeme/reference.html`) ou, sans pendant, `titre`, et des `cas` (`legende`, `rendu`). Aucune liste à éditer : le banc
charge le dossier par `import.meta.glob`. Plusieurs fichiers qui désignent la même `reference` sont fusionnés.
Pas de `style=` dans le HTML ; le prop `style` de React est admis, avec des `var(--…)`. Aucune donnée réelle : « Léa », `@exemple.fr`.
