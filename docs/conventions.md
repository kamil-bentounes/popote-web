# Conventions de popote-web

Reprises du § 8 de la [spec du socle](superpowers/specs/2026-11-12-socle-design.md).

### 8.1 Communes
- Identifiants du code et de l'API en anglais ; textes de l'écran, documentation et messages de commit en
  français.
- Commits Conventional Commits (`feat`, `fix`, `refactor`, `test`, `docs`, `chore`), description en français,
  sans ligne de co-auteur. Branches `type/sujet`. Demandes de fusion courtes (400 lignes visées), gabarit à
  quatre parties (quoi, pourquoi, comment vérifié, risques).
- `main` protégée : fusion seulement avec l'intégration continue verte et la revue faite.
- Chaque étape se ferme par une revue adverse (agent à l'œil frais), les tests par mutation sur la logique
  d'argent et de cycle, et un essai au navigateur avec captures regardées.


### 8.3 `popote-web`
- TypeScript strict ; routes typées (TanStack Router) avec chargement à la demande par route ; une frontière
  d'erreur par route ; données seulement par le client généré et des hooks TanStack Query par ressource, avec
  des clés précises (plus d'invalidation globale) ; aucun `fetch` hors de la couche API.
- Le relais Cloudflare (fichiers + `/api/*`) vit dans ce dépôt, avec l'adresse de l'API de chaque
  environnement en configuration.
- Suivi des erreurs du navigateur (D4) et budgets de performance (Lighthouse) dans l'intégration continue.

#### Règles durables de la fondation du front
Tirées des règles d'exécution du [plan de la fondation](superpowers/plans/2026-11-13-fondation-du-front.md) ; elles valent
pour toute la vie du dépôt. Chaque règle dit **où est sa garde** : une garde « à venir » n'existe pas encore, la règle
tient alors à la relecture.
- **Aucun `fetch`, `XMLHttpRequest`, `WebSocket` ni `EventSource` hors de `src/api/`** : garde à venir (test d'architecture, F5b).
  **Pas d'`import.meta.env.VITE_*`** : garde à venir (même test). **Pas de `dangerouslySetInnerHTML`** : garde en place
  (oxlint `react/no-danger`). **Pas de `<div onClick>`**, d'`<img>` sans `alt`, de `<label>` orphelin : garde en place (oxlint `jsx-a11y`).
- **Aucun texte en dur dans le JSX** : un catalogue par domaine, `src/textes/<domaine>.ts` (fonctions typées, pluriels par
  `Intl.PluralRules('fr')`). Les mots de la marque et les légendes du banc font exception. Pas de garde automatique prévue :
  relecture.
- **Une frontière d'erreur par route**, et un `document.title` par route : garde à venir (test des routes, F3 puis F19).
- **Pas de `style=` en ligne dans un fichier HTML, ni de `<script>` en ligne** : la CSP sera en `enforce` dès F23
  (`script-src 'self'; style-src 'self'`) ; garde à venir dans le build (F6).
- **Tests par rôle et nom** (`getByRole` d'abord, puis `getByLabelText` ; `getByTestId` en dernier recours), interactions par
  `userEvent.setup()`, chemin clavier avec `user.tab()`, horloge et hasard injectés : relecture. **`verifieAxe`
  (`src/test/axe.ts`) sur chaque composant** : relecture, puis le banc (F8) le parcourt. `verifieAxe` est une garde partielle :
  il ne mesure ni le contraste, ni la taille des cibles, ni les zones défilantes (happy-dom n'a pas de mise en page), qui se
  vérifient dans Chromium sur le banc.
- **Aucune donnée personnelle** dans les fixtures, le banc, les captures : prénom d'exemple « Léa », adresses `@exemple.fr`.
- **Pas de barrel `index.ts`** : on importe par chemin (relecture).
- **TypeScript strict** (`strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`) : garde en place, les tests sont compilés par
  `npx tsc -b`.
- **Dépendances** : les outils de test et de construction ajoutés par la fondation sont en versions exactes (`--save-exact`) ; une
  mise à jour est le travail de Dependabot, pas un effet de bord. Seules les licences MIT, Apache-2.0 et OFL-1.1 (polices)
  entrent dans le build livré : relecture et `npm view`. **MPL-2.0 admise le 13/11/2026 pour les outils de test non livrés,
  non modifiés (`axe-core`, `@axe-core/playwright`) ; jamais dans `dist/`** : garde en place, l'étape « Garde du build » de la CI
  refuse `axe-core` dans `dist/`.

---


## L'API

Le front ne parle qu'à `/api` (voir `popote-api/docs/normes-api.md`).
