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
- **Aucun `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon` ni import d'`openapi-fetch` hors de `src/api/`** : garde en place
  (`src/architecture.test.ts`). Le même test refuse, **partout dans `src/`** (`src/api/` compris) : `VITE_*`, le nom de l'ancien fournisseur
  d'authentification (aussi dans `package.json`), `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, `popLayout` ; il lit le
  texte, commentaires compris, hors tests et schéma généré. **Une nouvelle règle** se pose dans `REGLES` avec son leurre dans `LEURRES`
  (un test refuse une règle sans leurre). `dangerouslySetInnerHTML` est aussi gardé par oxlint (`react/no-danger`).
  **Pas de `<div onClick>`**, d'`<img>` sans `alt`, de `<label>` orphelin : garde en place (oxlint `jsx-a11y`).
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

Tout appel passe par la couche `src/api/` (F5a) : `lit(client.GET(...))` rend les données ou lève `ErreurApi`,
`TropDeDemandes` ou `ErreurReseau` ; `litVide` sert les routes sans corps. Une écriture qui crée ou déclenche un effet
porte `nouvelleCle()` (le contrat la rend obligatoire au type) et, à la reprise, **la même** clé. Les états
transverses (réveil, limite, réseau, session) s'abonnent à `evenements` de `src/api/evenements.ts`.

**Une ressource = un fichier** de `src/api/ressources/` : ses clés (précises : `['moi']`, plus tard `['budget', mois]`), ses
`queryOptions` et ses hooks. Aucune invalidation globale : on invalide la clé de la ressource touchée. Les réglages de reprise
vivent dans `src/api/reprises.ts` : une lecture est rejouée deux fois au plus sur une coupure du réseau, un 502, un 503 ou un
504 (jamais sur un 4xx) ; une écriture n'est rejouée que par `optionsEcriture`, qui exige `cle` (la clé d'idempotence, de
`nouvelleCle()`) **dans les variables** de la mutation, jamais fabriquée dans `mutationFn` : TanStack Query rejoue avec les mêmes
variables, donc la même clé.

La clé se fabrique **une fois par intention** (état ou ref du composant), non à chaque clic ni dans la fonction de la mutation :
deux clics avec deux clés sont deux envois. Après un succès, on en fabrique une neuve, sinon le serveur rejoue l'ancienne réponse.
Elle est typée `CleIdempotence` (sortie de `nouvelleCle()` seule) et vérifiée à l'exécution. Le client de requêtes ne reprend les
écritures en pause au retour du réseau que monté : `QueryClientProvider` le fait, un test appelle `queryClient.mount()`.

**Un `retour` ou toute adresse venue de l'adresse du navigateur passe par `cheminSur`** (`src/api/chemin-sur.ts`) avant d'être
suivie : il n'accepte qu'un chemin de l'appli. Le routeur recopie les paramètres inconnus : on lit `retour` par `Route.useSearch()`,
jamais par `location.search`. Les routes qui exigent une session sont les enfants de `src/routes/_connecte.tsx`.
