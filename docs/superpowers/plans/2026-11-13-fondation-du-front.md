# La fondation du nouveau front

> **For agentic workers:** REQUIRED SUB-SKILL: Use `sp-subagent-driven-development` (recommended) or
> `sp-executing-plans` (les noms exacts de l'outil Skill de cette session, vérifiés le 13/11/2026 ; ce ne sont pas les
> `superpowers:*` des anciens plans) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for
> tracking.

**Goal :** retirer l'ancien front de `popote-web` et poser, à sa place, la fondation du nouveau : squelette
(React 19, Vite, TypeScript strict, TanStack Router et Query), client généré depuis le contrat de `popote-api` et
couche API unique, style « Jeu » (Tailwind 4, jetons, polices auto-hébergées), tous les composants du système en
React avec Motion, états transverses (réveil, chargement, erreur, trop de demandes, perte de réseau, session
expirée), PWA, déploiement sur l'essai, harnais de comparaison visuelle avec `reference.html`, budgets de
performance et accessibilité dans la CI. Rien ne change pour Kamil en prod : la nouvelle appli n'est pas en ligne.

**Architecture :** références : la spec du socle (`2026-11-12-socle-design.md`, « la spec »), § 2, § 7.3, § 8.3, § 9,
§ 10, § 11, **amendée par la section suivante** ; le système de design « Jeu » (PR #38, `.design/systeme/`, et sa
revue adverse `revue-pr38.md`, dont les points 5 à 19 sont repris ici comme consignes de portage) ; le plan 0.4bis
(la connexion sans mot de passe, dont l'écran est le parcours 1 « Entrer », hors de ce plan). Principe : **le front
n'a aucune configuration propre à un environnement** (un seul build pour l'essai et la prod : l'API est sur la même
origine, le relais porte les adresses et la CSP) ; **le CSS du système est porté, pas réécrit** (les composants
React posent ses classes, dans `@layer components`) ; **Motion sert ce qui est déclenché par un événement ou doit
finir et rendre la main** (entrée, feuille, tampon, confettis, maintien, jauge, tremblement, joie), le CSS garde
les boucles continues et les états sans script (appui, focus, marmite) ; **chaque garde est un test qui échoue**
(CSP du build, contrat, `/api` hors cache, aucun `fetch` hors de la couche API).

**Tech Stack :** React 19.3, Vite 8.3, TypeScript **~6.0** (voir D1), `@tanstack/react-router` 1.170 +
`@tanstack/router-plugin` 1.169 (routes par fichiers, `autoCodeSplitting`), `@tanstack/react-query` 5.10x,
`openapi-typescript` 7.13 + `openapi-fetch` 0.17, Tailwind 4.3 (`@tailwindcss/vite`), Motion 14.12
(`motion/react`, `LazyMotion`), `vite-plugin-pwa` 2.0 (+ `workbox-build`, `workbox-window` 7.4), Vitest 5.1 +
happy-dom 21 + Testing Library + `axe-core` 4.14 + MSW 3.0.4, Playwright 1.65 + `@axe-core/playwright`,
`@lhci/cli` 0.16, `oxlint` (plugins `react`, `jsx-a11y`, `typescript`, `oxc`, `vitest`), `wrangler` 4 (relais).
Versions vérifiées sur le registre npm le 13/11/2026 ; la dernière version de chaque dépendance qui date de plus de
3 jours (règle du skill `managing-dependencies-and-licenses`) : **motion 14.12.0** (la 14.13.0 date du 12/11), **msw 3.0.4** (la 3.0.5 date du 11/11),
**@testing-library/user-event 14.6.9** (la 14.6.10 date du 12/11), **@lhci/cli 0.16.0** (la 0.16.1 date du 11/11),
**jsdom non retenu** (voir D2). Playwright 1.65.0 (05/11), Tailwind 4.3.4 (celle du verrou ; 4.3.5 est sortie le 11/11).

**Hors périmètre :** les écrans des parcours (« Entrer » et les suivants : chacun a sa spec) et la navigation
générale (barre d'onglets, hub) ; le suivi des erreurs du navigateur (D4 de la spec : Sentry, palier gratuit, décidé le 13/11 ; son intégration est une tâche à part, la
fondation ne fait que `console.error` d'une référence) ; la lecture des images et des photos (§ 6) ; le temps réel
de la session de cuisine ; les aperçus par demande de fusion (`*.workers.dev`) ; le déploiement de la prod et son
fichier de configuration du relais (étape 0.8) ; l'internationalisation au-delà du français (voir « Écarts assumés ») ;
les corrections du système de design lui-même (déjà faites par la session de design dans la PR #38 fusionnée ; les écarts qui restent lui sont renvoyés en F25) ; toute logique métier (règles d'argent, du cycle : elles vivent dans l'API).

---

## Amendements à la spec (décision du 13/11/2026 : le nouveau front remplace l'ancien)

Kamil a tranché : le nouveau front remplace entièrement l'ancien, parcours par parcours, dans le style « Jeu ». La
spec supposait un front « rebranché » avec ses 34 parcours e2e comme filet. Ce plan écrit ce que cela change ; la
tâche F1 reporte ces lignes dans la spec.

| Spec | Avant | Après |
|---|---|---|
| § 1 « Stratégie » | « 34 parcours e2e comme filet » ; le front reste identique, rebranché | **le filet est neuf** : les e2e de chaque nouveau parcours (écrits avec lui), plus, pour la fondation, les contrôles de ce plan (CSP, `/api` hors cache, axe, comparaison visuelle, Lighthouse). Les 34 anciens parcours (`e2e/*.spec.ts`, branchés sur Supabase en direct par la clé de service) sont **retirés** ; ils restent lisibles dans l'historique (étiquette `ancien-front-2026-11-13`) et dans l'ancien dépôt, qui sert la prod jusqu'à la bascule |
| § 1 critère 2 | « les specs e2e (adaptées à la nouvelle connexion) sont vertes en local, sur l'essai et sur la prod » | « **les e2e des nouveaux parcours** sont verts en local et sur l'essai ; la fumée de prod (§ 11) joue le parcours « Entrer » après la bascule » |
| § 1 « Hors périmètre » | « Le design, les nouveaux parcours » | le design (système « Jeu ») est **dans** le périmètre de l'étape 0 pour sa part technique : tokens, composants, harnais ; les parcours restent hors de l'étape 0 sauf « Entrer », qui rend la connexion utilisable |
| § 1 « But » (« sans changer les écrans ») | écrans inchangés | écrans **neufs** ; l'ancienne appli reste telle quelle en prod jusqu'au jour J |
| § 2 « Les deux dépôts » (`popote-web` « reprend l'historique du dépôt actuel ») | l'ancien front vit dans `popote-web` | l'ancien front est retiré de `popote-web` (F1) ; `popote-web` ne contient que le nouveau front, le relais et le système de design |
| § 7.3 CSP | « posés par l'hôte du front » ; `report-only` tant que le front parle à Supabase | **enforce** dès F23 : plus aucun appel direct à Supabase ; la CSP gagne seulement **`object-src 'none'`** (le skill `building-frontends` l'exige ; F23) ; le reste ne change pas (`'self'` partout, `img-src` avec `data:` et `blob:`) ; aucune police, image ni script d'un autre domaine ; le build interdit tout script ou style en ligne et tout `data:` de police (F6) |
| § 8.3 `popote-web` | « routes typées… aucun `fetch` hors de la couche API » | inchangé, **et vérifié** : test d'architecture (F5) ; plus : une frontière d'erreur déclarée **par route** (F3, F19) ; `document.title` par route ; aucune variable `VITE_*` |
| § 9.1 dernière puce | « les specs Playwright aussi, jouées contre une pile locale complète (base, API, front) » | les specs Playwright du front se jouent **contre le relais local** (`wrangler dev`, CSP en `enforce`), l'API réelle pour les parcours (pile locale), une API simulée (MSW ou un relais sans amont) pour le banc |
| § 9.2 ligne `popote-web` | oxlint, tsc, vitest, génération du client, build, npm audit, gitleaks, Playwright | + **dérive du contrat** (copie épinglée, `oasdiff` contre `popote-api`), **garde du build** (CSP, `/api` hors cache), axe sur le banc, captures de comparaison (artefact), **Lighthouse** (budgets) |
| § 10 « Chaque domaine de 0.5 suit la même boucle » | « hooks du front basculés → e2e vertes » | « un hook TanStack Query par ressource, un écran dans le style « Jeu », les e2e du parcours verts en local et sur l'essai » |
| § 11 « dernière version de l'ancien site… » | sans changement | sans changement (l'ancien site est dans l'autre dépôt) ; **l'essai** n'a plus l'ancien front dès F1 : il sert une page d'attente qui remplace l'ancien service worker (voir risque 1) |

---

## Cadre : risque, hypothèses, décisions

**Risque : moyen** (nouvelles dépendances, changement de CI/CD, en-têtes de sécurité, déploiement de l'essai ; ni
authentification, ni donnée personnelle, ni prod, ni migration irréversible). Conséquences, selon
`planning-a-change` : critères négatifs, retour arrière écrit pour chaque tâche, revue adverse du plan (faite, voir
« Amendements après la revue adverse »). L'écran de connexion lui-même (parcours 1) est à risque élevé et a son
propre plan ; ce plan ne fait que le rendre possible (composants, états, session expirée). Aucune donnée
personnelle : le banc et les tests n'emploient que le prénom d'exemple du système (« Léa »).

### Décisions déjà prises
Le style « Jeu » (Fredoka et Nunito, OFL) ; le nouveau front remplace l'ancien parcours par parcours ; l'ancienne
appli reste en prod jusqu'à la bascule ; le système de design est livré par la PR #38 de `popote-web` ; première
connexion sans mot de passe (D3, plan 0.4bis).

### Décisions de ce plan (justifiées, vérifiées le 13/11/2026)

(Les **D1 à D13 de ce tableau sont celles de ce plan** ; la spec a ses propres D1 à D6 au § 12, qu'on cite toujours comme « D1 **de la spec** ».)

| N° | Décision | Pourquoi (source ou essai) |
|---|---|---|
| D1 | **TypeScript reste en `~6.0.x`** (pas la 7.0.2) ; `openapi-typescript` y est rattaché par `overrides` | `openapi-typescript@7.13.0` déclare `typescript: ^5.x` : `npm i` avec TS 6 échoue en `ERESOLVE`. Essayé : avec `"overrides": {"openapi-typescript": {"typescript": "$typescript"}}`, la génération marche avec TS 6.0.3 et **plante avec TS 7.0.2** (le port natif n'a pas l'API JS que le générateur emploie). `dependabot.yml` ignore déjà les majeures de `typescript` : cohérent |
| D2 | Tests de composants sous **happy-dom 21.0.4**, pas jsdom | essayé : jsdom 31 n'a ni `HTMLDialogElement.showModal`, ni `matchMedia`, ni `ResizeObserver`, ni `Element.animate` ; happy-dom les a. Ce que ni l'un ni l'autre ne prouvent (contraste, mise en page, piège de focus d'un `<dialog>`) se prouve dans Chromium sur le banc (F8) |
| D3 | Tailwind : jetons dans **`@theme static`** (+ `inline` pour les ombres), défauts coupés par `--color-*: initial` (et `--text-*`, `--radius-*`, `--shadow-*`, `--inset-shadow-*`, `--drop-shadow-*`, `--font-*`, `--ease-*`, `--animate-*`) ; composants dans **`@layer components`** ; `@font-face` et `@keyframes` **hors** couche | doc Tailwind (`theme`, `adding-custom-styles`) ; essayé avec `@tailwindcss/node` 4.3.3 (celle de l'ancien dépôt ; `jetons.test.ts` de F6 rejoue l'essai avec la version livrée) : sans `static`, une variable seulement lue par du JavaScript (Motion) n'est pas émise ; avec `static`, elle l'est ; `text-xl`, `bg-red-500`, `rounded-xl`, `font-sans` ne produisent plus rien ; `@theme static inline` est accepté ; ordre des couches `theme, base, components, utilities` : `className="bouton p-2"` marche. Les défauts qu'on ne coupe pas (`--spacing`, `--breakpoint-*`, graisses) servent la mise en page |
| D4 | **`build.assetsInlineLimit: 0`** | essayé : au-delà de 4 096 octets (défaut de Vite) une police n'est pas incorporée ; `fredoka-latin-ext.woff2` fait 4 576 octets, donc **à 480 octets près** d'un `data:font/woff2` que la CSP (`font-src` retombe sur `default-src 'self'`) refuse en silence. Relever la limite à 8 000 l'a bien incorporée |
| D5 | **PWA : `vite-plugin-pwa` 2.0.0, `injectRegister: false`**, inscription par `virtual:pwa-register/react` dans un module ; `registerType: 'prompt'` ; `navigateFallbackDenylist: [/^\/api\//, /^\/mail\//]` ; `runtimeCaching: []` | essayé avec Vite 8.3.6 : construction verte, **aucun script en ligne** dans `index.html`, `sw.js` contient `{denylist:[/^\/api\//]}` et le précache ne liste que les fichiers du build. `'inline'` poserait un script en ligne (interdit par `script-src 'self'`, doc du plugin). `workbox-build` et `workbox-window` sont des pairs à installer. L'option `selfDestroying` existe (retour arrière, F22). Les images de `public/mail/` servent aux mails de rappel : elles ne sont ni précachées ni reprises par le repli de navigation |
| D6 | Le **banc** (route de développement) est une **seconde entrée Vite** (`banc.html`), construite seulement en mode `banc` | une route du routeur serait dans le bundle de prod ; ici un test échoue si `dist/` d'un build normal contient `banc.html` ou un fragment de `banc`. Servi par le vrai relais, donc sous la vraie CSP |
| D7 | Les e2e et le banc se jouent contre **`wrangler dev`** (relais local) avec `--var CSP_MODE:enforce` | essayé : le relais sert `dist/` avec `Content-Security-Policy` en `enforce` et les en-têtes de sécurité, et rend sa `502 api_indisponible` quand l'amont est absent. Un serveur `vite preview` n'enverrait **aucune** CSP : une violation passerait inaperçue. Essayé aussi : `upgrade-insecure-requests` ne réécrit pas les requêtes vers `http://127.0.0.1` ; et le premier essai (un `dist` laissé avec `assetsInlineLimit` relevé et un module virtuel non résolu) a fait lever à Chromium **deux** violations réelles (`font-src data:`, `script-src`) que la garde de F8 attrape |
| D8 | Contrat : **copie épinglée** `contrat/openapi.json` + `contrat/AMONT` (SHA du commit de `popote-api`) ; client généré **commité** ; `oasdiff breaking` de la copie contre `main` de `popote-api` | `popote-api` est publique (`raw.githubusercontent.com` répond 200 sans jeton). `openapi-typescript --check` sort `0` quand le fichier est à jour et `1` (« Generated types are not up-to-date! ») sinon (essayé). `oasdiff` 1.35.0, version et somme figées comme dans la CI de `popote-api` |
| D9 | Les en-têtes d'écriture viennent **du contrat**, pas d'une liste à la main | le contrat déclare `Idempotency-Key` en paramètre d'en-tête sur les `POST` qui l'exigent : `openapi-fetch` rend le paramètre **obligatoire au type** ; l'oublier ne compile pas. Forme : chaîne RFC 9651 **entre guillemets** (`"…"`, `normes-api.md` § 3.5). `X-Popote-Client: web` est posé par le client (garde d'origine de l'API) |
| D10 | Un composant du système = **un composant React mince qui pose les classes du système** ; le CSS de `composants.css` est copié dans `src/styles/` (couche) | le système dit « le CSS de référence à porter tel quel » ; la parité visuelle se prouve par le banc. Les écarts de structure (accessibilité) sont des commentaires `/* écart au système : … */` dans le CSS, listés en F25 pour la session de design |
| D11 | **Pas de CSS ni de composant animé en double** : un composant animé par Motion perd ses `@keyframes` dans `composants.css` ; la marmite, le soleil, l'appui et le focus restent en CSS | la doc Motion : `reducedMotion="user"` coupe seulement les transformations, pas `opacity` ; le système veut « plus de rotation ni de saut » : politique unique dans `src/ui/mouvement.ts` (fonctions pures, testées) |
| D12 | Textes : un fichier de **catalogue par domaine** `src/textes/<domaine>.ts` (fonctions typées, pluriels par `Intl.PluralRules('fr')`) ; aucun texte en dur dans le JSX | skill `building-frontends` (catalogue, `Intl`). Écart assumé : pas de bibliothèque ICU (une seule langue) |
| D13 | Les valeurs de `data-etat` de la marmite et les classes du système restent **en français** (vocabulaire du système) ; identifiants du code en anglais | spec § 8.1 ; les valeurs sont celles de `composants.css` : les traduire créerait une table de correspondance de plus à garder juste |

### Valeurs proposées par ce plan (à relire avec le plan)

| Valeur | Choix | Pourquoi |
|---|---|---|
| Seuil du réveil | 2 000 ms sans réponse **et aucune réponse depuis 5 minutes**, affichage 1 200 ms au moins, message plus long après 12 s | la veille dure 5 à 7 s (consigne) ; elle suit une inactivité ; en dessous de 2 s, une page lente n'est pas une veille ; le relais coupe à 30 s. Les 5 minutes sont un choix de ce plan (à ajuster à la mesure : Kamil a décidé le 13/11 **pas d'instance toujours allumée**, donc la veille sera fréquente ; la durée réelle d'inactivité avant la veille se mesure sur l'essai) |
| Reprises | `GET` : 2 reprises sur réseau, `502`, `503`, `504` (attente `Retry-After`, 10 s au plus) ; `POST` : seulement avec la **même** `Idempotency-Key` ; jamais sur 4xx | `normes-api.md` § 3.5 et § 3.6 |
| `Retry-After` absent ou illisible sur une `429` | 10 s | l'API le pose toujours ; ceci n'est qu'un repli |
| Maintien | 2 000 ms (règle 8 du système) ; **alternative sans maintien** : deux appuis brefs, 0,6 s au moins et 5 s au plus d'écart | WCAG 2.1.1 (toute fonction au clavier) et 3.3.4 (confirmer un geste irréversible) ; sans alternative, une personne qui ne peut pas tenir 2 s ne pourrait plus supprimer. À valider avec la session de design et à la main (question 2) |
| Budgets Lighthouse (mobile, build de prod, `/entrer`) | performance ≥ 0,9 ; accessibilité = 1 ; bonnes pratiques ≥ 0,95 ; LCP ≤ 2 500 ms ; CLS ≤ 0,1 ; TBT ≤ 200 ms ; **JS ≤ 200 ko, CSS ≤ 30 ko, polices ≤ 80 ko, requêtes tierces = 0** | LCP, CLS : skill `building-frontends` (web.dev) ; les poids sont **provisoires** : F24 mesure et fige « mesure + 15 % » ; on ne les relève jamais sans raison écrite |
| Entrée d'écran | le premier élément (rang 0) n'a aucun retard ; au plus ~650 ms au total pour les premiers éléments | une entrée qui part de `opacity: 0` retarde le LCP : le budget le mesure |

### Questions tranchées le 13/11/2026 (et ce qui reste ouvert)

1. **Icônes** : la session de design les livrera plus tard dans `.design/systeme/icones/` (SVG source, PNG 192 et 512, maskable,
   `apple-touch-icon` 180, favicon). F22 les prend **si elles sont là**, sinon garde les anciennes (vertes).
2. **Bouton à maintenir : la session de design accepte les deux appuis brefs, à une condition.** Après un premier appui bref, le libellé
   devient « Appuie encore pour confirmer » et le bouton **reste armé 5 s**, puis revient à « Maintiens pour supprimer » ; le second appui n'est
   accepté **qu'après 0,6 s** ; l'annonce (`role="status"`) dit **la même phrase** ; **la preuve d'identité reste exigée avant**, dans les deux cas ;
   **pas de case « Je confirme »**. (F10, avec ses tests.)
3. **WebKit dans la CI : oui** pour les e2e des parcours (Kamil parle de Face ID, donc d'un iPhone), **au moins le parcours critique et le banc** ;
   Chromium seul pour le reste si c'est trop lent (F8).
4. **Bannière « Nouvelle version » : oui, jamais de rechargement forcé**, et **pas de mise à jour tant qu'un formulaire est modifié ou qu'une écriture
   attend** (F22).
5. **Phrases d'état** (réveil, trop de demandes, perte de réseau, session expirée) : proposées dans `src/textes/` ; **Kamil les relit sur le banc dès
   que F8 existe** (le banc les montre toutes ; F8 le note).
6. **Seuils et budgets** : provisoires jusqu'à la mesure de F24 ; **les budgets Lighthouse sont tous en `error`**.

Reste ouvert : la durée réelle d'inactivité avant la veille du conteneur (se mesure sur l'essai) ; le suivi des erreurs du navigateur (D4 de la spec :
Sentry, palier gratuit, décidé le 13/11 ; son intégration est une tâche à part).

### Hypothèses non vérifiées (à confirmer à la source avant la tâche concernée)

- **Le comportement du lecteur d'écran** sur le bouton à maintenir (VoiceOver iOS, TalkBack) et sur les annonces de
  la marmite : ni happy-dom ni Chromium ne le prouvent ; F10, F17 et F25 le notent comme **non prouvé** et le
  regroupent dans les gestes de Kamil.
- **L'ancien service worker de l'essai** se remplace par celui de F1 : `registerType: 'autoUpdate'` de l'ancien
  build, même fichier `sw.js`, même portée. Lu dans l'ancienne configuration, pas rejoué sur un navigateur qui a
  l'ancienne appli installée (F1 prévoit l'essai : étape « essai sur un navigateur qui a l'ancien front »).
- **`Retry-After` en date HTTP** : l'API ne pose que des secondes ; le parseur accepte les deux par prudence.
- **`axe-core` sous MPL-2.0** : outil de test, non distribué ; à confirmer contre la liste de licences du skill
  `managing-dependencies-and-licenses` avant F2 (aucune autre licence que MIT, Apache-2.0 et OFL-1.1 pour les polices
  n'entre dans le build livré : vérifié avec `npm view … license`).
- **Taille réelle du JavaScript de départ** : les budgets Lighthouse sont provisoires (voir plus haut).

### Écarts assumés aux skills

- Pas de bibliothèque ICU MessageFormat (D12) ; pluriels par `Intl.PluralRules`.
- `axe-core` appelé directement en test de composant (le contraste est coupé : happy-dom n'a pas de mise en page) ;
  le contraste se vérifie dans Chromium sur le banc.
- Aucun `jest-axe` : sa règle de contraste est coupée en jsdom, et `axe-core` direct suffit (essayé : détecte un bouton
  sans nom, ne se plaint pas d'un arbre propre).
- La CSP reste `script-src 'self'` (pas de hachages) : le skill l'admet quand l'hébergement ne sert pas de hachages ;
  le relais pourrait les poser mais le build n'a aucun script en ligne à hacher. À noter dans l'ADR du relais si
  Kamil le demande.

---

## Critères d'acceptation (preuve : tâche entre crochets)

1. *Étant donné* l'essai qui sert encore l'ancien front, *quand* F1 est déployé, *alors* `https://essai.notre-popote.fr/`
   répond 200 avec les en-têtes de sécurité, la fumée est verte, `dist/` ne contient ni `supabase` ni `sb_publishable`,
   un navigateur qui avait l'ancien service worker passe au nouveau **à sa deuxième visite** (la première est encore servie par
   l'ancien service worker ; voir « Constats de F1 »), et ses clés `sb-*` du `localStorage` sont effacées. [F1]
2. *Étant donné* le contrat épinglé, *quand* quelqu'un modifie `contrat/openapi.json` ou `src/api/schema.d.ts` sans
   régénérer l'autre, *alors* la CI échoue ; *quand* `popote-api` publie sur `main` une rupture de son contrat (**tout** le
   contrat compte : on ne tient pas la liste des routes consommées), *alors* le contrôle quotidien et celui de `main`
   échouent et celui des demandes l'annonce ; un ajout compatible reste vert
   avec une notice ; **aucun `fetch`, `XMLHttpRequest`, `WebSocket` ni `EventSource` n'existe hors de `src/api/`**. [F4, F5]
3. *Étant donné* le build de prod servi par le relais avec la CSP en `enforce`, *quand* Chromium parcourt `/entrer` et
   le banc au téléphone (390×844) et au PC (1440×900), *alors* il n'y a **aucune violation de CSP** ni erreur de
   console ; un script ou un style en ligne, un `data:font`, une police ou une image d'un autre domaine **fait échouer
   le build**. [F6, F8, F23]
4. *Étant donné* chaque composant du système et chacun de ses états (tableau du `LISEZMOI` du système), *quand* le
   banc le rend, *alors* il existe en React, a ses tests Testing Library (rôle, nom, clavier), **zéro violation axe**
   dans Chromium et WebKit aux deux tailles, **des cibles d'au moins 44 × 44 px et un parcours au clavier prouvés par mesure**, une capture placée à côté de la même section de `reference.html`, et sous
   `prefers-reduced-motion` les **sept états de la marmite se distinguent** par leur dessin. [F8 à F17, F25]
5. *Étant donné* une API lente, limitée, coupée ou qui répond `401`, *quand* l'écran appelle l'API, *alors* le réveil
   s'affiche après 2 s et disparaît à la première réponse ; une `429` montre un compte à rebours fondé sur
   `Retry-After` ; la perte du réseau est annoncée et les écritures reprennent avec la **même** `Idempotency-Key` ; un
   `401` hors des routes publiques vide le cache privé et mène à `/entrer?raison=expiree&retour=…` **sans jamais
   accepter un `retour` hors de l'origine** (`//x`, `/\x`, `https://x`, `javascript:`) ; aucune erreur n'affiche un
   message technique ou en anglais. [F18 à F21]
6. *Étant donné* la PWA installée, *quand* le navigateur appelle `/api/*`, *alors* **aucune réponse de l'API n'est ni
   précachée ni mise en cache à l'exécution** (vérifié dans le `sw.js` construit et dans Chromium), la coquille
   s'ouvre hors ligne, et une nouvelle version est proposée par une bannière. [F22]
7. *Étant donné* le build de prod sur `/entrer`, *quand* Lighthouse (mobile) le mesure trois fois, *alors* les budgets
   de « Valeurs proposées » tiennent ; la CI échoue sinon. [F24]

**Cibles non fonctionnelles.** Accessibilité : WCAG 2.2 A et AA, RGAA 4.1.2 (skill `building-frontends`) ; contraste
4,5:1 du texte et 3:1 des composants **vérifié par calcul sur les jetons** (F7) et par axe dans Chromium ; cible
tactile 44 px (système). Performance : voir les budgets. Compatibilité : Chrome et Edge récents, Safari iOS récent
(les deux personnes du foyer) ; l'ancien service worker de l'essai est remplacé (F1). Flexibilité : aucun
`import.meta.env.VITE_*`, un seul build pour l'essai et la prod (test d'architecture, F5). Maintenabilité : une
tâche = une PR ≤ 400 lignes, chaque composant testable seul, aucun fichier partagé que deux lots doivent éditer en
même temps (le banc charge ses sections par `import.meta.glob`, pas de barrel).

---

## Plan de fichiers cible

```
index.html                      entrée de l'appli (une seule balise <title> : posée par le routeur, voir F3)
banc.html                       entrée du banc (mode `banc` seulement, jamais dans la prod)
contrat/openapi.json            copie épinglée du contrat de popote-api ; contrat/AMONT = SHA de son commit
src/
  main.tsx                      StrictMode, fournisseurs, routeur
  routeTree.gen.ts              généré par le plugin du routeur, commité, vérifié en CI
  routes/                       __root.tsx, index.tsx, _connecte.tsx, entrer.tsx, … (une frontière d'erreur chacune)
  api/                          client.ts, appel.ts, erreurs.ts, schema.d.ts (généré), ressources/ (un fichier par ressource)
  etats/                        reveil, chargement, erreur, trop-de-demandes, reseau, session-expiree
  ui/                           un fichier par composant : Button.tsx, Button.test.tsx, … ; mouvement.ts ; MotionProvider.tsx
  styles/                       index.css, jetons.css, polices.css, composants.css, polices/*.woff2
  textes/                       un catalogue par domaine (fr)
  banc/                         main.tsx, banc.css, sections/*.tsx (une par composant ou état)
  pwa/                          MiseAJour.tsx
  test/                         setup.ts, axe.ts
e2e/                            playwright : banc.axe.spec.ts, comparaison.spec.ts, pwa.spec.ts, … (+ parcours plus tard)
scripts/                        sync-contrat.mjs, verifie-build.mjs, verifie-jetons.mjs, fumee-essai.sh
relais/                         inchangé, sauf F23 (cache des fichiers)
.design/systeme/                la référence (PR #38) : on n'y touche pas
```

## Règles de portage (revue de la PR #38, points 5 à 19) : où chacun est traité

| Point | Consigne | Tâche |
|---|---|---|
| 5 | `composants.css` dans `@layer components` ; `@font-face` et `@keyframes` dehors | F7 (test : aucune règle hors couche sauf ces deux at-rules) |
| 6 | défauts de Tailwind coupés ; `@theme static` ; `@theme inline` pour les ombres | F6 (D3) |
| 7 | CSP : pas de `<style>` ni d'attribut `style` en ligne, pas de `<script>` en ligne, `<Marmite>` et non `innerHTML`, polices par le pipeline de Vite | F6 (garde du build), F8 (banc sans style en ligne), F17 |
| 8 | `.maintenir` au clavier (Espace, Entrée) + annonce de la progression | F10 |
| 9 | `.bouton[aria-busy]` bloque aussi le clavier : `aria-disabled` et garde | F9 |
| 10 | l'état de la marmite est annoncé ; icônes `<i>` en `aria-hidden` ou vrais éléments | F17 (`<Pot>`), F13 (icônes SVG) |
| 11 | `small` hors du `<label>`, `aria-describedby`, `aria-invalid` | F9 |
| 12 | pas la couleur seule : suivi (coche, `aria-current`), cases (icône, texte), jauge (`role="progressbar"`) | F11, F13 |
| 13 | valeurs en dur : jetons | F6 (parité) ; ce qui manque au système reste à la session de design ; le SVG de la marmite passe par des classes et des jetons existants (tomate, jaune, rose, encre, papier) |
| 14 | `jetons-racine.css` copié à la main | F6 : `verifie-jetons.mjs` compare `src/styles/jetons.css` au système **et** signale une dérive de `jetons-racine.css` |
| 15 | commentaires de contraste approximatifs ; erreur sur tomate pâle = 4,25:1, pas du texte | F7 (le test de contraste le prouve, l'écart est signalé à la session de design) |
| 16 | « sept états », « abouti » sans état CSS | F10 (`data-abouti`), F17 |
| 17 | glyphes ✕ ✓ → hors police ; vapeur invisible sur crème | F13 (SVG), F17 |
| 18 | boucles sans fin | F13 (jauge : rayures seulement pendant l'arrivée) ; le soleil et le clignement restent, coupés en mouvement réduit |
| 19 | `html`, safe-area, `:focus-visible` des cases et de l'avatar, préchargement des deux woff2 latins | F7 (couche `base`), F6 (`<link rel="preload">`) |

---

## Règles d'exécution (valables pour chaque tâche)

Celles de 0.3, 0.4 et 0.4bis s'appliquent : TDD avec test négatif de chaque garde et **épreuve de la mutation** ;
une tâche = une branche = une demande de fusion en brouillon ≤ 400 lignes hors fichiers générés (`src/api/schema.d.ts`,
`src/routeTree.gen.ts`, `package-lock.json`, `contrat/openapi.json`) ; gabarit à quatre parties, `Closes #<issue>` ;
commits Conventional en français, `Refs: #<issue>`, **aucune ligne de co-auteur** ; worktree
`~/PERSO/popote-web-<sujet>`, remote `github-perso`, **jamais `gh`** (API REST) ; aucun accès à la prod ; secrets
seulement dans `~/.config/popote/secrets.env`, jamais affichés ; `main` protégée. Ajouts :

- **Skills à charger avant d'écrire du code**, par leur **nom exact dans l'outil Skill** (tous vérifiés le 13/11 dans la liste de la
  session ; un nom absent de la liste d'un agent est un défaut du plan : il s'arrête et le dit) : `sp-writing-plans` (si le plan doit
  être recoupé), `silae-engineering:building-frontends`, `writing-tests`,
  `writing-clean-code`, `writing-commits`, `opening-pull-requests`, plus `building-ci-pipelines` (F1, F4, F8, F23, F24),
  `managing-dependencies-and-licenses` (toute tâche qui ajoute un paquet), `researching-official-docs` (F2, F3, F5,
  F6, F22, F24), `securing-code` (F5, F21), `frontend-design:frontend-design` (F9 à F17, F25) ; `sp-test-driven-development` et `sp-verification-before-completion` pour toute tâche. **Un agent ne cite rien de
  mémoire** : il relit la page de la source nommée dans la tâche.
- **Chaque composant (F9 à F17) livre quatre choses :** (1) le composant et son test Testing Library (requêtes par rôle
  et nom d'abord, `userEvent.setup()`, chemin clavier avec `user.tab()`, horloge et hasard injectés, `axe` de
  `src/test/axe.ts` sans contraste) ; (2) sa **section du banc** `src/banc/sections/<nom>.tsx` avec **chaque état**
  du tableau du `LISEZMOI` du système ; chaque cas déclare `reference`, **le début de la légende de `reference.html`** (le script
  l'apparie à la légende **lue dans la page de référence**, jamais retapée en entier : voir F8) ;
  (3) son passage axe dans Chromium (automatique : le banc le parcourt) ; (4) sa capture (automatique : F8). Une PR
  de composant joint à sa description le lien de l'artefact de comparaison de la CI.
- **Pas de barrel `index.ts`, pas de liste centrale à éditer** : on importe par chemin ; le banc charge
  `src/banc/sections/*.tsx` par `import.meta.glob` ; les catalogues sont un fichier par domaine. C'est ce qui permet
  à plusieurs agents de travailler en parallèle sans se marcher dessus. Les seuls fichiers partagés se rebasent : `vite.config.ts`, `package.json`, `index.html`, `ci.yml`, `composants.css`, `src/etats/Transverses.tsx` (une ligne par état : F18, F21), `src/styles/index.css` ; `src/routes/_connecte.tsx` et `entrer.tsx` (F5b, F21) ; un conflit sur `package-lock.json` se règle en
  le régénérant (`npm install`), jamais à la main.
- **Pas de `fetch` hors de `src/api/`** ; pas d'`import.meta.env.VITE_*` ; pas de `dangerouslySetInnerHTML` ; pas de
  `<div onClick>` (oxlint `jsx-a11y`) ; pas de `style=` en ligne dans un fichier HTML ; le prop `style` de React
  est admis (posé par le CSSOM, permis par `style-src 'self'`), mais une valeur qui vient d'un jeton passe par une
  classe ou `var(--…)`.
- **Aucun texte en dur dans le JSX** : catalogue `src/textes/<domaine>.ts`. Les mots de la marque (« Popote ») et les
  légendes du banc font exception (le banc n'est pas livré).
- **Aucune donnée personnelle** dans les fixtures, le banc, les captures : prénom d'exemple « Léa » du système,
  adresses `@exemple.fr`.
- **Mutations :** chaque tâche liste les siennes ; **chacune doit casser un test** (on la joue à la main sur une
  copie, on voit le rouge, on la retire), rejouées en F25.
- **Fini** = lint, `npx tsc -b`, `npm test`, `npm run build` verts en local ; CI verte ; revue adverse (agent Sonnet,
  effort high, lecture seule ; Codex CLI en lecture seule en plus) pour F1, F5, F6, F10, F21, F22, F23 ;
  constats traités ; mutations jouées ; la section du banc est à jour.

---

## Ordre et voies

| Voie | Tâches, dans l'ordre | Dépend de |
|---|---|---|
| **A. Socle** | F1 retrait · F2 outillage · {F3 routeur · F4 contrat · F6 style} en parallèle · F5 client (après F3 et F4) | F1 d'abord ; **la PR #38 est fusionnée** (08d4fb4, le 13/11 à 11 h 06, avec ses corrections : anneau de focus, mouvement réduit, signes dessinés des sept états de la marmite, jetons `voile`, `tomate-clair`, `ciel-clair`, soleils, tailles de texte) |
| **B. Système** | F6 jetons · F7 composants.css · F8 banc et comparaison · puis les lots : F9, F12, F14, F17 (indépendants) ; F10, F11, F13, F15, F16 **après F14** (fournisseur Motion et politique de mouvement) ; F10 et F15 aussi après F9 (Button) | F8 avant tout lot |
| **C. États** | F18 réveil · F19 chargement et erreur · F20 trop de demandes · F21 réseau et session | F5 et F17 (marmite) ; F19 après F3 ; F18, F20, F21 ont besoin de F9 (Button) et F12 (Block) |
| **D. Livraison** | F22 PWA · F23 déploiement de l'essai · F24 Lighthouse | F22 après F6 et F3 ; F23 après F22 et F8 ; F24 après F23 |
| **Clôture** | F25 | toutes |

Parallèle possible, **sans conflit de fichier** : F3 ‖ F4 ‖ F6 (seuls `vite.config.ts` et `package.json` se
rebasent) ; F9 ‖ F12 ‖ F14 ‖ F17 après F8 ; F10 ‖ F11 ‖ F13 ‖ F15 ‖ F16 après F14 (F10 et F15 aussi après F9) ; F18 ‖ F20 après F5 et F17.
Au plus **quatre** agents en même temps (un artefact de comparaison par PR, et la CI de la même machine).

**Coupes prévues** (une tâche qui dépasse 400 lignes se coupe **à l'avance** ainsi, comme dans 0.4bis ; les estimations des tâches sont
des estimations, tests et banc compris) :

| Tâche | Coupe |
|---|---|
| F8 | **F8a** : banc, entrée `banc.html`, sections Couleurs et Typographie, configuration Playwright, garde, axe, job CI · **F8b** : comparaison (appariement, captures, index, artefact) |
| F10 | **F10a** : maintien (pointeur, clavier, minuteur, annonces) · **F10b** : alternative par deux appuis, banc, e2e |
| F5b | **F5b-1** : reprises, client de requêtes, `moi`, `cheminSur`, garde · **F5b-2** : test d'architecture |
| F14 | **F14a** : fournisseur, `mouvement.ts`, `Screen`, `Enter` · **F14b** : `Sun`, `Ground`, `Stamp` |
| F18 | **F18a** : machine à états et magasin · **F18b** : écran et banc |
| F19 | **F19a** : `Chargement`, `ErreurEcran`, `ErreurRoute` · **F19b** : `NonTrouvee`, `defaultPendingComponent`, extension du test des frontières |
| F21 | **F21a** : réseau · **F21b** : session expirée |

**Coordination avec 0.4bis :** la partie `popote-web` de S16 (`e2e/banc-connexion/`,
`e2e/connexion-sans-mot-de-passe.spec.ts`) dépend de **F1** (le dossier `e2e/` est vidé) et de **F8** (la configuration
Playwright neuve, le relais local). Le dossier `e2e/` de F8 est organisé pour l'accueillir (un fichier par parcours,
un dossier `e2e/banc-connexion/` laissé libre). S17 reporte les amendements de la spec § 4 : **même fichier que F1,
sections différentes** ; le second à fusionner rebase.

---

## Les tâches

Chaque tâche : **Dépend de**, **En parallèle de**, **Taille** (lignes ajoutées estimées, hors fichiers générés),
fichiers, cases à cocher, cas de test (négatifs compris), mutations, retour arrière.

### F1 : Retirer l'ancien front sans casser le relais, la CI ni l'essai

**Pourquoi :** décision du 13/11 (le nouveau front remplace l'ancien). Le relais (`relais/`, `wrangler.jsonc`), la
fumée (`scripts/fumee-essai.sh`) et le déploiement de l'essai ne dépendent pas de l'ancien front, **mais** l'essai sert
`dist/` : un `dist/` vide ferait échouer le déploiement et la fumée, et un navigateur qui a l'ancien service worker
(`registerType: 'autoUpdate'`, même `sw.js`, même portée) resterait **bloqué sur l'ancienne appli** si le prochain
déploiement n'avait pas de `sw.js` (le repli SPA lui rendrait `index.html`). F1 pose donc une **page d'attente** qui
garde l'inscription d'un `sw.js`, et efface les jetons Supabase que l'ancien front a laissés dans le navigateur.

**Dépend de :** rien. **En parallèle de :** rien (tout le reste en dépend). **Taille :** ≈ 250 lignes ajoutées et
**≈ 71 000 supprimées** : étiquette `size-justified`, preuve : `git diff --numstat --diff-filter=D` couvre `src/`,
`e2e/`, `public/budget/` et les `.env.*`, et la liste des fichiers modifiés tient en une page.

**Fichiers :** supprimer `src/`, `e2e/`, `public/budget/`, `.env.essai`, `.env.production`, `.env.test`,
`.env.example`, `playwright.config.ts`, `tsconfig.app.json` (réécrit). **Garder** : `relais/`, `wrangler.jsonc`,
`scripts/fumee-essai.sh`, `public/mail/` (les mails de rappel de l'ancienne appli y vont chercher `lasagnes.png`,
`congelateur.png`, `ticket.png`), `public/icone-*.png`, `public/icone.svg`, `public/logo.svg`, `.gitleaks.toml` et
`.gitleaksignore` (**l'historique contient encore les clés publiables Supabase** : retirer l'exception ferait échouer
le job `secrets`, qui lit tout l'historique), `.design/mesures/` et `.design/superpowers/` (anciens documents, hors
périmètre). Créer : `index.html` (page d'attente : `lang="fr"`, un `<title>`, aucun script ni style en ligne, aucune
police externe), `src/main.ts`, `src/attente.css`, `src/ancien-front.ts`, `src/ancien-front.test.ts`, `scripts/verifie-sw-remplacant.mjs`, `scripts/verifie-sw-remplacant.test.mjs`. Modifier :
`vite.config.ts`, `package.json`, `package-lock.json`, `tsconfig.json`, `tsconfig.app.json`,
`.github/workflows/ci.yml`, `AGENTS.md`, `README.md`, `docs/README.md`, `docs/conventions.md`, la spec.

- [ ] Poser l'étiquette `ancien-front-2026-11-13` sur `origin/main` (`git tag -a … origin/main` puis
  `git push origin ancien-front-2026-11-13` ; une étiquette n'est pas un envoi sur `main`). La mettre dans la
  description de la PR.
- [ ] `git rm -r -q` des chemins ci-dessus. Retirer de `package.json` : `@supabase/supabase-js`, `nyc`,
  `vite-plugin-istanbul`, `pg`, `@types/pg`, `dotenv` ; les scripts `e2e` et `couverture` ; **garder** `react`,
  `react-dom`, `@tanstack/react-query`, `motion`, Tailwind, `vite-plugin-pwa`, `@playwright/test`, `vitest`,
  `oxlint` (ils servent dès F2 ; Dependabot ignore déjà les majeures de `motion` et `typescript`). `test` devient
  `vitest run`.
- [ ] `vite.config.ts` : retirer `istanbul`, la base `PAGES` (`/batchcooking/`) et le bloc `test` (le délai de 30 s
  servait aux tests de base). Garder `VitePWA` avec `registerType: 'autoUpdate'` et
  `workbox: { cleanupOutdatedCaches: true, clientsClaim: true, skipWaiting: true, navigateFallbackDenylist: [/^\/api\//, /^\/mail\//] }` ;
  manifeste : `start_url: '/'`, sans `base`.
- [ ] `tsconfig.app.json` (réécrit ici, pas en F2 : **sans `vite-plugin-pwa/client` dans `types`, `src/main.ts` ne compile pas**, `virtual:pwa-register` est
  alors introuvable, `TS2307`) : `types: ["vite/client", "vite-plugin-pwa/client"]`, `include: ["src"]`. `npx tsc -b` est vert sur un clone propre.
- [ ] `src/ancien-front.ts` : `nettoieAncienFront(stockage: Pick<Storage, 'key' | 'removeItem' | 'length'>)` efface
  les clés `sb-*` et `supabase.auth.token` (les jetons que l'ancien front lisait en JavaScript) et **rien d'autre** ;
  ne lève jamais (stockage refusé : navigation privée). `src/main.ts` l'appelle puis `registerSW({ immediate: true })`
  (`virtual:pwa-register`).
- [ ] `ci.yml` : `npm run build -- --mode development` et `--mode essai` deviennent `npm run build` (plus de
  variables d'environnement : `.env.essai` n'existe plus) ; après la construction du job `front`, une étape
  `test -f dist/index.html && test -f dist/sw.js && node scripts/verifie-sw-remplacant.mjs dist/sw.js && ! grep -rqiE 'supabase|sb_publishable' dist`
  (le `sw.js` remplace l'ancien : il doit s'activer seul, donc contenir `self.skipWaiting(),x.clientsClaim()` (forme de
  `autoUpdate`). **Un simple `grep skipWaiting` ne suffit pas** : la revue l'a rejoué, le mode `prompt` contient aussi `skipWaiting`,
  dans un écouteur de message. `scripts/verifie-sw-remplacant.mjs` et son test portent les deux formes) ; supprimer la ligne
  « `.env.essai` (versionné)… » ; la fumée est inchangée.
- [ ] Docs : `AGENTS.md` (retirer « jusqu'à l'étape 0.5 il parle encore à Supabase » et « E2E : `npm run e2e` » ;
  ajouter « ancien front : étiquette `ancien-front-2026-11-13` »), `README.md`, `docs/README.md` (ligne de ce plan),
  `docs/conventions.md` (retirer le paragraphe « Jusqu'à l'étape 0.5 »), et **la spec** : reporter le tableau
  « Amendements à la spec » ci-dessus (les lignes de §§ 1, 2, 7.3, 9.1, 9.2, 10) et ajouter en fin de fichier la
  section « Amendement du 13/11/2026 : fondation du front » qui renvoie à ce plan.
- [ ] **Preuve sur un navigateur qui a l'ancienne appli** (commandes dans la description de la PR, rien de commité) :
  construire l'ancien front à l'étiquette dans un dossier temporaire, le servir avec `wrangler dev --port 8787`, le
  charger dans un contexte Playwright persistant (il inscrit l'ancien `sw.js` et un `sb-test-auth-token`), arrêter,
  servir la nouvelle construction **sur le même port** (même origine), recharger deux fois : la page dit « Popote
  revient bientôt », `navigator.serviceWorker.controller.scriptURL` finit par `/sw.js` et son contenu est celui de
  la nouvelle construction (il contient `skipWaiting` et pas `batchcooking`), `localStorage` n'a plus `sb-test-auth-token`.
- [ ] Lint, `npx tsc -b`, `npx tsc -p relais`, `npm test`, `npm run build`, `grep -rE 'supabase|sb_publishable' dist`
  (vide). Après la fusion : le job `deploie-essai` est vert, la fumée aussi.

**Cas de test :** `nettoieAncienFront` efface `sb-abcd-auth-token` et `supabase.auth.token`, garde `autre` et
`popote.theme` ; ne lève pas quand `removeItem` lève ; est idempotent. La CI échoue si `dist/sw.js` manque, si `verifie-sw-remplacant` refuse son contenu (un faux `sw.js` en forme `prompt`, avec un
écouteur de message `SKIP_WAITING`, est refusé ; un faux en forme `autoUpdate` est accepté), ou si `dist/` contient `supabase`. Les 22 tests du relais restent verts, inchangés.
**Mutations :** `stockage.clear()` à la place du filtre (le test « garde `autre` » casse) ; filtre `sb-` remplacé par
un autre préfixe (casse) ; passer `registerType` à `'prompt'` (l'étape de CI casse : c'est la mutation que le simple `grep` aurait laissée passer) ; mettre `.env.essai` en
dépendance du build (`npm run build` casse sur l'essai).
**Retour arrière :** `git revert` de la fusion (rend l'ancien front à `main`, donc à l'essai au déploiement suivant) ;
l'étiquette reste. Un navigateur resté sur la page d'attente retrouve l'ancienne appli à la mise à jour de son
service worker (même mécanisme).

### F2 : L'outillage du squelette (TypeScript strict, lint, tests, axe)

**Pourquoi :** poser, avant tout code d'appli, les contrôles que les tâches suivantes supposent : un compilateur
strict, un linter qui voit les fautes d'accessibilité dans le JSX, un banc de tests de composants qui **sait
détecter** une violation. **Dépend de :** F1. **En parallèle de :** rien. **Taille :** ≈ 180 lignes.
**Source à relire :** Vitest `guide/projects`, oxlint `guide/usage/linter/plugins`.

**Fichiers :** `tsconfig.app.json`, `.oxlintrc.json`, `vite.config.ts` (bloc `test`), `package.json`, `src/test/setup.ts`,
`src/test/axe.ts`, `src/test/outillage.test.tsx`, `docs/conventions.md`.

- [ ] `tsconfig.app.json` : ajouter `"strict": true`, `"noUncheckedIndexedAccess": true`, `"noImplicitOverride": true`,
  `"isolatedModules": true` (l'ancien fichier **n'avait pas** `strict`) ; les `types` posés par F1 restent ;
  inclure les tests (`tsc -b` les compile : c'est ce qui rend les `// @ts-expect-error` des tests de types).
- [ ] `.oxlintrc.json` : `plugins: ["react", "jsx-a11y", "typescript", "oxc", "vitest"]`, `categories: { correctness: "error" }`,
  règles `react/rules-of-hooks`, `react/exhaustive-deps`, `react/only-export-components` (warn),
  `jsx-a11y/click-events-have-key-events`, `jsx-a11y/no-static-element-interactions`, `jsx-a11y/alt-text`,
  `jsx-a11y/label-has-associated-control`, `react/no-danger` ; `ignorePatterns` : `src/routeTree.gen.ts`,
  `src/api/schema.d.ts`, `dist`, `.wrangler`. (Essayé le 13/11 : `<div onClick>` et `<img>` sans `alt` sont refusés.)
- [ ] Dépendances de développement : `happy-dom@21.0.4`, `@testing-library/react@16.3.3`, `@testing-library/dom@10.4.2`,
  `@testing-library/user-event@14.6.9`, `@testing-library/jest-dom@7.0.1`, `axe-core@4.14.0`, `msw@3.0.4`,
  **`@axe-core/playwright@4.14.0`** (paquet séparé : Playwright le documente ainsi, F8 en a besoin) ; **`@playwright/test` passe de `^1.64.1` à `1.65.0` exact**
  (versions exactes, `--save-exact` : une mise à jour est un travail de Dependabot, pas un effet de bord).
- [ ] `vite.config.ts`, `test.projects` : `web` (`environment: 'happy-dom'`, `include: ['src/**/*.test.{ts,tsx}']`,
  `setupFiles: ['src/test/setup.ts']`), `relais` (`environment: 'node'`, `include: ['relais/**/*.test.ts']`), `scripts`
  (`environment: 'node'`, `include: ['scripts/**/*.test.{ts,mjs}']`). `npm test` = `vitest run`.
- [ ] `src/test/axe.ts` : `verifieAxe(element)` = `axe.run(element, { runOnly: { type: 'tag', values: ['wcag2a',
  'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, rules: { 'color-contrast': { enabled: false } } })` et rend les
  identifiants des violations ; **le contraste est coupé ici** (happy-dom n'a pas de mise en page) et vérifié dans
  Chromium (F8). `src/test/setup.ts` : matchers jest-dom, `cleanup` après chaque test.
- [ ] `docs/conventions.md` : ajouter la liste des règles d'exécution de ce plan qui valent pour toujours (pas de
  `fetch` hors `src/api/`, textes dans les catalogues, une frontière d'erreur par route, tests par rôle).

**Cas de test** (`outillage.test.tsx`, il reste : c'est la preuve que l'outil voit quelque chose) : `verifieAxe` sur
`<main><button type="button"></button></main>` rend au moins `button-name` ; sur un bouton nommé rend `[]` ;
`userEvent.setup()` clique un bouton ; `HTMLDialogElement.prototype.showModal` existe ; `window.matchMedia` existe.
**Mutations :** mettre `runOnly.values` à `[]` (le test « voit un bouton sans nom » casse) ; remettre `jsdom` comme
environnement (le test `showModal` casse) ; retirer le plugin `jsx-a11y` (un fichier de contrôle temporaire avec
`<div onClick>` passe : on le vérifie à la main, une fois).
**Retour arrière :** `git revert`.

### F3 : Le routeur : routes typées, chargement par route, une frontière d'erreur par route

**Pourquoi :** spec § 8.3 (« routes typées avec chargement à la demande par route ; une frontière d'erreur par
route »). **Dépend de :** F2. **En parallèle de :** F4, F6. **Taille :** ≈ 330 lignes (routeTree.gen.ts exclu).
**Source à relire :** TanStack Router : `installation/with-vite`, `guide/code-splitting`, `guide/data-loading`,
`guide/document-head-management`, `api/router/RouterOptionsType`.

**Fichiers :** `vite.config.ts`, `package.json`, `index.html`, `src/main.tsx`, `src/router.tsx`,
`src/routes/__root.tsx`, `src/routes/index.tsx`, `src/routes/entrer.tsx`, `src/routeTree.gen.ts` (généré),
`src/textes/navigation.ts`, `src/etats/Transverses.tsx`, `src/etats/ErreurRoute.tsx`, `src/etats/NonTrouvee.tsx`, `src/routes/routes.test.tsx`, `.github/workflows/ci.yml`. Supprimer `src/main.ts`,
`src/attente.css` (la page d'attente de F1) **en gardant** l'inscription du service worker (déplacée dans
`src/main.tsx`) : tant que F22 n'a pas refait la PWA, rien ne doit retirer `sw.js`.

- [ ] Installer `@tanstack/react-router@1.170.46` et `@tanstack/router-plugin@1.169.0` ; dans `vite.config.ts`,
  `tanstackRouter({ target: 'react', autoCodeSplitting: true })` **avant** `react()` (la doc l'exige) ; le plugin
  écrit `src/routeTree.gen.ts`, qu'on commite.
- [ ] `src/router.tsx` : `createRouter({ routeTree, context: { queryClient }, defaultPreload: 'intent',
  defaultPreloadStaleTime: 0, defaultPendingMs: 400, defaultPendingMinMs: 400, defaultErrorComponent,
  defaultNotFoundComponent })` et l'enregistrement de type `Register` ; `QueryClientProvider` dans `main.tsx`
  (le `QueryClient` est créé ici ; F5b lui donne ses réglages). `StrictMode` activé.
- [ ] `__root.tsx` : `createRootRouteWithContext<{ queryClient: QueryClient }>()` ; **lien d'évitement** « Aller au
  contenu » en premier élément focalisable ; `<HeadContent />` ; `<main id="contenu" tabIndex={-1}>` autour de
  `<Outlet />`, **le tout dans `<div id="coque">`** (que F18 rend `inert`) ; `<Transverses />` est **hors** de `#coque` ; quand le **chemin** change (pas pour un simple changement de paramètre de recherche : `?retour=`, un filtre) et **pas au premier chargement**, le focus passe à `#contenu` (WCAG 2.4.3), dont l'anneau est supprimé (`main[tabindex="-1"]:focus { outline: none }` : un conteneur n'est pas un contrôle) ;
  un composant `<Transverses />` (vide : F18 et F21 y ajoutent **chacun une ligne**), `errorComponent: ErreurRoute` et `notFoundComponent: NonTrouvee` **importés de `src/etats/`** (versions provisoires minimales : un titre, « Réessayer » ; F19 en remplace le contenu **sans toucher aux routes ni à la racine**).
  Retirer le `<title>` de `index.html` (la doc du routeur : il entrerait en conflit avec celui des routes).
- [ ] `index.tsx` : redirige vers `/entrer`. `entrer.tsx` : **écran d'attente du parcours 1** (un `h1`, rien d'autre ;
  le parcours le remplacera) avec `head: () => ({ meta: [{ title: 'Entrer · Popote' }] })` et `errorComponent: ErreurRoute`.
- [ ] `ci.yml` (job `front`) : après `npm run build`, `git diff --exit-code -- src/routeTree.gen.ts` (l'arbre commité
  est celui que le plugin génère).

**Cas de test** (`routes.test.tsx`, historique mémoire) : `/` mène à `/entrer` ; `document.title` vaut
`Entrer · Popote` ; le lien d'évitement est le premier élément atteint par `user.tab()` et mène le focus à `#contenu` ;
après une navigation vers un autre chemin, le focus est sur `#contenu`, **pas au premier chargement** et **pas quand seul `?retour=` change** ; une route inconnue rend la page
« introuvable » **dans** la coque (le lien d'évitement est encore là) ; **chaque route de `router.routesById` (racine
exceptée) déclare son propre `errorComponent` et un `head` avec un titre** ; une erreur levée par `entrer` est attrapée
par **sa** frontière : la coque reste. `verifieAxe` sur chaque page.
**Mutations :** supprimer l'`errorComponent` d'une route (le test de couverture des frontières casse) ; supprimer son
`head` (casse) ; déplacer le focus aussi au premier chargement (casse) ; inverser l'ordre des plugins `tanstackRouter` et
`react` (la construction ou `routeTree.gen.ts` casse : à constater une fois) ; commiter un `routeTree.gen.ts` périmé (l'étape
de CI casse).
**Retour arrière :** `git revert` (revient à la page d'attente de F1).

### F4 : Le contrat dans popote-web, et la dérive vue

**Pourquoi :** spec § 3.9 et § 9.2 (« `popote-web` fixe une version du contrat et régénère son client ; un écart fait
échouer son intégration continue »). Le contrat n'est pas figé : 0.4bis le **rompra** plusieurs fois (S3, S7, S11, S12,
S13). Il faut que le front **le voie**. **Dépend de :** F2. **En parallèle de :** F3, F6. **Taille :** ≈ 350 lignes
(contrat et client générés exclus). **Sources à relire :** `openapi-ts.dev/cli`, la CI de `popote-api` (job `contrat`,
version et somme d'`oasdiff`), `normes-api.md` § 3.9.

**Fichiers :** `contrat/openapi.json`, `contrat/AMONT`, `src/api/schema.d.ts` et `src/api/routes-protegees.ts` (générés), `scripts/sync-contrat.mjs`,
`scripts/genere-routes-protegees.mjs`, `scripts/sync-contrat.test.mjs`, `scripts/contrat-amont.sh`, `.github/workflows/ci.yml`,
`.github/workflows/contrat-quotidien.yml`, `package.json`, `docs/contrat.md`.

- [ ] `package.json` : `openapi-typescript@7.13.0` (dev), `"overrides": { "openapi-typescript": { "typescript": "$typescript" } }`
  (D1 : sans lui `npm ci` échoue en `ERESOLVE`), scripts `contrat:sync`, `contrat:genere`
  (`openapi-typescript contrat/openapi.json -o src/api/schema.d.ts`), `contrat:verifie` (même commande avec `--check`).
- [ ] `scripts/sync-contrat.mjs <sha|main>` : résout `main` par `git ls-remote https://github.com/kamil-bentounes/popote-api
  refs/heads/main` (aucun jeton), télécharge `…/popote-api/<sha>/openapi.json` (reprises bornées, délai), vérifie que
  c'est du JSON `openapi: 3.1.x`, l'écrit avec des fins de ligne LF et un saut de ligne final, écrit le SHA dans
  `contrat/AMONT`. `--verifie` retélécharge au SHA de `AMONT` et **compare octet à octet** (une copie retouchée à la
  main échoue), **et exige que ce SHA soit un ancêtre de `main`** (`GET /repos/kamil-bentounes/popote-api/compare/<sha>...main` :
  `identical` ou `ahead`, avec `GITHUB_TOKEN` en lecture dans la CI) : `popote-api` fusionne par écrasement, un SHA de branche
  de demande, retiré de `main`, resterait servi par `raw.githubusercontent.com` et la copie ne serait celle d'aucune version. L'URL est construite à partir d'une liste blanche (hôte, dépôt) : le SHA doit être `[0-9a-f]{40}`.
- [ ] Copier le contrat actuel (`main` de `popote-api`, **12 chemins** le 13/11 à 11 h 10 : `password-resets` a été retiré par
  `popote-api` #127, preuve que le contrat bouge déjà), générer le client **et la liste des routes protégées**, **les commiter**.
- [ ] **Routes protégées, tirées du contrat** : le contrat déclare `components.securitySchemes.session` (cookie
  `__Host-popote_session`) et chaque opération protégée porte `security` ; `POST /api/v1/sessions`, les invitations lues
  et acceptées, `healthz` et `readyz` n'en portent pas (essayé le 13/11). `scripts/genere-routes-protegees.mjs` écrit
  `src/api/routes-protegees.ts` (la liste des `METHODE chemin` qui ont `security`) ; `contrat:genere` l'appelle,
  `contrat:verifie` le compare. F21 s'en sert : **plus aucune liste écrite à la main**.
- [ ] CI, job `contrat` : `npm ci`, `npm run contrat:verifie` (le client est celui du contrat), `node scripts/sync-contrat.mjs
  --verifie` (la copie est celle d'`AMONT`). Job `contrat-amont` : installe `oasdiff` **1.35.0** avec la somme
  `a8023002fcb2eaa7f5758148a9303cb63d33b939886df312268bc0fc7b939140` (celles de `popote-api`, recalculées à la main là-bas ;
  les changer ensemble), puis `scripts/contrat-amont.sh` : télécharge l'`openapi.json` de `main` de `popote-api` et lance
  `oasdiff breaking contrat/openapi.json <amont> --fail-on ERR` (base = ce que le front connaît ; une rupture est ce
  que l'API a retiré ou changé sous lui). Un ajout compatible n'est pas une rupture : `oasdiff changelog` et les avertissements (`WARN`, par exemple une énumération de réponse élargie) vont dans le **résumé du job** (`$GITHUB_STEP_SUMMARY`) et en annotation ; une rupture sur une route que le front ne consomme pas est **aussi rouge** (choix conservateur : c'est le prix de ne pas tenir la liste des routes consommées ; la procédure de reprise est dans `docs/contrat.md`). Sur
  `pull_request`, `contrat-amont` est en `continue-on-error: true` avec une annotation d'avertissement (une rupture
  d'amont **ne bloque pas** une PR sans rapport) ; sur `push` à `main` et sur le **déclenchement quotidien**
  (`contrat-quotidien.yml`, `schedule` à 05 h 17 UTC + `workflow_dispatch`) il est **strict** (rouge, donc vu).
  Hôte injoignable : trois essais, puis rouge (« amont injoignable », jamais vert par défaut).
- [ ] Un job agrégé `resultat` (`needs: [front, secrets, contrat]`, `if: always()`) qui échoue si l'un d'eux n'a pas
  réussi : seul lui sera exigé par la règle de branche (geste de Kamil, regroupé en F25) ; chaque tâche qui ajoute un job
  l'ajoute à `needs`. **`deploie-essai` passe à `needs: [resultat]`** (il ne dépendait que de `front` et `secrets` : un `contrat` rouge avec
  un `front` vert aurait déployé un client qui ne correspond pas à son contrat). `contrat-amont` n'est **pas** dans `resultat` : une rupture
  **amont** est rouge toute seule sur `main` et au quotidien, mais bloquer le déploiement du front n'y change rien (c'est l'API qui a bougé, le
  front est resté cohérent avec **sa** copie, que `contrat` garantit) ; choix écrit, à relire en revue.
- [ ] `docs/contrat.md` : comment reprendre le contrat (`npm run contrat:sync -- main && npm run contrat:genere`, commiter
  les deux), ce qu'une rupture d'amont demande, comment lire le job.

**Cas de test** (`sync-contrat.test.mjs`, fausse récupération injectée) : SHA malformé refusé ; **SHA qui n'est pas un ancêtre de `main` refusé** (`behind` ou `diverged`) ; JSON invalide refusé ;
`openapi: 2.0` refusé ; la sortie est en LF avec saut de ligne final ; `--verifie` rend `1` si un octet change et `0`
sinon. Fixtures `oasdiff` (deux petits contrats, binaire figé en CI seulement : test marqué `oasdiff`, joué dans le job
`contrat-amont`) : une route retirée → code non nul ; une route ajoutée → `0`. `npm run contrat:verifie` rend `1` si
`schema.d.ts` reçoit un caractère en plus (essayé le 13/11 : « Generated types are not up-to-date! »).
**Mutations :** `deploie-essai` sans `needs: [resultat]` (un `contrat` rouge déploie : le test de la CI, joué avec une copie retouchée, casse) ; CRLF à l'écriture (`--verifie` casse) ; `--fail-on ERR` retiré de `contrat-amont.sh` (le test à fixtures
casse) ; contrôle d'ancêtre retiré (le test « SHA de branche » casse) ; une route protégée retirée de `routes-protegees.ts` (`contrat:verifie` casse) ; la comparaison `--verifie` ignore les espaces (le test « un octet change » casse) ; `continue-on-error` aussi sur
`push` (à relire en revue : la CI de `main` doit être rouge) ; le cron retiré.
**Retour arrière :** retirer les jobs et le dossier `contrat/` ; rien en dépend avant F5.

### F5a : Le client et la couche API unique

**Pourquoi :** « aucun `fetch` hors de la couche API » (§ 8.3) ; les en-têtes que l'API exige (`X-Popote-Client: web`,
`Idempotency-Key` entre guillemets) viennent d'un seul endroit. **Dépend de :** F3, F4. **En parallèle de :** F6.
**Taille :** ≈ 350 lignes. **Sources à relire :** `openapi-ts.dev/openapi-fetch/` et la page « Middleware & Auth »,
`normes-api.md` § 3.2, 3.3, 3.5, 3.6.

**Fichiers :** `package.json` (`openapi-fetch@0.17.0`), `src/api/client.ts`, `src/api/erreurs.ts`,
`src/api/appel.ts`, `src/api/idempotence.ts`, `src/api/evenements.ts`, `src/textes/erreurs.ts`,
`src/api/client.test.ts`, `src/api/erreurs.test.ts`.

- [ ] `client.ts` : `creeClient({ baseUrl?, fetch? })` = `createClient<paths>({ baseUrl: baseUrl ?? location.origin,
  credentials: 'same-origin', cache: 'no-store', headers: { 'X-Popote-Client': 'web' } })` + un middleware : `onRequest`
  note le début (événement `requete:debut`), `onResponse` lit `Retry-After` et émet `requete:fin`, `limite` (429) et `non-authentifie` (401),
  avec le chemin du **contrat** (`schemaPath`) ; `onError` émet `reseau:erreur` et **laisse l'erreur remonter**
  (rien de silencieux). Un singleton `client` pour l'appli ; les tests passent le leur.
- [ ] `evenements.ts` : un petit émetteur typé (`requete:debut`, `requete:fin`, `limite`, `non-authentifie`,
  `reseau:erreur`) ; **c'est le seul point de contact** entre la couche API et les états transverses (F18 à F21 s'y
  abonnent, sans toucher à `client.ts`).
- [ ] `erreurs.ts` : `ErreurApi` (`status`, `code`, `title`, `detail`, `instance`, `errors`, `retryApresS`),
  `TropDeDemandes extends ErreurApi`, `ErreurReseau` ; `depuisReponse(response, corps)` lit un `application/problem+json`
  (champs du contrat : `ProblemDetails`) ; **tout autre corps** (page HTML d'un proxy, texte, vide) devient une
  `ErreurApi` au titre français générique du catalogue, **sans jamais garder le texte reçu**. `Retry-After` : secondes
  entières (la forme de l'API) ou date HTTP ; borné de 1 à 900 ; absent ou illisible sur une `429` : 10.
- [ ] `appel.ts` : `lit(promesse)` et `litVide(promesse)` rendent `data` ou **lèvent** l'erreur typée (une `204` est
  un succès) ; c'est ce que les hooks appellent.
- [ ] `idempotence.ts` : `nouvelleCle()` rend `"` + `crypto.randomUUID()` + `"` (chaîne RFC 9651, guillemets compris).
  Les routes qui l'exigent la déclarent dans le contrat : `openapi-fetch` la rend **obligatoire au type** (D9).
- [ ] `textes/erreurs.ts` : phrases françaises des échecs sans corps lisible (réseau, délai, serveur, inattendu).

**Cas de test** (MSW sur `http://localhost:3000`, `onUnhandledRequest: 'error'`) : toute requête porte
`X-Popote-Client: web` et `credentials: same-origin` ; un `POST /api/v1/me/invitations` **sans** `Idempotency-Key` ne
compile pas (`// @ts-expect-error`, vérifié par `tsc -b`) et **avec** `nouvelleCle()` l'en-tête part entre guillemets ;
une `422` en problem+json donne une `ErreurApi` avec `errors[0].pointer` ; une `429` avec `Retry-After: 30` donne
`TropDeDemandes` (30) ; `Retry-After` `0`, `-5`, `abc`, `99999`, absent → 1 ou 10 ou 900 selon la règle ; une `502` en HTML
donne un titre français **sans** un seul mot du corps reçu ; une `204` ne lève pas ; une coupure réseau donne
`ErreurReseau` ; un `AbortSignal` annule ; un événement `requete:debut` puis `requete:fin` par appel, même en erreur.
**Mutations :** retirer `X-Popote-Client` (casse) ; `nouvelleCle` sans guillemets (casse) ; garder `error.message` du corps
non problem+json (casse) ; ne pas émettre `requete:fin` en cas d'erreur (casse) ; `Retry-After` non borné (casse).
**Retour arrière :** `git revert` (rien ne l'utilise avant F5b).

### F5b : Les hooks par ressource, le client de requêtes et la garde de session

**Pourquoi :** § 8.3 (« un hook TanStack Query par ressource, des clés précises, plus d'invalidation globale ») ; la
porte des écrans connectés ; la preuve d'architecture. **Dépend de :** F3, F4, F5a. **Taille :** ≈ 380 lignes.
**Source à relire :** TanStack Router : `guide/authenticated-routes`, `guide/external-data-loading` ; TanStack Query :
`reference/QueryClient`, `guides/mutations` (reprise hors ligne).

**Fichiers :** `src/api/query-client.ts`, `src/api/reprises.ts`, `src/api/ressources/moi.ts`, `src/api/chemin-sur.ts`,
`src/routes/_connecte.tsx`, `src/routes/_connecte.accueil.tsx` (route protégée provisoire), `src/routes/index.tsx` (garde), `src/routes/entrer.tsx` (accepte `retour`),
`src/architecture.test.ts`, `src/api/*.test.ts(x)`.

- [ ] `reprises.ts` : `reessaieLecture(nombre, erreur)` : vrai pour `ErreurReseau`, `502`, `503`, `504`, jamais sur
  4xx, au plus 2 fois ; `delaiDeReprise` honore `retryApresS` (10 s au plus). `reessaieEcriture` : seulement si la
  clé d'idempotence est dans les variables de la mutation (elle est donc **la même** à chaque reprise), même règle d'erreurs.
- [ ] `query-client.ts` : `creeQueryClient()` (`staleTime` 30 s, `refetchOnWindowFocus: true`, `retry` et `retryDelay`
  ci-dessus, `mutations.networkMode: 'online'` : une écriture faite hors ligne attend le retour du réseau puis repart
  avec **les mêmes variables, donc la même clé**).
- [ ] `ressources/moi.ts` : `moiOptions = queryOptions({ queryKey: ['moi'], queryFn: ({ signal }) =>
  lit(client.GET('/api/v1/me', { signal })), staleTime: 60_000 })`, `useMoi()` (`useSuspenseQuery`). Une clé précise par
  ressource ; la règle est écrite dans `docs/conventions.md` (une ressource = un fichier = ses clés, ses options, ses
  hooks).
- [ ] `chemin-sur.ts` : `cheminSur(valeur: unknown): string | undefined` n'accepte qu'un chemin **de cette origine** :
  commence par un seul `/`, ni `//`, ni `\`, ni `:` avant le premier `/`, ni caractère de contrôle, ni `%2F%2F`
  décodé, au plus 200 caractères ; sinon `undefined`. `entrer.tsx` : `validateSearch` n'accepte que `retour` (passé
  par `cheminSur`) et `raison` (`'expiree'` seulement).
- [ ] `_connecte.tsx` (route sans chemin, `beforeLoad`) : `ensureQueryData(moiOptions)` ; une `401` lève
  `redirect({ to: '/entrer', search: { retour: cheminSur(location.pathname + location.search) } })` (**le chemin et la requête, jamais
  l'URL absolue ni le fragment** : `cheminSur` refuse toute URL absolue, donc `cheminSur(location.href)` perdait toujours le retour) ; toute autre erreur remonte à la
  frontière de la route (pas de redirection pour un `503`). **`_connecte.accueil.tsx`** (chemin `/accueil`, **enfant de `_connecte`**) : une route protégée **provisoire** (un `h1`, `head` « Accueil · Popote »,
  `errorComponent: ErreurRoute`) que le hub remplacera ; sans elle la garde n'aurait aucune route enfant et **aucune adresse ne la déclencherait**
  (les tests 401, 200 et 503 passent par `/accueil`). `index.tsx` : `/` mène à `/accueil` ; la garde renvoie à `/entrer` sans session.
- [ ] `architecture.test.ts` : parcourt `src/**` hors `src/api/` et hors tests et **échoue** sur `\bfetch\s*\(`,
  `XMLHttpRequest`, `new WebSocket`, `new EventSource`, `sendBeacon`, `from 'openapi-fetch'`, `import.meta.env.VITE_`,
  `supabase` (insensible à la casse), `dangerouslySetInnerHTML`, `\beval\(`, `new Function`, **`popLayout`** (`AnimatePresence mode="popLayout"` : `PopChild` de Motion crée un
  élément `<style>` à l'exécution, avec un `nonce` seulement s'il en reçoit un ; sous `style-src 'self'` il serait refusé : lu dans
  `framer-motion/dist/es/components/AnimatePresence/PopChild.mjs`, 14.12.0) ; vérifie que `package.json` n'a ni
  `@supabase/*` ni `VITE_` dans ses scripts. Chaque règle a son fichier-leurre dans le test (écrit dans un dossier
  temporaire) pour prouver qu'elle détecte.

**Cas de test :** un `GET` en `503` puis `200` rend les données (une reprise, horloge simulée) ; une `404` n'est pas
réessayée ; deux `POST` identiques après une coupure partent avec **la même** clé (le gestionnaire MSW enregistre les clés) ;
la garde : cookie absent (`/me` en `401`) sur **`/accueil?mois=11`** → `/entrer?retour=%2Faccueil%3Fmois%3D11` (le retour est **conservé** : test négatif de la régression « retour toujours perdu ») ; `/me` en `200` → la page ; `/me` en `503` → la
frontière de la route, **pas** de redirection ; `cheminSur` : `/budget` ok ; `//evil.fr`, `/\evil.fr`, `https://evil.fr`,
`javascript:alert(1)`, `/%2F%2Fevil.fr`, `/a\nb`, un chemin de 201 caractères, `undefined`, un objet → `undefined`.
**Mutations :** `cheminSur` accepte `//` (casse) ; `reessaieLecture` réessaie les `404` (casse) ; une clé neuve par
reprise (casse) ; la garde redirige sur toute erreur (casse) ; retirer le leurre d'une règle d'architecture (casse).
**Retour arrière :** `git revert` ; F5a reste utile seule.

### F6 : Tailwind 4, les jetons du système, les polices, la garde du build

**Pourquoi :** § 7.3 (polices servies par nous, CSP stricte) et revue 6, 7, 13, 14, 19. **Dépend de :** F2 (la PR #38 est fusionnée). **En parallèle de :** F3, F4, F5a. **Taille :** ≈ 330 lignes.
**Sources à relire :** Tailwind `docs/theme`, `docs/adding-custom-styles` ; `.design/systeme/LISEZMOI.md`.

**Fichiers :** `src/styles/index.css`, `src/styles/jetons.css`, `src/styles/polices.css`,
`src/styles/polices/*.woff2`, `public/licences/*.txt`, `index.html` (préchargement), `vite.config.ts`
(`tailwindcss()`, `assetsInlineLimit: 0`), `scripts/verifie-build.mjs`, `scripts/verifie-jetons.mjs`,
`scripts/*.test.mjs`, `src/styles/jetons.test.ts`, `.github/workflows/ci.yml`, `package.json`.

- [ ] `src/styles/jetons.css` = `.design/systeme/jetons.css` précédé de `@theme static { --color-*: initial;
  --text-*: initial; --radius-*: initial; --shadow-*: initial; --inset-shadow-*: initial; --drop-shadow-*: initial;
  --font-*: initial; --ease-*: initial; --animate-*: initial; }` et avec `@theme` remplacé par `@theme static` ; les
  ombres (qui lisent `var(--color-encre)`) dans un bloc `@theme static inline` ; **aucune valeur modifiée**.
  `src/styles/index.css` : `@import "tailwindcss"; @import "./jetons.css"; @import "./polices.css";` (F7 ajoute les
  composants).
- [ ] Polices : copier les quatre `.woff2` du système dans `src/styles/polices/` (Vite les traite par son pipeline :
  noms hachés), leurs `@font-face` (hors couche, **avec** `unicode-range` et `font-display: swap`) dans `polices.css` ;
  copier les deux textes OFL dans `public/licences/` (l'OFL exige que la licence accompagne la police) ;
  `index.html` : `<link rel="preload" as="font" type="font/woff2" crossorigin>` pour **`fredoka-latin` et
  `nunito-latin` seulement** (Vite réécrit ces `href` vers les noms hachés : essayé le 13/11). Pas de `latin-ext`
  préchargé (chargé à la demande par `unicode-range`).
- [ ] `vite.config.ts` : `tailwindcss()`, `build.assetsInlineLimit: 0` (D4).
- [ ] `scripts/verifie-build.mjs <dist>` : **échoue** si, dans `dist/**` : `index.html` contient un `<script>` sans
  `src`, un `<style>`, un attribut `style=` ou un `on…=` ; un `.css` ou `.js` contient `data:font` ; **toute URL construite** dans un `.css` (`url(...)` entre guillemets simples, doubles ou nus,
  avec espaces, `@import "…"` et `@import url(…)`, `src:`, `image-set(…)`) dont le schéma est `http:`, `https:` ou `//` (échappements CSS
  décodés avant le test : `\68ttps://` est `https://`), ou `data:` autre que `data:image/` ; un `.html` référence un hôte autre que `'self'` pour
  un script, une feuille de style, une police, une image ou un `<link>` ; un `.js` contient `fonts.googleapis.com` ou `https://` dans un
  `new URL`/`import(` ; `banc.html` existe sans `--banc` ; un `.woff2` référencé manque. Branché sur la CI
  (étape après `npm run build`). (F22 y ajoute les contrôles du service worker.)
- [ ] `scripts/verifie-jetons.mjs` : extrait les paires `--nom: valeur` de `.design/systeme/jetons.css` et de
  `src/styles/jetons.css` (hors blocs de réinitialisation) et **échoue** si une paire manque ou diffère (un jeton **en
  plus** dans `src/` est refusé aussi : tout passe par le système) ; compare aussi `jetons.css` à `jetons-racine.css`
  du système (revue 14 : copie à la main) et signale la dérive.
- [ ] `src/styles/jetons.test.ts` : compile `src/styles/index.css` avec `@tailwindcss/node` (déjà là, dépendance de
  `@tailwindcss/vite`) et une liste de classes : `bg-menthe`, `text-titre-m`, `rounded-bloc`, `shadow-dur`,
  `ease-rebond` sont produites ; **`bg-red-500`, `text-xl`, `rounded-xl`, `shadow-md`, `font-sans` ne produisent
  rien** ; `--duree-appui`, `--ease-rebond`, `--enfoncement` sont émises même sans utilitaire (`static`).

**Cas de test :** `verifie-build` sur des `dist` factices (un par règle : script en ligne, `style=`, `data:font`,
police externe, `banc.html`, **et les contournements réalistes** : `.x{background:url("https://evil.test/x.svg")}` dans une classe jamais rendue,
`url( 'https://evil.test/x' )`, `url(//evil.test/x)`, `@import "https://evil.test/a.css"`, `@import url(\68ttps://evil.test/a.css)`,
`image-set("https://evil.test/x.png" 1x)`) échoue chaque fois et passe sur un dist propre ; `verifie-jetons` : jeton modifié,
manquant, en trop → échec ; identique → succès. **Mutations :** ne décoder que `url(http` en clair (les fixtures guillemetées et échappées cassent) ; `assetsInlineLimit` relevé à 8 000 (`verifie-build` casse
sur le `data:font`, constaté le 13/11) ; `@theme static` redevient `@theme` (le test « émises sans utilitaire » casse) ;
retirer `--color-*: initial` (`bg-red-500` apparaît : casse) ; un jeton retouché dans `src/` (`verifie-jetons` casse) ;
retirer le `crossorigin` du préchargement (une police préchargée sans lui est chargée **deux fois** : à contrôler
dans l'onglet réseau de Chromium, une fois).
**Retour arrière :** `git revert` (le front retrouve ses styles par défaut ; rien n'est encore livré avec).

### F7 : `composants.css` dans la couche, la base, le focus, le contraste calculé

**Pourquoi :** revue 1, 2, 4, 5, 15, 19 : le CSS des composants porté en couche (pour que `className="bouton p-2"`
marche), les règles de base manquantes, et la **preuve par le calcul** que les paires de couleurs tiennent.
**Dépend de :** F6. **En parallèle de :** F3, F5a. **Taille :** ≈ 260 lignes.

**Fichiers :** `src/styles/composants.css`, `src/styles/base.css`, `src/styles/index.css`, `src/styles/css.test.ts`,
`src/styles/contraste.test.ts`.

- [ ] `composants.css` = `.design/systeme/composants.css` **tel que la PR #38 fusionnée le livre** (anneau d'encre cerné de jaune, `prefers-reduced-motion` complet, signes dessinés de la marmite : déjà dedans), avec : toutes les
  règles de classe dans `@layer components { … }` ; `@font-face` (déjà dans `polices.css`) retirés d'ici ; **`@keyframes`
  restent hors couche**. Les écarts sont des commentaires `/* écart au système : … */`.
- [ ] `base.css` (`@layer base`) : `html` (fond crème, `color-scheme: light`, `-webkit-text-size-adjust: 100%`),
  `body` (police et couleur du système, marges nulles, `min-height: 100dvh`, remplissage `env(safe-area-inset-*)`),
  `.cases:focus-within` et `.avatar:focus-visible` avec **le même anneau que le système** (revue 19 : il ne le donnait qu'au bouton, au
  champ et au lien), `[hidden] { display: none !important }`, la classe `.sr-seul` (texte réservé aux lecteurs d'écran),
  `main[tabindex="-1"]:focus { outline: none }` ; **aucune règle de mouvement réduit en double** (le système l'a).
- [ ] **Retirer `.jeu *, .jeu *::before, .jeu *::after`** de `composants.css` (la consigne « À porter » du système : le preflight de Tailwind pose déjà
  `box-sizing`) ; `.jeu` (fond et police) devient la règle `body` de `base.css`. `/* écart au système : retiré, doublon du preflight */`.
- [ ] `index.css` : `@import "./base.css"; @import "./composants.css";` dans cet ordre.
- [ ] Le système fusionné n'a plus de couleur en dur (la session de design a ajouté `voile`, `tomate-clair`, `ciel-clair`, les soleils, les
  tailles de texte) : **vérifier** qu'il n'en reste aucune dans `composants.css` (test ci-dessous) et que toute valeur qui manque encore
  est signalée par `/* écart au système : jeton manquant */`.

**Cas de test :** `css.test.ts` analyse `composants.css` : **aucun sélecteur ne contient `.jeu *`** ; **aucune règle de sélecteur en dehors de `@layer
components`**, seulement des `@keyframes` ; aucune valeur hexadécimale hors des déclarations marquées « écart » ;
`contraste.test.ts` calcule, à partir de `jetons.css`, le rapport de chaque paire de la revue (texte ≥ 4,5 : encre/crème
14,2, encre/tomate 5,06, encre/ciel 4,88, encre/menthe 8,4, encre/jaune 9,9, encre/rose 7,4, blanc/tomate-foncé 4,58,
blanc/ciel-foncé 4,63, erreur/crème 5,24, gris/crème 5,87, gris/papier, gris/lilas ; **composants ≥ 3** : l'anneau
encre contre crème, papier, menthe, jaune, ciel, rose, tomate) **et échoue** si `--color-erreur` est utilisée sur
`--color-tomate-pale` pour du texte (4,25 : revue 15). **Mutations :** remettre `.jeu *` (casse) ; sortir une règle de la couche (casse) ; changer
`--color-gris` en `#8E82B0` dans `src/` (`verifie-jetons` et le contraste cassent) ; retirer l'anneau encre (casse) ;
oublier l'`@media (prefers-reduced-motion)` des `cases` (casse : le test cherche `tremble`).
**Retour arrière :** `git revert`.

### F8 : Le banc et le harnais de comparaison avec `reference.html`

**Pourquoi :** « une route de développement qui montre chaque composant dans chaque état, et un script Playwright qui
capture chaque composant porté à côté de la même section de `reference.html` » (consigne) ; axe dans un vrai
navigateur ; **la CSP vérifiée sous le vrai relais**. **Dépend de :** F7. **En parallèle de :** F3 à F5b (aucun fichier
commun hors `vite.config.ts`, `package.json`, `ci.yml`). **Taille :** ≈ 380 lignes. **Sources à relire :** Playwright
`accessibility-testing`, `test-snapshots`, `types.d.ts` (`animations`, `reducedMotion`) ; Motion `MotionGlobalConfig`.

**Fichiers :** `banc.html`, `src/banc/main.tsx`, `src/banc/banc.css`, `src/banc/section.ts` (type d'une section),
`src/banc/sections/couleurs.tsx`, `src/banc/sections/typographie.tsx`, `playwright.config.ts`, `tsconfig.node.json`, `e2e/garde.ts`
(fixture), `e2e/banc.axe.spec.ts`, `e2e/banc.cibles.spec.ts`, `e2e/comparaison.spec.ts`, `e2e/comparaison/index.mjs`, `scripts/capture-index.test.mjs`,
`vite.config.ts` (mode `banc`), `package.json`, `.github/workflows/ci.yml`, `docs/banc.md`.

- [ ] **Entrée du banc** : `banc.html` + `src/banc/main.tsx` ; `vite.config.ts` n'inclut `banc.html` dans
  `build.rollupOptions.input` que si `mode === 'banc'` ; `npm run build:banc` = `vite build --mode banc` ; en `vite dev`,
  le banc est à `/banc.html`. Il charge `src/banc/sections/*.tsx` par `import.meta.glob(…, { eager: true })` : **un fichier = une
  section ou un morceau de section**, `export const section: Section = { reference, cas: [{ legende, reference?: string, cle?: string, rendu }] }` où
  `reference` (au niveau de la section) est l'`h2` de la section de `reference.html` ; **plusieurs fichiers qui désignent le même `h2` sont
  fusionnés** (cas dans l'ordre des noms de fichier : « Bloc, pastille, tampon, avatar » vient de F12, F14 et F13 ; « Décor, bulle,
  entrée d'écran, confettis » de F14, F16 et F17) ; au niveau du cas, `reference` est le **début** de la légende de la page de
  référence (comparé sans casse ni espaces multiples, et il doit désigner **une seule** légende) ; `cle` sert aux cas **sans
  légende** (Couleurs et Typographie n'ont aucun `<small>` ; les légendes de « La marmite » sont générées par le script de la page :
  le script de comparaison les lit **dans le navigateur, après exécution de la page**, pas dans le fichier). Le banc recopie la mise en page de la page
  de référence (`.page`, `.grille`, `.cas`, `.scene`) **dans `banc.css`** (classes, jamais `style=` en ligne) ; il met
  `MotionGlobalConfig.skipAnimations = true` quand l'adresse contient `?fige` (état final, déterministe) ; chaque
  section porte `data-section="<titre>"` et chaque cas `data-cas="<légende>"`. Deux sections de départ, sans
  composant : **Couleurs** et **Typographie**.
- [ ] **Configuration Playwright neuve** (`playwright.config.ts`) : `webServer` = `npm run build:banc && npx wrangler dev
  --port 4173 --var CSP_MODE:enforce --var RELAY_SECRET:banc --var API_ORIGIN:http://127.0.0.1:9` (D7 ; `url`
  `http://127.0.0.1:4173/`, délai 120 s, `reuseExistingServer: !process.env.CI`) ; `locale: 'fr-FR'`,
  `timezoneId: 'Europe/Paris'` ; trois projets : **`telephone`** (Chromium, 390×844, `deviceScaleFactor: 2`, `isMobile`,
  `hasTouch`), **`pc`** (Chromium, 1440×900, facteur 1) et **`iphone`** (**WebKit**, 390×844 : Kamil se connectera par Face ID, donc sur un iPhone). `iphone` joue le
  banc (axe, garde de CSP, cibles, clavier) et, plus tard, **le parcours critique** (« Entrer ») ; le reste des e2e des parcours reste en Chromium si WebKit
  est trop lent (`npx playwright install --with-deps chromium webkit`, installation mise en cache). Si le job dépasse 10 min, `iphone` devient un job `banc-webkit` à part. `e2e/` est laissé organisé pour les parcours (S16 de 0.4bis y ajoute
  `banc-connexion/`).
- [ ] **Garde** (`e2e/garde.ts`, fixture automatique) : installe avant toute page un écouteur
  `securitypolicyviolation` qui range les violations, écoute `console` (type `error`) et `pageerror` ; **échoue le test**
  si l'un des trois est non vide à la fin. Les tests importent `test` d'ici, pas de `@playwright/test`.
- [ ] **Axe** (`banc.axe.spec.ts`) : pour **chaque** `[data-section]` du banc et chaque projet, `new AxeBuilder({ page
  }).include(section).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze()` et `expect(violations).toEqual([])` ;
  le contraste est inclus (vrai navigateur). Une seconde passe avec `reducedMotion: 'reduce'`. **Le banc est parcouru SANS `?fige`** (`skipAnimations` court-circuite le chemin des
  animations : la garde de CSP ne verrait pas ce que Motion injecte à l'exécution) ; seule la comparaison utilise `?fige`.
- [ ] **Cibles et clavier** (`e2e/banc.cibles.spec.ts`, les trois projets) : pour chaque contrôle visible du banc (`button`, `a[href]`, `input`, `select`,
  `textarea`, `[role=button]`, `summary`), `boundingBox()` ≥ **44 × 44** (la règle 10 du système ; exceptions écrites, une par une, avec leur raison, par exemple un
  lien dans une phrase) ; **`Tab` parcourt les contrôles de chaque section dans l'ordre du DOM**, chacun montre un **indicateur de focus visible** (`outline` ou `box-shadow`
  de focus calculé, non nul), et `Shift+Tab` revient en arrière ; aucun piège (on sort de la section avec `Tab`). Axe ne couvre qu'une partie des critères
  (Playwright le dit) : ceci en prouve deux de plus, sans lecteur d'écran.
- [ ] **Comparaison** (`comparaison.spec.ts`) : pour chaque projet, ouvre `file://…/.design/systeme/reference.html` (le
  chemin se calcule depuis la racine du dépôt) et `/banc?fige` (**attention : le relais sert `banc.html` à `/banc`**, `/banc.html` répond `307` vers `/banc` : essayé le 13/11 avec `wrangler dev`, la
  requête et son `?fige` sont conservés ; `vite dev` sert `/banc.html`) ; pour chaque section du banc, **apparie les cas par
  début de légende** avec ceux de la référence ; capture chaque cas des deux côtés
  (`locator.screenshot({ animations: 'disabled' })`) dans `captures/comparaison/<projet>/<section>/<cas>.reference.png` et
  `.banc.png`, relève leurs dimensions ; produit `captures/comparaison/index.html` : une ligne par cas, **les deux
  images côte à côte**, les dimensions, un repère rouge si l'écart dépasse 2 px dans un sens. **Aucune comparaison de
  pixels ne fait échouer le test** (la session de design juge : on ne compare pas un pixel qui change à chaque
  espacement) ; le test échoue seulement si une légende de la référence **manque** au banc pour une section déjà portée,
  si un `reference` de cas ne désigne aucune légende (ou plusieurs), ou si une capture est vide. `captures/` est dans `.gitignore`.
- [ ] CI, job `banc` (≤ 10 min, `permissions: contents: read`) : `npm ci`, `npx playwright install --with-deps chromium webkit`,
  `npx playwright test e2e/banc.axe.spec.ts e2e/banc.cibles.spec.ts e2e/comparaison.spec.ts`, **dépose `captures/comparaison/` en artefact**
  (`actions/upload-artifact` épinglé par SHA : `git ls-remote` au moment de l'écrire) ; ajoute `banc` à `needs` de
  `resultat`.
- [ ] `tsconfig.node.json` : inclure `playwright.config.ts` et `e2e/**/*.ts` (`tsc -b` ne les voyait pas : une faute de type dans un test e2e passerait
  la CI) ; les scripts `.mjs` restent hors compilation (leurs tests Node les exercent).
- [ ] **Les phrases d'état** (F18 à F21) apparaissent dans le banc dès qu'elles existent ; Kamil les relit **sur le banc** (décision du 13/11) ; `docs/banc.md` dit comment ouvrir le banc (`npm run build:banc` puis le relais local, ou `vite dev` et `/banc.html`).
- [ ] `docs/banc.md` : comment ajouter une section, comment lire l'index de comparaison, le principe « un fichier =
  une section ».

**Cas de test :** `capture-index.test.mjs` (Node) : l'appariement par légende ignore la casse des espaces mais pas les
mots ; deux cas de même légende dans une section → erreur ; un cas du banc sans pendant → signalé ; l'index HTML
contient autant de lignes que de paires. Playwright : sur le banc de départ, axe est vert aux deux tailles ; **un
`<style>` injecté par le test ou un `fetch` vers un hôte tiers fait échouer la garde** (test négatif de la garde, avec un
leurre servi par une page de test) ; `banc.html` **est absent de `dist/`** après un `npm run build` normal (couvert
par `verifie-build`) ; `/banc?fige` répond 200 et `/banc.html?fige` 307 (le relais sert la page à `/banc`).
**Mutations :** retirer `--var CSP_MODE:enforce` (le leurre de CSP ne fait plus échouer la garde : casse) ; construire
`banc.html` hors du mode `banc` (`verifie-build` casse) ; ne pas relever `securitypolicyviolation` (le test négatif casse) ;
apparier par position au lieu de la légende (le test d'appariement casse).
**Retour arrière :** `git revert` ; le banc n'est jamais dans la prod.

### Les lots de composants (F9 à F17) : ce que chacun contient

Les composants vivent dans `src/ui/<Nom>.tsx` (anglais) et posent les classes françaises du système. Chaque lot
suit « Chaque composant livre quatre choses » (règles d'exécution). Tous les composants acceptent `className`, passent
le reste des attributs à l'élément natif, **refusent par le type ce qui casserait le sens** (une pastille n'a pas de
`onClick`), et n'ont aucun texte en dur. Correspondance avec le système :

| Système | Composant | Rendu natif | Mouvement |
|---|---|---|---|
| `.bouton`, `--jaune`, `--blanc`, `--danger`, `--petit` | `Button` | `<button type="button">` | CSS (appui 90 ms) |
| `.lien`, `--danger` | `LinkButton` | `<button>` (action) ; un lien de navigation reste `<Link>` du routeur | CSS |
| `.champ` | `Field` | `<div>` + `<label>` + `<input>` + `<small>` | CSS |
| `.bouton.maintenir` | `HoldButton` | `<button>` | Motion (progression, achèvement) |
| `.cases` | `CodeCells` | un `<input>` réel + cases décoratives | Motion (tremblement) |
| `.bloc` | `Block` | `<div>` / `<section>` / `<article>` | — |
| `.pastille` | `Badge` | `<span>` | — |
| `.avatar` | `Avatar` | `<span role="img" aria-label>` | — |
| `.bulle` | `Bubble` | `<p>` | — |
| `.jauge` | `Gauge` | `<div role="progressbar">` | Motion (remplissage) |
| `.suivi` | `Steps` | `<ol>` | Motion (remplissage de l'étape) |
| `.effet` | `EffectRow` | `<li>` | — |
| `.entre`, écran | `Screen`, `Enter` | `<main>`/`<div>` | Motion (rebond, 70 ms d'écart) |
| `.soleil`, `.sol` | `Sun`, `Ground` | `<div aria-hidden>` | CSS (rotation, coupée en mouvement réduit) |
| `.tampon` | `Stamp` | `<span>` | Motion (arrivée) |
| `.feuille` | `Sheet` | `<dialog>` | Motion (monte, redescend) |
| `.confetti` | `Confetti` | calque `aria-hidden` | Motion (particules) |
| `.marmite` | `Pot` | `<span>` + SVG | CSS (sept états) |

### F9 : Bouton, lien d'action, champ

**Pourquoi :** les composants que « Entrer » utilise en premier ; revue 9 et 11. **Dépend de :** F8. **En parallèle de :**
F12, F13, F14, F17. **Taille :** ≈ 370 lignes. **Source à relire :** WAI-ARIA APG (« Read me first »), WCAG 2.2 SC 3.3.1,
3.3.2, 1.3.5 ; `.design/systeme/reference.html` (sections « Bouton » et « Champ et cases de code »).

**Fichiers :** `src/ui/Button.tsx`, `src/ui/LinkButton.tsx`, `src/ui/Field.tsx`, leurs `.test.tsx`,
`src/textes/composants.ts`, `src/banc/sections/bouton.tsx`, `src/banc/sections/champ.tsx`, `src/styles/composants.css`
(sélecteurs du champ).

- [ ] `Button` : `variant` (`'principal' | 'jaune' | 'blanc' | 'danger'`), `size` (`'normal' | 'petit'`), `busy`.
  **Occupé = `aria-busy="true"` + `aria-disabled="true"` + une garde dans le gestionnaire** (un `click`, `Entrée` ou
  `Espace` n'appelle plus rien : revue 9) ; le nom accessible reste celui du libellé ; le rond qui tourne est décoratif
  (`aria-hidden`). Désactivé = `disabled` natif. **`pause`** (pour le compte à rebours de F20) : `aria-disabled="true"`, même garde que `busy`, **sans** spinner, avec son style
  (`.bouton[aria-disabled="true"]` = l'aspect du désactivé : le système n'a que `:disabled`, `/* écart au système */`) ; le bouton reste focalisable.
- [ ] `Field` : `<div class="champ" data-erreur>` ; `<label htmlFor>` avec le libellé **seul** ; `<input>` ; `<small
  id>` **hors du label**, relié par `aria-describedby` ; l'erreur ajoute `aria-invalid="true"` et son message **est** la
  description ; `autoComplete` **obligatoire par le type** (WCAG 1.3.5) ; `id` par `useId`. Le CSS `.champ > span` devient
  `.champ > label` (`/* écart au système : structure accessible */`).
- [ ] `LinkButton` : `<button type="button" class="lien">` (action) ; `variant="danger"`.
- [ ] Sections du banc, **chaque légende** du système : « Principal, au repos », « Appuyé (`:active`) » (par
  `data-appuye`), « Occupé (`aria-busy`) », « Désactivé », « Jaune », « Blanc », « Danger », « Petit bouton, lien, lien de
  danger », et pour le champ « Au repos, avec une aide », erreur, « Désactivé ».

**Cas de test :** `getByRole('button', { name })` ; `pause` : `aria-disabled` posé, focalisable, `onClick` jamais appelé ; occupé : `user.click` **et** `user.keyboard('{Enter}')` et `' '` n'appellent
pas `onClick` ; le nom accessible ne change pas quand `busy` ; `disabled` n'est pas focalisable ; champ :
`getByLabelText('Ton e-mail')` retrouve l'`input` **et** le nom accessible ne contient pas l'aide (revue 11) ;
`toHaveAccessibleDescription` = l'aide, puis = le message d'erreur quand `error` ; `aria-invalid` seulement en erreur ;
`user.tab()` va du champ au bouton ; `autoComplete` manquant ne compile pas (`@ts-expect-error`) ; `verifieAxe` sur chaque
état. **Mutations :** retirer la garde de `busy` (casse) ; `pause` sans la garde (casse) ; remettre `small` dans le label (casse) ; `aria-describedby`
pointant vers un id inexistant (casse) ; `aria-invalid` toujours posé (casse).
**Retour arrière :** `git revert`.

### F10 : Le bouton à maintenir (clavier compris)

**Pourquoi :** c'est le geste de suppression (règle 8 du système) ; revue 8 ; WCAG 2.1.1 et 2.5.1. **Dépend de :** F9
(Button) et F14 (fournisseur Motion). **En parallèle de :** F11, F13, F15, F16. **Taille :** ≈ 380 lignes. **Sources :** WCAG 2.2 SC 2.1.1,
2.5.1, 3.3.4 ; APG « button ».

**Fichiers :** `src/ui/HoldButton.tsx`, `src/ui/HoldButton.test.tsx`, `src/textes/maintien.ts`,
`src/banc/sections/maintenir.tsx`, `e2e/maintenir.spec.ts`.

- [ ] `HoldButton` (`onHold`, `label`, `hint`, `durationMs = 2000`, défini une fois : constante `DUREE_MAINTIEN_MS` qui cite
  la règle 8) : **pointeur** (`pointerdown` démarre ; `pointerup`, `pointerleave`, `pointercancel` annulent), **clavier**
  (`Espace` et `Entrée` démarrent, **sans** `repeat` ; `keyup`, `blur` et `Échap` annulent), **minuteur unique** nettoyé au
  démontage. Le voile avance par Motion (largeur de 0 à 100 % en `durationMs`, linéaire) ; à la fin : `onHold` **une seule
  fois**, `data-abouti`, le libellé devient celui de la réussite fourni par l'appelant. Un `contextmenu` est refusé (appui
  long du téléphone).
- [ ] **Annonces** : une région `role="status"` **présente dès le premier rendu** (réservée aux lecteurs d'écran,
  `.sr-seul`) ; messages du catalogue : « Maintiens appuyé 2 secondes pour confirmer » (aussi en
  `aria-describedby`), « Continue de maintenir », « Relâché : rien n'a été fait », « C'est fait ». Pas une annonce par
  seconde.
- [ ] **Alternative sans maintien, pour tout le monde** (acceptée par la session de design le 13/11, **à ces conditions**) : une personne qui ne peut pas
  tenir 2 s (clavier, doigt, lecteur d'écran, commande vocale) n'avait, avec le seul maintien, aucun autre chemin. Donc : un appui **bref** (relâché
  avant 2 s) ou un `click` sans `pointerdown` ni `keydown` préalables **arme** le bouton **5 s** : le libellé devient **« Appuie encore pour
  confirmer »** et la région `role="status"` dit **cette même phrase** ; un second appui bref n'est accepté **qu'au bout de 0,6 s** (un double
  clic accidentel ne suffit pas) et appelle `onHold` ; au bout de 5 s sans second appui, le bouton **se désarme et le libellé revient à « Maintiens pour
  supprimer »**. Le maintien de 2 s confirme toujours d'un coup. **Pas de case « Je confirme »** (le test vérifie qu'aucune `checkbox` n'est rendue).
  **La preuve d'identité reste exigée avant, dans les deux cas** : `HoldButton` prend une prop **`preuveFaite: boolean` obligatoire** ; tant qu'elle est
  fausse, le bouton est en `pause` (F9) avec « Confirme ton identité d'abord » et **ni le maintien ni les appuis brefs ne comptent** ; c'est l'écran
  qui pose la preuve (parcours « Mon compte »). VoiceOver et TalkBack : non prouvé, gestes de Kamil.
- [ ] Banc : « À maintenir 2 s » (début de la légende de la référence, repos), tenu à mi-course (`forceProgress` réservé au banc, **figé** à 50 %),
  abouti. Playwright (`maintenir.spec.ts`) : maintien réel à la souris, au toucher (`page.touchscreen`) et au clavier ;
  relâcher à 1,5 s ne supprime rien.

**Cas de test** (horloge simulée, `userEvent.setup({ advanceTimers })`) : 1 999 ms → `onHold` jamais ; 2 000 → une fois ;
relâché à 1 500 → pas d'appel, message « Appuie encore pour confirmer », bouton armé ; `Espace` tenu 2 s → une fois ; `Entrée` idem ; `keydown` répété
(`repeat: true`) ignoré ; `Échap` annule ; `blur` annule ; démontage au milieu → plus aucun appel ni minuteur vivant
(compteur de minuteurs) ; `preuveFaite` faux → ni maintien ni appui bref n'appellent `onHold`, message « Confirme ton identité d'abord » ; un appui bref → armé, libellé « Appuie encore pour confirmer », **la région dit la même phrase** ; armé puis 5 s sans second appui → libellé **« Maintiens pour supprimer »** de nouveau ; un 2e appui bref 300 ms plus tard → **pas d'appel** (double clic accidentel) ; un 2e appui bref 700 ms plus tard (< 5 s) → une fois ; un `click` seul (lecteur d'écran) → armé puis confirmé de même ; armé puis 6 s → désarmé (libellé d'origine) ; aucune `checkbox` rendue ; deux appuis
successifs complets → deux appels (et pas un de plus) ; la région `status` existe avant l'interaction ; aucune `checkbox` n'est rendue. **Mutations :**
2 000 → 200 (casse) ; appeler `onHold` à `pointerdown` (casse) ; ignorer `pointerup` (casse) ; ne pas nettoyer le minuteur
(casse) ; accepter le 2e appui avant 0,6 s (casse) ; ne pas revenir au libellé d'origine après 5 s (casse) ; ignorer `preuveFaite` (casse) ; laisser passer les `repeat` (casse) ; supprimer l'alternative (casse).
**Retour arrière :** `git revert` ; rien n'en dépend avant les parcours.

### F11 : Les cases du code

**Pourquoi :** l'écran « Regarde tes mails » (code à 6 chiffres reçu par mail, plan 0.4bis) ; revue 12 (pas la couleur seule).
**Dépend de :** F9 (modèle de `Field`), F14 (le tremblement passe par Motion et la politique de `mouvement.ts`). **En
parallèle de :** F10, F12, F13, F15, F16, F17. **Taille :** ≈ 340 lignes. **Source :** WCAG 2.2 SC 1.3.5, 1.4.1, 3.3.1 ; MDN
`autocomplete="one-time-code"`.

**Fichiers :** `src/ui/CodeCells.tsx`, `src/ui/CodeCells.test.tsx`, `src/ui/code.ts` (nettoyage pur),
`src/ui/code.test.ts`, `src/textes/code.ts`, `src/banc/sections/cases-du-code.tsx`.

- [ ] **Un seul champ réel** (`<input inputMode="numeric" autoComplete="one-time-code">` **sans `maxLength`**, étiqueté, posé
  par-dessus les cases, **dans un conteneur `.cases-champ` à position relative** : le CSS de `.cases` ne prévoit que des cases, un champ ajouté
  dedans deviendrait un **septième élément flex** ; `.cases-champ > input` est en position absolue, transparent, de la taille de l'ensemble,
  `/* écart au système : champ réel */`) ; les six cases sont décoratives (`aria-hidden`). Le collage « 482 913 » ou « 482-913 » est nettoyé
  **dans le gestionnaire** (`code.ts` : chiffres seulement, tronqué à `longueur`) : avec un `maxLength`, le navigateur tronquerait
  « 482 913 » à six caractères **avant** le nettoyage et ne garderait que « 48291 » (comportement de la spécification HTML) ; les lettres sont ignorées ; `onComplete(code)` part **une
  seule fois** à la 6e saisie.
- [ ] États `saisie`, `juste`, `faux` (`data-etat`), **jamais par la couleur seule** : `juste` ajoute une coche SVG et le
  message « Code bon » ; `faux` ajoute `aria-invalid="true"`, une croix SVG, le message « Ce code n'est pas le bon » relié par
  `aria-describedby` et **annoncé** (`role="status"`) ; le tremblement passe par Motion (`x`), supprimé en mouvement
  réduit (politique de `mouvement.ts`). Le focus de l'ensemble est visible (`.cases:focus-within`, F7).
- [ ] Banc : « En cours de saisie », « Juste », « Faux : les cases tremblent une fois ».

**Cas de test :** `code.ts` : `'482 913'` → `'482913'`, `'48a2'` → `'482'`, `'1234567'` → `'123456'`, `''`, `'٤٨٢'` (chiffres
arabes : refusés) ; composant : saisie de 3 chiffres → 3 cases pleines ; retour arrière ; 7e chiffre ignoré ; **collage de « 482 913 » dans le champ du composant → les six chiffres** ; `onComplete`
une seule fois même si on retape ; `faux` → `aria-invalid`, message, `data-etat` ; `juste` → coche + message ; le nom
accessible du champ vient du libellé ; `autocomplete` est `one-time-code` ; axe. **Mutations :** accepter les lettres
(casse) ; `onComplete` deux fois (casse) ; ne pas poser `aria-invalid` (casse) ; message d'erreur absent (casse : « pas la
couleur seule ») ; `maxLength={6}` rétabli (le test de collage du composant casse).
**Retour arrière :** `git revert`.

### F12 : Bloc, pastille, avatar, bulle

**Dépend de :** F8. **En parallèle de :** F9, F13, F14, F17. **Taille :** ≈ 260 lignes.

**Fichiers :** `src/ui/Block.tsx`, `Badge.tsx`, `Avatar.tsx`, `Bubble.tsx`, leurs tests,
`src/banc/sections/bloc-pastille-tampon-avatar.tsx` (la section de la référence regroupe aussi le tampon : F14 y ajoute
**son propre fichier** `tampon.tsx` avec la même `reference` ; le banc fusionne les cas de deux fichiers qui
désignent la même section), `src/banc/sections/bulle.tsx`.

- [ ] `Block` (`as`), `Badge` (`tone`, aucun `onClick`, aucun `role="button"` : `Omit` au type **et** test d'exécution),
  `Avatar` (`letter`, `tone`, `free`, **`name` obligatoire** : `role="img"` et `aria-label`, ou « Place libre »),
  `Bubble` (`<p>` ; `announce` facultatif : région `status` quand c'est l'assistant qui parle).
- [ ] Sections : « Bloc avec pastilles et tampon » (le tampon vient de F14 : le cas est ajouté par F14), « Pastilles »,
  « Avatars : deux personnes, une place libre ».

**Cas de test :** la pastille n'est ni focalisable ni cliquable (`@ts-expect-error` sur `onClick` ; `getByRole('button')`
absent) ; `Avatar` sans `name` ne compile pas ; `getByRole('img', { name: 'Léa' })` ; place libre nommée ; `Block as="section"`
rend une `section` ; axe. **Mutations :** laisser `onClick` sur `Badge` (casse, au type et à l'exécution) ; `Avatar` sans
`aria-label` (casse) ; `Bubble` sans `status` quand `announce` (casse).
**Retour arrière :** `git revert`.

### F13 : Jauge, suivi, ligne d'effet, icônes

**Pourquoi :** revue 10, 12, 17, 18. **Dépend de :** F14 (Motion). **En parallèle de :** F9, F10, F11, F12, F15, F16, F17. **Taille :** ≈ 350 lignes.

**Fichiers :** `src/ui/Gauge.tsx`, `Steps.tsx`, `EffectRow.tsx`, `icones.tsx` (SVG `Coche`, `Croix`, `Fleche`),
leurs tests, `src/textes/etats-visuels.ts`, `src/banc/sections/jauge.tsx`, `suivi.tsx`, `effet.tsx`.

- [ ] `Gauge` : `<div class="jauge" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow aria-label>` ;
  la valeur est **bornée de 0 à 100** (`NaN` → 0) ; le remplissage passe par Motion (`--part` animée avec le rebond du
  jeton), **les rayures ne défilent que pendant l'arrivée** (`data-anime` posé puis retiré à la fin : revue 18, WCAG 2.2.2).
- [ ] `Steps` : `<ol>` (la liste donne le nombre d'étapes aux lecteurs d'écran) ; **le CSS est adapté** : `.suivi > div` devient `.suivi > li`, avec la remise à zéro de la liste (`list-style: none; padding: 0; margin: 0`), `/* écart au système : structure sémantique */` ; chaque étape a **une coche SVG et un texte réservé** (« faite » / « à venir ») ; la dernière
  étape faite porte `aria-current="step"` (revue 12) ; l'étape qui se remplit joue le remplissage par Motion.
- [ ] `EffectRow` : `sens` (`perd`, `reste`, `change`), icône **SVG distincte par forme** (croix, coche, flèche : fini les
  glyphes hors police, revue 17), `aria-hidden` ; un préfixe réservé aux lecteurs d'écran (« Disparaît : », « Reste : »,
  « Change : »).

**Cas de test :** `getByRole('progressbar', { name })` avec `aria-valuenow` ; `150` → 100, `-3` → 0, `NaN` → 0 ;
`data-anime` retiré à la fin (horloge simulée) ; `Steps` : `aria-current="step"` sur la bonne étape seulement, le texte
« faite » présent ; `EffectRow` : le préfixe est lu et l'icône est cachée ; axe. **Mutations :** retirer la borne (casse) ;
laisser `data-anime` en permanence (casse) ; `aria-current` partout (casse) ; retirer le préfixe (casse).
**Retour arrière :** `git revert`.

### F14 : Le mouvement : fournisseur Motion, entrée d'écran, décor, tampon

**Pourquoi :** D11 : une seule politique de mouvement ; le premier composant animé par Motion. **Dépend de :** F8. **En
parallèle de :** F9, F12, F17. **Taille :** ≈ 360 lignes. **Sources à relire :** Motion `react-reduce-bundle-size`,
`react-motion-config`, `react-accessibility` ; `jetons.css`.

**Fichiers :** `package.json` (`motion@14.12.0` : la 13 → 14 est une majeure que `dependabot.yml` ignore ; la doc Motion dit « 14.0 : aucune rupture » ; ce plan est le chantier dédié), `src/ui/MotionProvider.tsx`, `src/ui/mouvement.ts`, `src/ui/mouvement.test.ts`, `src/ui/Screen.tsx`,
`src/ui/Enter.tsx`, `src/ui/Sun.tsx`, `src/ui/Ground.tsx`, `src/ui/Stamp.tsx`, leurs tests, `src/test/setup.ts`
(`MotionGlobalConfig.skipAnimations = true`), `src/main.tsx` (enveloppe), `src/banc/sections/entree.tsx`,
`src/banc/sections/decor.tsx`, `src/banc/sections/tampon.tsx`, `src/styles/composants.css` (retirer les `@keyframes` de
`entre` et `tampon`).

- [ ] `MotionProvider` : `<LazyMotion features={domAnimation} strict><MotionConfig reducedMotion="user">…` ; **tous les
  composants animés utilisent `m` de `motion/react-m`** (`strict` fait échouer un `motion.div` égaré : Motion passe de
  ~43 ko à ~5 ko au départ, +24 ko pour `domAnimation`). Enveloppe posée dans `main.tsx` et dans le banc.
- [ ] `mouvement.ts` : **fonctions pures** : `DUREES` et `COURBES` (les mêmes valeurs que les jetons : `--duree-entree`
  550 ms, `--decalage-entree` 70 ms, `--duree-ecran` 500 ms, `--duree-appui` 90 ms ; `--ease-rebond` `[0.34, 1.56, 0.64, 1]`,
  `--ease-sortie` `[0.22, 1, 0.36, 1]`) ; `variantesEntree(rang, reduit)` ; `variantesTampon(reduit)` ; en mouvement réduit :
  **ni `y`, ni `scale`, ni `rotate`**, seulement `opacity` en 1 ms (la doc Motion : `reducedMotion="user"` ne coupe que
  les transformations, pas l'opacité : la politique est donc la nôtre, une fois).
- [ ] `Screen` (**un `<div>`**, pas un `<main>` : la racine de F3 a déjà `<main id="contenu">`, un second créerait des repères en double, WCAG 1.3.1 ; avec le fond crème et la zone sûre) et `Enter` (`rang` → délai `rang × 70 ms`, premier élément sans
  retard) ; `Stamp` (arrivée en tournant, `onArrive`) ; `Sun` (`variant` ciel ou rose, `aria-hidden`), `Ground`.
- [ ] Retirer de `composants.css` les `@keyframes entre` et `tampon` et leurs `animation:` (le banc prouve l'identité de
  rendu à l'état final).

**Cas de test :** `mouvement.test.ts` : les constantes **égalent les jetons lus dans `jetons.css`** (parité) ;
`variantesEntree(2, false).delay === 0.14` ; `variantesEntree(0, false)` n'a aucun retard ;
`variantesEntree(2, true)` n'a ni `y`, ni `scale`, ni `rotate` ; `Enter` rend ses enfants dans l'ordre ; **un `motion.div`
dans le fournisseur lève** (`strict`) ; `Sun` est `aria-hidden` et n'est pas focalisable ; `Stamp` rend son texte et
appelle `onArrive` ; axe. **Mutations :** décalage 70 → 700 ms (casse) ; garder `y` en mouvement réduit (casse) ; un
jeton retouché sans la constante (casse la parité) ; `strict` retiré (casse) ; `Sun` sans `aria-hidden` (casse).
**Retour arrière :** `git revert` (les `@keyframes` reviennent avec).

### F15 : La feuille qui monte

**Pourquoi :** saisie courte en modale (APG « dialog », WCAG 2.4.3). **Dépend de :** F14, F9. **En parallèle de :** F16,
F10, F11. **Taille :** ≈ 300 lignes. **Sources :** MDN `<dialog>`, APG « Dialog (Modal) ».

**Fichiers :** `src/ui/Sheet.tsx`, `src/ui/Sheet.test.tsx`, `src/banc/sections/feuille.tsx`, `e2e/feuille.spec.ts`,
`src/styles/composants.css` (`::backdrop`, retrait du `@keyframes monte`).

- [ ] `Sheet` : **`<dialog>` natif** ouvert par `showModal()` (piège de focus, `Échap`, retour du focus à l'élément qui
  l'a ouvert : c'est le navigateur) ; `aria-labelledby` vers son titre ; `onClose` branché sur l'événement `cancel` et sur le
  clic sur le fond ; Motion monte la feuille (`y: 105% → 0`, 500 ms, courbe de sortie), la **redescend avant** `dialog.close()` ; **l'événement `cancel` (`Échap`) est `preventDefault()`é** (par défaut le navigateur ferme **aussitôt** : MDN, l'animation de sortie
  ne jouerait jamais) : on joue la sortie, puis `close()` ; le clic sur le fond suit le même chemin ; en mouvement réduit, aucun glissement. Fond de la feuille : `background: var(--color-voile)` (le jeton existe : « fond sous une feuille »).
- [ ] Banc : un bouton qui l'ouvre ; Playwright : ouverture, `Tab` boucle **dans** la feuille, `Échap` ferme, le focus
  revient au bouton, la page derrière est inerte, axe sur la feuille ouverte.

**Cas de test** (happy-dom : `showModal` existe) : `open` → `getByRole('dialog', { name })` ; `cancel` → `preventDefault` appelé, **le dialogue est encore `open` pendant la sortie**, puis fermé à la fin de l'animation (horloge simulée), `onClose` une seule fois ; clic
sur le fond → `onClose`, clic dedans → non ; fermé → rien dans le DOM d'accessibilité ; démonter pendant l'animation ne
lève pas. **Mutations :** ne pas empêcher `cancel` (le test « le dialogue reste ouvert pendant la sortie » casse) ; `show()` au lieu de `showModal()` (le test Playwright du piège de focus casse) ; retirer
`aria-labelledby` (casse) ; ne pas brancher `cancel` (casse) ; `close()` avant l'animation de sortie (le test de séquence
casse).
**Retour arrière :** `git revert`.

### F16 : Les confettis

**Pourquoi :** règle 7 (« une réussite se fête, une seule fois »), sans coût d'accessibilité ni de performance.
**Dépend de :** F14. **En parallèle de :** F15. **Taille :** ≈ 260 lignes.

**Fichiers :** `src/ui/Confetti.tsx`, `src/ui/confetti.ts` (trajectoires pures), leurs tests,
`src/banc/sections/confettis.tsx` (dans la section « Décor, bulle, entrée d'écran, confettis » : cas « Touche le bouton :
confettis et joie »), `src/styles/composants.css` (classes `.confetti--0` à `--4` posant la couleur par jeton).

- [ ] `confetti.ts` : `trajectoires(graine, n)` (générateur seedé, mulberry32) rend positions, angles, durées (1,4 à
  2 s), rotations ; `n` plafonné à 60. `Confetti` (`declencheur`, `origine`, `graine?`) : un calque `aria-hidden`,
  `pointer-events: none`, non focalisable ; chaque particule est un `m.i` animé par Motion, retirée à la fin ; **rien du
  tout en mouvement réduit** ; un seul jet vivant à la fois ; la graine par défaut vient de `crypto.getRandomValues`.
  Les couleurs sont des classes sur les cinq jetons franches (aucune couleur en JavaScript).

**Cas de test :** `trajectoires(1234, 30)` est déterministe (deux appels égaux, graine différente → différent) ; plafond ;
le composant rend `n` particules avec la graine injectée ; calque `aria-hidden` ; mouvement réduit → aucune particule ;
démontage → plus rien ; un second déclencheur pendant le jet n'en ajoute pas ; axe. **Mutations :** `Math.random` à la place de
la graine (le test déterministe casse) ; retirer la garde de mouvement réduit (casse) ; plafond retiré (casse) ; couleur
codée en hexadécimal (`css.test` de F7 casse).
**Retour arrière :** `git revert`.

### F17 : La marmite et ses sept états

**Pourquoi :** le visage de l'assistant et de la voix ; revue 3, 7, 10, 16, 17. **Dépend de :** F8 (le système livre désormais un signe dessiné par état : ondes, goutte, bouche ouverte…). **En parallèle de :** F9, F12, F13, F14. **Taille :** ≈ 330 lignes.
**Source :** `.design/systeme/reference.html` (le SVG `POT`), APG, MDN `aria-live`.

**Fichiers :** `src/ui/Pot.tsx`, `src/ui/Pot.test.tsx`, `src/textes/marmite.ts`, `src/banc/sections/marmite.tsx`,
`e2e/marmite.spec.ts`, `src/styles/composants.css` (couleurs du SVG par classes).

- [ ] `Pot` (`etat`, `annonce?: boolean | string` **(défaut `false`)**, `nom?`, `joieMs = 1400`, `onJoieFinie`) : le SVG de la référence en
  **JSX** (jamais `innerHTML`) ; **décorative par défaut** (`aria-hidden="true"` : le `LISEZMOI` du système le veut, c'est le texte
  qui l'accompagne qui porte `role="status"`) ; avec `nom`, elle devient `role="img"` nommée (rare : une marmite seule, sans texte) ; `data-etat` ∈ `repos`, `sommeil`, `ecoute`, `reflexion`,
  `parole`, `joie`, `inquiet` (valeurs du système, D13 ; une valeur inconnue retombe sur `repos`) ; les couleurs du SVG
  passent par des classes qui lisent les jetons existants (tomate, jaune, rose, encre, papier) : plus de `#FF5A47` dans le JSX.
- [ ] **Annonce, à la demande seulement** (`annonce={true}` ou une phrase : la revue a montré qu'une annonce par défaut dirait « Popote se
  réveille » sur l'écran « trop de demandes ») : une région `role="status"` réservée aux lecteurs d'écran, **présente dès le premier
  rendu** et dont seul le texte change, avec les phrases du catalogue (`sommeil` : « Popote se réveille, ça prend quelques secondes. » ;
  `ecoute`, `reflexion`, `parole`, `joie`, `inquiet` ; `repos` : rien). `annonce={false}` (le défaut) ne rend **pas** de région (un écran d'état n'a **qu'une** région `status`, la sienne) ;
  `annonce="…"` remplace la phrase du catalogue. **Chaque tâche d'état (F18 à F21) a un test « une seule région `status` »** sur son écran.
- [ ] `joie` : deux sauts puis **retour automatique** à `repos` après `joieMs` (appelle `onJoieFinie` une seule fois).
- [ ] **Mouvement réduit** (Playwright `marmite.spec.ts`, `reducedMotion: 'reduce'`) : pour chacun des sept états, on relève
  la **signature visible** (parties du dessin affichées, leurs transformations) ; **les sept signatures sont distinctes**
  (revue 3 : « `parole` est identique à `repos` » ne passe plus).
- [ ] Banc : les sept cas « Repos : `repos` », « Sommeil : `sommeil` », … et la scène « Touche le bouton : confettis et
  joie » (avec F16) et la variante ciel « Ce lien a expiré » (inquiet).

**Cas de test :** sans `nom`, `aria-hidden` et aucun rôle ; avec `nom`, `getByRole('img', { name })` ; chaque `etat` → `data-etat` ; une valeur inconnue → `repos` ; avec `annonce={true}`, la région existe au
premier rendu, vide ; `rerender` en `sommeil` met **le même nœud** à jour avec la phrase ; `annonce` absent → aucune région ; `annonce={true}` → une région ; `joie` revient à `repos` à `joieMs` (horloge simulée) et `onJoieFinie` part une fois ; aucune couleur
hexadécimale dans le DOM rendu ; axe. **Mutations :** région absente au premier rendu avec `annonce` (casse) ; `annonce` vrai par défaut (casse) ;  phrase de `sommeil`
changée ou vide (casse) ; `joie` ne retourne jamais au repos (casse) ; une valeur d'état inconnue laissée telle quelle
(casse) ; `innerHTML` (`architecture.test` casse) ; effacer la vapeur ou le dessin d'un état (le test des sept signatures casse).
**Retour arrière :** `git revert`.

### F18 : L'état de réveil (l'API sort de veille, 5 à 7 s)

**Pourquoi :** consigne 5 ; la marmite en `sommeil`. **Dépend de :** F5b, F17, F12 (Block), F9. **En parallèle de :** F20.
**Taille :** ≈ 360 lignes.

**Fichiers :** `src/etats/reveil.ts` (machine à états + magasin), `src/etats/EcranReveil.tsx`,
`src/etats/reveil.test.ts(x)`, `src/textes/reveil.ts`, `src/routes/__root.tsx` (monte l'écran), `src/banc/sections/etat-reveil.tsx`.

- [ ] `reveil.ts` (`useSyncExternalStore`) s'abonne aux événements `requete:debut` / `requete:fin` de F5a : **une requête
  sans réponse au bout de 2 000 ms, quand l'API n'a répondu à personne depuis 5 minutes ou plus (ou depuis le chargement de la
  page)**, passe en `reveil` : une veille de conteneur n'arrive qu'après une inactivité, alors qu'une photo ou une réponse de
  l'assistant lentes, juste après une autre réponse, ne sont pas une veille (revue : sinon l'écran de réveil couvrirait toute
  requête légitimement lente) ; la première réponse (n'importe quel statut) le termine ; l'écran
  reste **1 200 ms au moins** (pas de clignotement) ; plusieurs requêtes en vol comptent **une** seule veille ; une
  requête qui échoue (`502`, `503`, `504`, réseau) termine la veille et laisse la frontière d'erreur parler.
- [ ] `EcranReveil` : `Pot etat="sommeil"`, un `Bloc` et une phrase qui évolue à 0 s « Popote se réveille… », 3 s,
  6 s, puis 12 s « C'est plus long que d'habitude, on y est presque. » (changements **visuels** ; **annonces : deux
  seulement**, au début et à la fin « C'est prêt ») ; sortie par Motion (mouvement réduit : sans glissement). Posé dans la
  racine ; tant qu'il est affiché, ****toute la coque est `inert`** (`#coque` de F3, qui contient le lien d'évitement **et** `main` : `#contenu` seul laisserait Tab
  atteindre le lien d'évitement masqué ; le focus serait masqué, WCAG 2.4.11), l'écran de réveil étant **hors** de `#coque` ; à l'ouverture le
  focus **va à l'écran de réveil** (un titre `tabIndex={-1}`), à la fin il **retourne à l'élément qui l'avait** (s'il existe encore, sinon `#contenu`) ; sa région `status` est **la seule** de l'écran (`Pot` sans `annonce`).
- [ ] Banc : trois moments (début, 6 s, 12 s) en mode figé.

**Cas de test** (MSW avec réponses différées, horloge simulée) : réponse à 1 900 ms → l'écran **n'apparaît jamais** ;
réponse à 2 100 ms → il apparaît, `Pot` en `sommeil`, `status` annonce ; réponse à 2 100 ms **alors qu'une autre réponse est arrivée 1 minute plus tôt** → pas d'écran ; réponse à 6 500 ms → il
disparaît après son minimum, et le texte annoncé a changé **exactement deux fois**, `#coque` redevient interactive, le focus est **revenu** à l'élément d'avant, **une seule
région `status`** est présente ; pendant l'écran, `Tab` ne sort pas de lui (aucun élément focalisable dans `#coque`) ; trois requêtes simultanées → un seul écran ; un `503`
rapide → pas d'écran de réveil, la frontière d'erreur s'affiche ; démontage → plus de minuteur ; au-delà de 12 s, la
phrase change. **Mutations :** seuil 2 000 → 200 (casse) ; retirer la condition d'inactivité (casse) ; oublier `inert` ou ne le poser que sur `main` (le test « aucun focalisable dans la coque » casse) ; ne pas rendre le focus (casse) ; supprimer le minimum d'affichage (casse) ; compter une veille par
requête (casse) ; annoncer à chaque changement de phrase (casse) ; ne pas arrêter à une erreur (casse).
**Retour arrière :** `git revert` (la racine retire l'écran).

### F19 : Chargement et erreur, frontières par route

**Pourquoi :** consigne 5 ; § 8.3 ; tableau des états de `building-frontends`. **Dépend de :** F3, F5a, F17, F12, F9. **En
parallèle de :** F18, F20. **Taille :** ≈ 380 lignes.

**Fichiers :** `src/etats/Chargement.tsx`, `src/etats/ErreurEcran.tsx`, `src/etats/ErreurRoute.tsx`,
`src/etats/NonTrouvee.tsx` (ces deux fichiers existent depuis F3 : F19 **réécrit leur contenu**, aucune route ni la racine ne change), `src/etats/*.test.tsx`, `src/textes/etats.ts`, `src/router.tsx` (`defaultPendingComponent`),
`src/routes/routes.test.tsx` (le test de F3 est étendu), `src/banc/sections/etat-chargement.tsx`, `etat-erreur.tsx`.

- [ ] `Chargement` : une région `role="status"` avec texte (« Un instant… »), des blocs-squelettes aux couleurs du système
  (`--color-filet`), **sans animation en mouvement réduit** ; `defaultPendingComponent`.
- [ ] `ErreurEcran` (`erreur`, `reessayer`) : `Pot etat="inquiet"` (sans `annonce`), un `Bloc` en `role="alert"` (**la seule** région annoncée de l'écran) ;
  pour une `ErreurApi` : son `title` et son `detail` (français, sans détail technique, § 3.3 de la spec) et la
  **référence** (`instance`) à communiquer ; pour une `ErreurReseau` : la phrase du catalogue ; pour tout le reste :
  la phrase générique — **jamais** `error.message` ni la pile (souvent en anglais). Boutons « Réessayer » (le retour
  du routeur : `router.invalidate()`) et « Retour à l'accueil ». Un seul `console.error` avec **la référence seulement**.
  Si l'erreur est une `TropDeDemandes`, `ErreurEcran` rend l'état de F20.
- [ ] `ErreurRoute` = le `errorComponent` de **chaque** route (la règle de la spec : une frontière par route) ;
  `NonTrouvee` pour `notFoundComponent`.

**Cas de test :** un problem+json `500` montre le `detail` et la référence ; un `ErreurReseau` montre la phrase réseau ; une
`TypeError('x is undefined')` montre la phrase générique **sans** `x is undefined` ; aucun mot anglais du message d'origine
n'apparaît ; `role="alert"` ; « Réessayer » rappelle le chargeur ; **une erreur levée par une route enfant est attrapée
par la frontière de cette route, pas par la racine** ; `routes.test.tsx` exige `ErreurRoute` explicitement sur chaque route ;
`Chargement` s'affiche après `defaultPendingMs` (horloge simulée), avec `status` ; axe sur chaque état. **Mutations :**
afficher `error.message` (casse) ; retirer `role="alert"` (casse) ; une route sans `errorComponent` (casse) ; logguer
l'erreur entière (casse : le test de journal regarde la sortie).
**Retour arrière :** `git revert`.

### F20 : « Trop de demandes, réessaie dans N s »

**Dépend de :** F5a, F17, F9 (prop `pause`). **En parallèle de :** F18, F19. **Taille :** ≈ 260 lignes.

**Fichiers :** `src/etats/TropDeDemandes.tsx` (le bouton est celui de F9 : **aucun fichier de F9 n'est touché**), `src/etats/compte-a-rebours.ts`, `src/etats/*.test.ts(x)`,
`src/textes/limite.ts`, `src/banc/sections/etat-limite.tsx`.

- [ ] `useCompteARebours(secondes)` fondé sur une **échéance** (`Date.now() + secondes × 1000`), pas sur un compteur de
  tics (les minuteurs d'un onglet en arrière-plan sont ralentis) : recalcule au retour de l'onglet (`visibilitychange`).
- [ ] `TropDeDemandes` (`erreur`, `reessayer`) : `Pot etat="sommeil"` **sans `annonce`** (c'est son sens dans le système : « une connexion est
  en pause après trop d'essais » ; sa phrase « Popote se réveille » serait fausse ici), « Réessaie dans N s » (pluriel du catalogue),
  le bouton « Réessayer » en `pause` (F9 : `aria-disabled`, focalisable) jusqu'à 0, **sans déplacer le focus** à 0 ; annonces : au début (« Trop de demandes. Réessaie dans N
  secondes. ») et à la fin (« Tu peux réessayer. ») ; le nombre qui décompte est **hors** de la région annoncée.

**Cas de test** (horloge simulée) : 30 s → 29, 28… → 0 ; le bouton ne réagit pas avant 0 (clic **et** clavier) ; **un saut de
20 s d'un coup** affiche le reste exact (échéance) ; `Retry-After` de l'erreur de F5a est lu (30 s) ; deux annonces
exactement, **une seule région `status`** dans l'écran ; pluriel (« 1 seconde », « 2 secondes »). **Mutations :** compteur de tics au lieu de l'échéance (le saut de
20 s casse) ; activer le bouton à 1 s (casse) ; annoncer chaque seconde (casse) ; ignorer `Retry-After` (toujours 10 : casse).
**Retour arrière :** `git revert`.

### F21 : Perte de réseau et session expirée

**Dépend de :** F5b, F3, F9, F17. **En parallèle de :** rien (touche `_connecte` et la racine). **Taille :** ≈ 380 lignes.
**Sources :** TanStack Query `network-mode`, `online-manager` ; OWASP « Unvalidated Redirects » ; `normes-api.md` § 3.10.

**Fichiers :** `src/etats/reseau.ts`, `src/etats/BandeauReseau.tsx`, `src/etats/session-expiree.ts`,
`src/routes/entrer.tsx` (message « session expirée »), `src/routes/__root.tsx`,
`src/textes/reseau.ts`, `src/textes/session.ts`, leurs tests, `src/banc/sections/etat-reseau.tsx`,
`src/banc/sections/etat-session.tsx`.

- [ ] **Réseau** : `reseau.ts` suit `online` / `offline` et `navigator.onLine` (même source que `onlineManager` de Query) ;
  `BandeauReseau` : conteneur `role="status"` **présent dès le premier rendu**, « Tu n'as plus de réseau. Popote reprend
  toute seule quand il revient. » ; les lectures se mettent en pause (Query) ; **les écritures attendent et repartent avec
  la même `Idempotency-Key`** (F5b) ; rien n'est perdu de ce que la personne a saisi.
- [ ] **Session expirée** : `session-expiree.ts` s'abonne à l'événement `non-authentifie` de F5a (qui porte la méthode et le
  chemin du contrat) et **ne réagit que pour les routes protégées**, celles de `src/api/routes-protegees.ts` (F4), **tirée du
  `security` du contrat** : `POST /api/v1/sessions` (identifiants refusés), les invitations et `healthz` n'en portent pas, donc
  une `401` y est traitée par l'écran du formulaire, pas par ce flux. Aucune liste écrite à la main : une synchronisation du
  contrat qui apporte une route (les codes par mail et les clés d'accès de 0.4bis) la classe d'elle-même. Le flux : vide le cache
  (`queryClient.clear()` : plus de donnée privée en mémoire), puis `navigate` vers
  `/entrer?raison=expiree&retour=<cheminSur(location.pathname + location.search)>` (`cheminSur` : F5b) **une seule fois** même si trois requêtes reçoivent
  un `401` ensemble. L'écran « Entrer » (stub) affiche, pour `raison=expiree`, `Pot inquiet` **sans `annonce`** et « Ta session a
  expiré. Reconnecte-toi pour continuer. » (`role="status"`, **la seule région** de l'écran).

**Cas de test** (MSW, historique mémoire) : `offline` → bandeau annoncé ; `online` → bandeau retiré, la mutation en attente
part **avec la même clé** (une seule requête vue) ; `401` sur `GET /api/v1/me/sessions` → `/entrer?raison=expiree&retour=…`, cache
vide, **une** navigation pour trois `401` simultanés ; `401` sur `POST /api/v1/sessions` → pas de redirection ; `retour` hostile
dans l'adresse d'`entrer` (`//evil.fr`, `/\evil.fr`, `https://evil.fr`, `javascript:alert(1)`) → ignoré ; `routes-protegees` : `GET /api/v1/me` est protégée et `POST /api/v1/sessions` ne l'est pas (échantillon du contrat réel) ; le bandeau et l'écran n'ont chacun qu'**une** région `status` ; axe. **Mutations :** ne pas vider le cache (casse) ; accepter `//evil.fr` dans `retour`
(casse) ; traiter une `401` d'une route sans `security` comme une expiration (casse) ; une clé neuve à la reprise (casse) ; émettre
l'événement à chaque `401` sans débounce (casse).
**Retour arrière :** `git revert` ; les erreurs `401` retombent sur la frontière d'erreur.

### F22 : La PWA

**Pourquoi :** consigne 6 ; § 2 (« le service worker exclut `/api/*` de son repli de navigation et de ses caches »).
**Dépend de :** F6 (couleurs, `index.html`), F3. **En parallèle de :** F18 à F21. **Taille :** ≈ 330 lignes.
**Sources à relire :** `vite-pwa-org.netlify.app` (`guide/register-service-worker`, `workbox/generate-sw`), la doc de
`selfDestroying`.

**Fichiers :** `package.json` (`vite-plugin-pwa@2.0.0`, `workbox-build@7.4.1`, `workbox-window@7.4.1`), `vite.config.ts`,
`src/main.tsx`, `src/pwa/MiseAJour.tsx`, `src/pwa/MiseAJour.test.tsx`, `src/textes/pwa.ts`,
`scripts/verifie-build.mjs` (+ test), `e2e/pwa.spec.ts`, `public/` et `.design/systeme/icones/` (icônes, voir « Questions tranchées », 1), `docs/exploitation-front.md`.

- [ ] `VitePWA({ registerType: 'prompt', injectRegister: false, manifest: {…}, workbox: { navigateFallback: 'index.html',
  navigateFallbackDenylist: [/^\/api\//, /^\/mail\//], runtimeCaching: [], globIgnores: ['mail/**', '**/*.map'],
  cleanupOutdatedCaches: true } })` ; l'inscription par `useRegisterSW` (`virtual:pwa-register/react`) dans `MiseAJour` :
  un bandeau « Une nouvelle version de Popote est prête. » + bouton « Recharger » (`role="status"`, présent dès le
  premier rendu) **sans jamais de rechargement forcé** (décidé). **Pas de mise à jour tant qu'une saisie est modifiée ou qu'une écriture attend** :
  `src/pwa/saisie-en-cours.ts` (`useSaisieEnCours(sale: boolean)`, un compteur de formulaires modifiés, **en mémoire seulement** : aucune donnée
  personnelle n'est écrite dans le navigateur) et `useMutationState({ filters: { status: 'pending' } })` (une mutation **suspendue** hors ligne est
  `pending`) ; si l'un des deux est vrai, le bouton est en `pause` (F9) avec « Termine ta saisie avant de recharger » (ou « Une écriture attend le
  réseau »), et il se libère tout seul. Les formulaires des parcours appellent `useSaisieEnCours` (règle écrite dans `docs/front.md`).
- [ ] Manifeste : `id` et `start_url` `/`, `scope` `/`, `display: 'standalone'`, `lang: 'fr'`, `name` et `short_name`
  « Popote », `background_color` et `theme_color` = `--color-creme` (lus de `jetons.css` par la configuration : un test
  vérifie l'égalité), icônes 192, 512 et maskable, `apple-touch-icon` 180 et favicon : **ceux de `.design/systeme/icones/` s'ils existent** (la session de design les livre plus
  tard : SVG source, PNG 192 et 512, maskable, 180, favicon), sinon les actuelles (vertes) ; un test `verifie-build` vérifie que chaque icône du manifeste est un fichier du
  build. `index.html` : `theme-color` identique, `<link rel="icon">` et `apple-touch-icon` vers les mêmes fichiers.
- [ ] `verifie-build.mjs` : ajouter les contrôles du service worker : `sw.js` contient `/^\/api\//` dans la liste de
  refus, **aucune route d'exécution** (`registerRoute`) dont l'expression reconnaît `/api/`, **aucune URL `/api` dans
  le précache** ; `manifest.webmanifest` a les champs ci-dessus ; `registerSW.js` n'existe pas (inscription par module) ;
  aucun `<script>` en ligne (déjà F6).
- [ ] `e2e/pwa.spec.ts` (relais local) : le service worker s'active ; une page appelle `/api/healthz` (réponse `502` du relais
  sans amont : peu importe) ; `caches.keys()` puis le contenu de **chaque** cache ne liste **aucune** requête `/api/` ;
  hors ligne (`context.setOffline(true)`), la coquille s'ouvre et un appel à `/api/healthz` **échoue** (n'est pas servi du
  cache) ; la bannière de mise à jour apparaît quand `needRefresh` passe à vrai (test de composant, `useRegisterSW`
  simulé).
- [ ] **Transition F1 → F22** (risque écrit : F1 est en `autoUpdate`, F22 en `prompt` ; un navigateur qui porte le `sw.js` de F1
  reçoit un `sw.js` qui **attend** au lieu de s'activer) : preuve Playwright à jouer une fois, commandes dans la PR : servir la
  construction de F1, charger (service worker de F1 actif), servir celle de F22 sur la même origine, recharger : la bannière « nouvelle
  version » apparaît, le clic active la nouvelle version, et l'ancienne page d'attente disparaît. Si le service worker de F1 reste
  sans réponse, F22 garde `skipWaiting` **une fois** (retiré à F23+1).
- [ ] `docs/exploitation-front.md` : **retour arrière d'une PWA** : redéployer avec `selfDestroying: true` (le
  service worker se désinscrit et vide ses caches chez chaque navigateur à sa visite suivante) ; ce que fait une
  réinstallation (une PWA est liée à son adresse : la bascule de la prod en demandera une).

**Cas de test :** `verifie-build` sur des `sw.js` factices : retirer la règle `/api/`, ajouter un `registerRoute` qui
reconnaît `/api/v1/me`, précacher `/api/…` → échec chaque fois ; manifeste sans `lang` → échec ; couleurs ≠ jetons → échec ;
test Playwright ci-dessus ; `MiseAJour` : `needRefresh` faux → la région existe, vide ; vrai **sans saisie ni écriture** → le bouton apparaît, un clic
appelle `updateServiceWorker` ; axe. **Mutations :** retirer `/^\/api\//` de la liste (le contrôle de build et le test
Playwright cassent) ; `runtimeCaching` pour `/api` en `StaleWhileRevalidate` (casse) ; `injectRegister: 'inline'` (`verifie-build`
casse : script en ligne) ; `registerType: 'autoUpdate'` (la bannière disparaît : casse) ; le bouton actif malgré un formulaire modifié ou une mutation suspendue (casse) ; `useSaisieEnCours` qui écrit dans `localStorage` (l'architecture refuse : à ajouter au test).
**Retour arrière :** `selfDestroying: true` puis redéploiement (voir plus haut) ; ou `git revert`.

### F23 : Le déploiement sur l'essai : CSP en `enforce`, cache des fichiers, fumée plus serrée

**Pourquoi :** consigne 6 (« le déploiement sur l'essai ») ; § 7.3. **Dépend de :** F22, F8. **En parallèle de :** rien (F24 en dépend). **Taille :** ≈ 300 lignes. **Sources :** Cloudflare Workers (static assets, headers), `wrangler rollback` (CLI 4.155).

**Fichiers :** `relais/src/index.ts`, `relais/src/index.test.ts`, `wrangler.jsonc`, `scripts/fumee-essai.sh`,
`.github/workflows/ci.yml` (job `deploie-essai`), `docs/exploitation-front.md`.

- [ ] **Cache des fichiers** (relais) : pour un fichier servi avec le statut 200 **dont le type n'est pas `text/html`** et
  dont le chemin est sous `/assets/` : `Cache-Control: public, max-age=31536000, immutable` (noms hachés) ; pour
  `/sw.js`, `/manifest.webmanifest`, `/index.html` et **toute réponse HTML** (le repli SPA d'une URL inconnue sous
  `/assets/` rend `index.html` : il ne doit **jamais** être immuable) : `no-cache`. Les en-têtes que l'amont a déjà posés
  priment, comme pour `/api/`.
- [ ] `wrangler.jsonc` : la CSP gagne `object-src 'none'` (et `relais/src/index.test.ts` le vérifie : la chaîne exacte de la CSP est comparée) ; `CSP_MODE` passe à `"enforce"` (la CSP est inchangée ; elle n'était en `report-only` que parce que
  l'ancien front parlait à Supabase ; sans `report-to`, `report-only` ne signale rien à personne ; la preuve de
  l'absence de violation, c'est la garde de F8 sous `enforce`) ; mettre à jour le commentaire.
- [ ] `scripts/fumee-essai.sh` : exiger `Content-Security-Policy` (et plus l'un **ou** l'autre) ; `GET /sw.js` : 200 et
  `Cache-Control` contenant `no-cache` ; `GET /manifest.webmanifest` : 200 ; un fichier de `/assets/` (extrait du `<link
  rel="preload">` de l'accueil) : 200, `Content-Type` en `font/woff2`, `immutable` ; `/api/healthz` inchangé.
- [ ] CI, job `deploie-essai` : `npm run build` ; **`node scripts/verifie-build.mjs dist` avant `wrangler deploy`** ; la fumée
  après. `docs/exploitation-front.md` : **retour arrière d'un déploiement** : `npx wrangler versions list` puis
  `npx wrangler rollback <version>` (ou `git revert` et redéploiement) ; ce qu'on regarde (la fumée, l'onglet réseau).

**Cas de test** (`relais/src/index.test.ts`, mêmes outils que les 22 tests existants) : `/assets/x-abc.js` 200 JS →
`immutable` ; **`/assets/inconnu.js` qui retombe sur `index.html` → `no-cache`, pas `immutable`** ; `/sw.js` → `no-cache` ;
`/` → `no-cache` ; un en-tête déjà posé par l'amont n'est pas écrasé ; la CSP part en `Content-Security-Policy` avec
`CSP_MODE: 'enforce'`. Fumée : jouée contre `wrangler dev` local avec un amont simulé (`python -m http.server`) pour la
partie `/api/healthz` ; une réponse en `report-only` fait échouer la fumée.
**Mutations :** `immutable` aussi pour le HTML de repli (le test casse) ; `immutable` sur `/sw.js` (casse : un `sw.js`
immuable ne se mettrait plus jamais à jour) ; la fumée accepte `report-only` (le test de la fumée casse) ; retirer
`verifie-build` du déploiement (à relire en revue de la CI).
**Retour arrière :** `wrangler rollback` (essai) ; `git revert` pour le code ; `CSP_MODE` remis à `report-only` seulement si
la garde de F8 s'est trompée (alors on corrige la garde).

### F24 : Les budgets de performance (Lighthouse) dans la CI

**Pourquoi :** consigne 7 ; § 8.3 (« budgets de performance (Lighthouse) dans l'intégration continue »). **Dépend de :**
F23. **Taille :** ≈ 200 lignes. **Source à relire :** `googlechrome.github.io/lighthouse-ci/docs/configuration.html`.

**Fichiers :** `lighthouserc.json`, `package.json` (`@lhci/cli@0.16.0`), `.github/workflows/ci.yml` (job `lighthouse`),
`docs/performance.md`.

- [ ] `lighthouserc.json` : `collect` : `startServerCommand` = le relais local sur le **build de prod** (`npm run build &&
  npx wrangler dev --port 4173 --var CSP_MODE:enforce …`), `url: ["http://127.0.0.1:4173/entrer"]`,
  `numberOfRuns: 3` (la médiane), préréglage mobile par défaut ; `assert` : `categories:performance` ≥ 0,9 (error),
  `categories:accessibility` = 1 (error), `categories:best-practices` ≥ 0,95 (error), `largest-contentful-paint` ≤
  2 500 (error), `cumulative-layout-shift` ≤ 0,1 (error), `total-blocking-time` ≤ 200 (**error**),
  `resource-summary:script:size` ≤ 200 000, `resource-summary:stylesheet:size` ≤ 30 000, `resource-summary:font:size` ≤
  80 000, **`resource-summary:image:size` ≤ 150 000, `resource-summary:total:size` ≤ 450 000** (toutes en **error**), `resource-summary:third-party:count` = 0 (error) ; `upload.target: 'filesystem'` puis artefact.
- [ ] **Mesurer d'abord** : lancer trois fois, noter les valeurs dans `docs/performance.md`, **puis fixer les poids à
  « mesure + 15 % »** (les 200, 30, 80, 150 et 450 ko sont provisoires). Le plus petit budget qui échoue sans raison valable est
  relevé **dans la PR qui l'explique**, jamais en silence.
- [ ] CI : job `lighthouse` (≤ 10 min ; `npx playwright install` n'est pas nécessaire, Chrome est celui du runner) ; ajouté
  à `needs` de `resultat`.

**Cas de test :** un build avec un script tiers factice, **un `<img>` de 2 Mo** (échoue sur `image:size` et `total:size`) ou un bloc de 900 ms de TBT (échoue sur `total-blocking-time`) fait échouer `lhci` (essayé une
fois à la main, noté dans la PR) ; le job échoue si `lhci` ne trouve pas Chrome (jamais vert par défaut).
**Mutations :** `third-party:count` retiré (le script factice passe : casse) ; `numberOfRuns: 1` (un run bruité fait
échouer au hasard : à constater) ; budget JS relevé sans commentaire (relu en revue).
**Retour arrière :** retirer le job ; les budgets ne bloquent rien d'autre.

### F25 : Clôture de la fondation

- [ ] **Revue adverse** de tout le plan réalisé (agent Sonnet, effort high, lecture seule ; Codex CLI en lecture seule en
  plus). Consigne : retrouver une violation de CSP, un `fetch` hors de la couche API, un composant sans nom
  accessible ou sans chemin clavier, une `/api` qui entrerait dans un cache, un `retour` qui sortirait de l'origine, un
  contrat qui dériverait sans être vu, une tâche mal ordonnée, un budget relevé sans raison.
- [ ] **Mutations** de toutes les tâches rejouées ; chacune casse un test.
- [ ] **Couverture du banc stricte** : `e2e/comparaison.spec.ts` échoue si **une section de `reference.html` n'est pas
  portée** ou si **une légende manque** (jusqu'ici, il n'échouait que sur les sections déjà portées) ; l'index de
  comparaison est regénéré aux deux tailles.
- [ ] **Jugement de la session de design** : lui remettre l'artefact de comparaison (téléphone 390×844 et PC 1440) et la
  liste des `/* écart au système : … */` (`grep -rn "écart au système" src/`) ; consigner son verdict dans la PR ;
  chaque écart est soit accepté et reporté **dans le système**, soit corrigé.
- [ ] **Liste de preuves manuelles, remplie dans la PR (bloquante dans sa forme, pas dans son résultat)** : lecteur d'écran (bouton à maintenir et son alternative,
  annonce de la marmite, réveil, perte de réseau), clavier seul (déjà automatisé : `banc.cibles`), zoom 200 %, largeur 320 px ; **chaque ligne dit « prouvé » ou « non prouvé »
  avec sa raison** ; la PR ne se ferme pas tant que la liste n'est pas remplie, mais un « non prouvé » écrit et regroupé dans les gestes de Kamil est admis.
- [ ] **Gestes de Kamil, regroupés (ne bloquent pas le code)** : relire sur le banc les phrases des états
  (« Questions tranchées », 5) ; sur son téléphone (PWA de l'essai installée) et sur son PC : ouvrir le banc via `vite dev` ou la
  construction du mode `banc`, jouer le bouton à maintenir, les confettis, le réveil ; **avec VoiceOver (iPhone) et le
  lecteur d'écran du PC** : le bouton à maintenir (alternative à deux activations), l'annonce de la marmite, la
  perte de réseau — consigner « prouvé » ou « non prouvé » ; remplacer, dans la règle de branche de GitHub, les
  contrôles exigés par le seul `resultat`.
- [ ] **Docs** : `docs/front.md` (structure, comment ajouter une route, une ressource, un composant, un état),
  `docs/banc.md`, `docs/contrat.md`, `docs/performance.md`, `docs/exploitation-front.md` à jour ; `AGENTS.md`
  (commandes : `npm run build:banc`, `npm run contrat:*`, `npx playwright test`) ; `docs/conventions.md` ; la spec
  (les lignes de « Amendements à la spec » sont déjà là depuis F1 ; vérifier que rien ne les contredit).
- [ ] Déployé sur l'essai, fumée verte, Lighthouse vert ; mémoire de l'agent mise à jour ; une phrase à Kamil.

---

## Amendements après la revue adverse du plan (13/11/2026) — ils priment sur le texte des tâches

Un agent adverse (Sonnet, effort élevé, lecture seule) a relu le plan contre le dépôt, la spec, le système de design, le contrat de
`popote-api` et les skills ; il a rejoué plusieurs essais. **Dix-huit constats, dont aucun bloquant ; douze importants. Tous sont traités
dans le corps du plan** ; la liste dit où, et ce qui a été nuancé. Vérifié par l'agent sans défaut : D1 (pair `^5.x`), D2 (happy-dom contre
jsdom), D5 (aucun script en ligne, refus de `/api/` dans `sw.js`), `oasdiff` et sa somme, versions npm, `Idempotency-Key` du contrat, CSS
du système sans `url(`, F1 sans référence orpheline.

| N° | Gravité | Constat | Traitement |
|---|---|---|---|
| 1 | important | le contrat compte déjà 12 chemins (pas 13) : `password-resets` retiré par `popote-api` #127 ; F21 ne testait qu'un sens et « déclare une 401 » est fausse comme règle (seul `POST /sessions` en déclare une parmi les routes publiques) | F4 : 12 chemins ; **routes protégées tirées du `security` du contrat** (`routes-protegees.ts` généré, vérifié par `contrat:verifie`) ; F21 n'a plus de liste écrite à la main. Rejoué ici : le contrat déclare `securitySchemes.session` et `security` sur chaque opération protégée |
| 2 | important | `AMONT` accepte tout SHA de 40 hexadécimaux, y compris celui d'une branche de demande retirée de `main` (`popote-api` fusionne par écrasement) | F4 : `--verifie` exige que le SHA soit un ancêtre de `main` (API `compare`), test négatif et mutation |
| 3 | important | `oasdiff breaking` compare tout le contrat, pas « ce que le front consomme » ; les `WARN` et les ajouts n'avaient pas de destination | critère 2 et F4 reformulés (choix conservateur assumé, route non consommée comprise) ; avertissements et changelog dans le résumé du job et en annotation ; procédure de reprise dans `docs/contrat.md` |
| 4 | important | `grep skipWaiting dist/sw.js` est vert en `autoUpdate` **et** en `prompt` : il ne prouve pas que l'ancien service worker sera remplacé | F1 : `scripts/verifie-sw-remplacant.mjs` (forme `self.skipWaiting(),x.clientsClaim()`) et son test sur les deux formes ; mutation « `prompt` » |
| 5 | mineur | le passage de `autoUpdate` (F1) à `prompt` (F22) fait attendre le nouveau service worker : risque non écrit | F22 : preuve Playwright de la transition F1 → F22 ; repli : `skipWaiting` une fois |
| 6 | important | `Pot` annonçait sa phrase par défaut : l'écran « trop de demandes » aurait dit « Popote se réveille » ; deux régions `status` par écran ; le système dit la marmite décorative | F17 : décorative (`aria-hidden`) par défaut, annonce **à la demande** ; F18 à F21 : `Pot` sans `annonce` et un test « une seule région `status` » |
| 7 | important | l'écran de réveil non modal laisse la page focalisable (focus masqué, WCAG 2.4.11) ; le seuil de 2 s se déclencherait sur toute requête lente | F18 : `inert` sur `#contenu` pendant l'écran ; la veille suppose **aucune réponse depuis 5 minutes** ; tests et mutations ; valeur écrite au tableau (à ajuster avec D1) |
| 8 | important | l'alternative du bouton à maintenir ne servait que les lecteurs d'écran : clavier et doigt n'avaient **aucun** autre chemin ; WCAG 2.5.1 hors sujet | F10 : un appui bref **arme**, un second (0,6 s au moins, 5 s au plus) confirme ; critères WCAG corrigés (2.1.1, 3.3.4) ; question 2 reformulée : elle adoucit la règle 8 |
| 9 | important | `maxLength={6}` tronque « 482 913 » avant le nettoyage (« 48291 ») | F11 : pas de `maxLength`, troncature dans le gestionnaire, test de collage au niveau du composant |
| 10 | important | F20 exige un bouton `aria-disabled` que F9 ne fournit pas (et sans style) | F9 livre la prop `pause` (`aria-disabled`, garde, style `[aria-disabled]`) ; F20 s'en sert sans toucher aux fichiers de F9 |
| 11 | important | fusion de plusieurs fichiers dans une même section du banc non spécifiée ; Couleurs et Typographie n'ont aucun `<small>` ; légendes de « La marmite » générées par script ; légendes « exactes » mal reprises | F8 : fusion par `reference` (h2), clés explicites pour les cas sans légende, appariement par **début** de légende lue dans le navigateur, échec si une clé désigne zéro ou plusieurs légendes |
| 12 | important | fichiers édités en parallèle non annoncés (`__root.tsx`, `routes/*.tsx`, `Button.tsx`, `composants.css`) ; tailles sans plan de coupe | F3 crée `Transverses`, `ErreurRoute`, `NonTrouvee` (F19 n'en réécrit que le contenu) ; liste des fichiers partagés complétée ; **tableau des coupes prévues** (F8, F10, F5b, F14, F18, F19, F21) |
| 13 | important | `AnimatePresence mode="popLayout"` crée un `<style>` à l'exécution : refusé par `style-src 'self'` ; la garde ne le verrait pas sous `?fige` | **confirmé** en lisant `PopChild.mjs` (14.12.0) : `popLayout` interdit (test d'architecture F5b) ; le banc est parcouru **sans** `?fige` pour l'axe et la garde |
| 14 | mineur | la règle des 3 jours n'est pas respectée par `user-event` 14.6.10 (12/11) et `@lhci/cli` 0.16.1 (11/11) | `user-event` 14.6.9 et `@lhci/cli` 0.16.0 ; `motion` 14.12.0 date de 3 jours exactement (limite admise) |
| 15 | mineur | essais faits avec Tailwind 4.3.3 alors que le verrou porte 4.3.4 ; « 20 » tests du relais (il y en a 22) ; version de Playwright incohérente | chiffres corrigés ; `jetons.test.ts` rejoue l'essai avec la version livrée ; Playwright 1.65.0 |
| 16 | mineur | fond de la feuille en `color-mix` alors que `--color-voile` existe | F15 utilise `--color-voile` (présent dans le système fusionné) |
| 17 | mineur | le focus passait à `#contenu` à chaque navigation, y compris un simple changement de `?retour=`, et l'anneau s'y dessinait | F3 : seulement quand le **chemin** change, anneau supprimé sur le conteneur |
| 18 | mineur | `wrangler dev` pourrait rediriger `/x.html` ; `upgrade-insecure-requests` à vérifier ; `playwright.config.ts`, `e2e/` hors de tout tsconfig | **rejoué** : `/banc.html?fige` répond `307` vers `/banc?fige` (la requête est conservée) : le plan utilise `/banc` ; `upgrade-insecure-requests` ne réécrit pas `http://127.0.0.1` ; F8 inclut `playwright.config.ts` et `e2e/` dans `tsconfig.node.json` |

### Seconde revue (Codex CLI, lecture seule, 13/11/2026) : 4 bloquants, 10 importants, 4 mineurs, tous traités

| N° | Gravité | Constat | Traitement |
|---|---|---|---|
| B1 | bloquant | F1 importe `virtual:pwa-register` mais le type `vite-plugin-pwa/client` n'arrive qu'en F2 : `tsc -b` échoue en `TS2307` sur un clone propre | **accepté** : F1 réécrit `tsconfig.app.json` avec `types: ["vite/client", "vite-plugin-pwa/client"]` ; F2 n'y touche plus |
| B2 | bloquant | la garde de F5b n'a aucune route enfant protégée : aucune adresse ne la déclenche, les tests 401/200/503 ne passent pas par elle | **accepté** : route protégée provisoire `_connecte.accueil.tsx` (`/accueil`), `/` y mène ; tests via `/accueil` |
| B3 | bloquant | `cheminSur(location.href)` perd toujours le retour (la fonction refuse les URL absolues) ; F21 passait `location` | **accepté** : `location.pathname + location.search` (sans fragment) en F5b et F21 ; test « `/accueil?mois=11` conserve son retour » |
| B4 | bloquant | les skills `superpowers:*` ne sont pas dans le catalogue des agents | **accepté** : `sp-subagent-driven-development` ou `sp-executing-plans`, `sp-writing-plans`, `sp-test-driven-development`, `sp-verification-before-completion`, `frontend-design:frontend-design` et les `silae-engineering:*`, **noms vérifiés un par un dans la liste de l'outil Skill** ; un nom absent chez un agent est un défaut du plan |
| I1 | important | `@axe-core/playwright` jamais installé ; `@playwright/test` flottant en `^1.64.1` | **accepté** : F2 installe `@axe-core/playwright@4.14.0` et `@playwright/test@1.65.0`, exacts |
| I2 | important | `deploie-essai` ne dépend ni de `contrat` ni de `resultat` : un contrat rouge déploie | **accepté** : `deploie-essai` passe à `needs: [resultat]` (F4) ; `contrat-amont` volontairement hors de `resultat` (la rupture est amont ; le front reste cohérent avec sa copie), raison écrite |
| I3 | important | la garde du build ne voit que `url(http` ; `url("https://…")`, `@import "https://…"`, échappements passent ; pas d'`object-src` | **accepté** : analyse de toute URL construite, échappements CSS décodés, fixtures de contournement ; `object-src 'none'` ajouté à la CSP (F23, test du relais) |
| I4 | important | la consigne « retirer `.jeu *` » n'était pas exécutée | **accepté** : F7 le retire (`.jeu` devient `body`), test d'absence et mutation |
| I5 | important | `Screen` crée un second `<main>` ; `Steps` en `<ol>` alors que `.suivi` cible des `div` ; le champ réel de `CodeCells` devient un septième élément flex | **accepté** : `Screen` = `<div>` ; `.suivi > li` avec remise à zéro de la liste ; conteneur `.cases-champ` ; chacun annoté `/* écart au système */` |
| I6 | important | ni les cibles de 44 px ni le parcours clavier ne sont prouvés ; les vérifications lecteur d'écran sont non bloquantes | **accepté** : `banc.cibles.spec.ts` (`boundingBox` ≥ 44 × 44, ordre de `Tab`, focus visible, aucun piège) sur les trois projets ; liste de preuves manuelles **à remplir** dans la PR de F25 (un « non prouvé » écrit est admis) |
| I7 | important | l'écran de réveil ne rend inerte que `#contenu` : le lien d'évitement reste atteignable ; pas de focus initial ni de retour | **accepté** : `#coque` (lien d'évitement + `main`) entièrement `inert`, écran hors de `#coque`, focus sur l'écran puis rendu à l'élément d'avant |
| I8 | important | `Échap` ferme le `<dialog>` aussitôt : l'animation de sortie ne joue jamais | **accepté** : `cancel` est `preventDefault()`é, sortie puis `close()`, test « encore ouvert pendant la sortie » |
| I9 | important | TBT en `warn`, aucun budget d'image ni de poids total : le scénario « image de 2 Mo » passerait | **accepté** : tout en `error`, + `image:size` et `total:size` |
| I10 | important | la bannière de mise à jour peut perdre une saisie ou une écriture suspendue | **accepté** : `useSaisieEnCours` (mémoire seule) et `useMutationState` ; bouton en `pause` tant que l'un est vrai ; jamais de rechargement forcé |
| M1 | mineur | F23 « parallèle de F24 » alors que F24 en dépend | corrigé |
| M2 | mineur | « D1 » ambigu (TypeScript ou D1 de la spec) | précision en tête du tableau des décisions ; le seuil de veille s'appuie sur la décision du 13/11 (pas d'instance allumée) |
| M3 | mineur | test de `Pot` contradictoire (région présente puis absente) | le premier cas utilise `annonce={true}` |
| M4 | mineur | `git diff --check` échoue sur un espace final | corrigé (vérifié) |

**Refusé : rien.** Deux points nuancés : (I2) `contrat-amont` reste hors de `resultat` ; (I6) un « non prouvé » écrit reste admis pour les lecteurs d'écran, car on ne les automatise pas, mais la liste doit être remplie.

**Nuances.** (a) Le constat 13 est confirmé par lecture du code de Motion, pas par une page jouée ; la garde sous CSP `enforce` sans
`?fige` le rejouera. (b) Le constat 5 reste une hypothèse tant que la transition n'est pas jouée (F22). (c) Entre la rédaction et la revue,
la PR #38 a été **fusionnée** (08d4fb4) avec ses corrections ; le plan est rebasé dessus, ses dépendances et F7 mis à jour. (d) Non
vérifié, dit : collage dans un `maxLength` (comportement de la spécification HTML, non joué), lecteurs d'écran, `gitleaks` sur la
suppression de fichiers.


### Constats de F1 (revues adverses de la PR de F1, 13/11/2026) : ils priment sur le texte de F1

- **Deux visites, pas une.** Rejoué dans Chromium (ancien build de l'étiquette, puis la page d'attente, même origine, même profil) : à la
  1re visite après le déploiement, l'ancien service worker sert encore l'ancienne appli (« Connexion ») et les clés `sb-*` sont encore là ;
  le nouveau s'installe, s'active et prend la main en arrière-plan ; à la 2e visite : « Popote revient bientôt », clés effacées, anciens
  caches nettoyés. Personne n'est bloqué. Un rechargement forcé de l'onglet ouvert est **refusé** (décision 4 : jamais de rechargement
  forcé). Non rejoué : une ancienne page restée ouverte pendant la bascule peut perdre ses morceaux de code (le précache ancien est nettoyé).
- **`supabase.auth.token` n'est pas effacé** : l'ancien front n'a jamais écrit cette clé (bibliothèque en v2 : `sb-<projet>-auth-token` et
  ses variantes ; `git grep` à l'étiquette ne la trouve nulle part), et la garde `dist/` interdit le mot « supabase » (la minification
  replie même un nom assemblé). `nettoieAncienFront` n'efface donc que `sb-*`.
- **La garde exécute le `sw.js`** au lieu de chercher un motif : `scripts/verifie-sw-remplacant.mjs` le joue dans un bac à sable (workbox
  simulé) sans événement et exige `self.skipWaiting()` et `clientsClaim()` appelés au démarrage ; un commentaire, une chaîne ou la forme
  `prompt` ne passent pas.
- **La mutation « `registerType: 'prompt'` » seule ne casse pas la garde** : avec `skipWaiting` et `clientsClaim` explicites dans
  `workbox`, le `sw.js` est identique dans les deux modes. La mutation qui la casse retire ces deux options (rejouée : sortie 1).
- **`wrangler dev` en http : le précache du service worker échoue** avec la CSP de `wrangler.jsonc`. `upgrade-insecure-requests` réécrit en
  `https://127.0.0.1` la redirection `/index.html` vers `/` que suit le service worker pendant l'installation (`ERR_SSL_PROTOCOL_ERROR`) ;
  le service worker devient inutile. Les essais de F8 et F22 qui installent un service worker passent `--var "CSP:…"` **sans**
  `upgrade-insecure-requests` (en https, sur l'essai, il n'y a pas de problème ; à confirmer au premier déploiement de F1).
- Le nombre de tests du relais est **43**, pas 22.

## Amendements du 13/11 après la relecture d'« Entrer » — ils priment sur le texte des tâches

La relecture du parcours « Entrer » a montré trois points que F5a et F18 à F21 ne tenaient pas.

| N° | Tâche | Avant | Après |
|---|---|---|---|
| A1 | F5a (`Retry-After`), et la ligne de « Valeurs proposées » | borné de 1 à **900** s ; absent ou illisible sur une `429` : 10 s | borné de 1 à **86 400** s (24 h) : l'API bloque certains codes jusqu'à 24 h, et l'écran doit afficher le vrai temps, pas un plafond de 15 min. Le repli de 10 s ne change pas. Les cas de test `99999` et « `Retry-After` non borné » visent désormais 86 400 ; un `Retry-After: 86400` passe tel quel. Conséquence pour F20 (à régler dans F20) : la durée affichée et annoncée est formatée en unités lisibles (secondes, minutes, heures), et le compte à rebours ne s'annonce toujours que deux fois |
| A2 | F5a (`erreurs.ts`) et F19 (`ErreurEcran`) | `ErreurApi` : `status`, `code`, `title`, `detail`, … ; l'écran montre `title` et `detail` | `ErreurApi` garde **`type`** (l'URI du problème, RFC 9457) **et `code` si l'API le rend**. L'écran choisit son texte **d'après `type`** (phrase du catalogue `src/textes/`, repli par classe de statut puis phrase générique), **jamais d'après `detail`, qui n'est jamais affiché** (ni `message`, ni la pile). La référence (`instance`) reste affichée. Tests : un problem+json `500` dont le `detail` est un texte piège (mot anglais, détail technique) n'affiche **aucun** mot de ce `detail` et montre la phrase de son `type` ; un `type` inconnu donne la phrase de sa classe de statut ; mutation : afficher `detail` (casse) |
| A3 | F18, F19, F20, F21 | chacun pose ses phrases dans son catalogue ; rien n'interdit à un parcours d'en écrire d'autres | **F18 à F21 sont la seule source des textes des états communs** : réveil, perte de réseau, `429`, `5xx` (et erreur générique), session expirée (`src/textes/reveil.ts`, `etats.ts`, `limite.ts`, `reseau.ts`, `session.ts`). Un parcours qui rencontre l'un de ces états rend le composant correspondant et **ne redéfinit pas** sa phrase ; une erreur propre au parcours (un champ refusé, un code faux) reste dans son propre catalogue |

### Constats de F4 (revues adverses de la PR de F4, 13/11/2026) : ils priment sur le texte de F4

- **13 chemins, pas 12** : la copie épinglée (`popote-api@cda4b61`) compte 13 chemins, 16 opérations, dont 10 protégées (`login-codes` a
  été ajouté après le relevé du plan). Ce nombre bouge : ne pas l'écrire dans le code ni dans un test (les tests ne comptent que des
  routes nommées).
- **`oasdiff breaking` laisse passer une route dépréciée puis retirée** (avec ou sans date de fin ; rejoué : code 0, même avec
  `--deprecation-days-stable 36500`) et une **protection qui change** (`info`, code 0). `scripts/compare-contrats.mjs` les refuse : toute
  opération retirée, toute route dont la protection change (la liste des routes protégées serait périmée). Le job `contrat-amont` joue les deux.
- **Codes de `contrat-amont.sh`** : 1 = rupture, 2 = amont injoignable ou absent (rien n'a été comparé) ; l'annotation d'une demande de
  fusion les distingue. `git ls-remote` a un délai (30 s), pas d'invite, un SHA validé à chaque essai.
- **« Octet à octet » était inexact** : la copie et sa vérification passent par `normalise` (LF, un seul saut de ligne final). La comparaison
  est exacte aux fins de ligne près ; le texte de F4 et `docs/contrat.md` le disent.
- **Durcissements de `sync-contrat.mjs`** : aucune redirection suivie (`redirect: 'error'`, plus de `--location`), contrat limité à 1 Mio,
  version `3.1.x` stricte, refus d'écrire à travers un lien symbolique, nouvelle tentative sur 403 et 429 (limite de débit), message
  distinct pour un jeton refusé (401), `per_page=1` sur la comparaison. Un chemin décrit par `$ref` est refusé, non ignoré.
- **Le test de la CI joue le script de `resultat`** tel qu'il est écrit dans `ci.yml`, et vérifie `continue-on-error: ${{ !inputs.strict }}`,
  les deux étapes de `contrat` et le `if` de `deploie-essai` : les mutations correspondantes cassent un test.
- **Risque accepté** : une panne de `api.github.com` ou de `raw.githubusercontent.com` met `contrat`, donc `resultat`, au rouge sur toute
  demande de fusion (trois essais, puis rouge : jamais vert par défaut). Un nouvel essai de la CI suffit.
- **Le contrôle quotidien peut s'éteindre** : GitHub désactive les workflows planifiés d'un dépôt public après 60 jours sans activité
  (écrit dans `docs/contrat.md`). Les élargissements d'énumération (`WARN` d'oasdiff, vert même en strict) se voient au `tsc -b` après `contrat:sync`.

### Constats de F6 (revues adverses de la PR de F6, 13/11/2026) : ils priment sur le texte de F6

- **La garde du build lit avec de vrais analyseurs** (parse5, postcss, postcss-value-parser, acorn, déclarés en versions exactes), non avec
  des expressions régulières : elles laissaient passer `<script/type=module>`, `https&#58;//…`, `url("/\<retour>/evil")`, `fetch`,
  `importScripts`, `<meta refresh>`, `<form action>`, `<use href>`, et refusaient à tort `content:"https://"` ou un commentaire.
  Elle couvre les chargements dont l'URL est écrite telle quelle ; une URL calculée à l'exécution ne se voit pas : c'est `connect-src 'self'`
  en production. Elle refuse un fichier trop gros ou illisible, un lien symbolique, une police référencée hors de `dist`.
  **`scripts/garde-du-build.sh` réunit** page, `sw.js` remplaçant, garde du build, ancien front et axe-core ; il joue dans `front` **et**
  dans `deploie-essai` (qui reconstruit `dist/` : le dist contrôlé n'était pas celui qu'on déployait).
- **Limites assumées de la garde (arbitrage du 13/11)** : elle attrape les erreurs, pas l'obfuscation, et n'est pas une frontière de sécurité : c'est la
  CSP en `enforce` qui l'est. Ne se voient pas : une URL construite à l'exécution (`new URL(a, base distante)`, `setAttribute("src", …)`, un appel dont l'argument n'est
  pas une chaîne littérale), un nom de règle CSS échappé (`@im\70ort` ; le nom d'une *fonction* échappée, `u\72l(`, est décodé). Les `data:` sont refusés dans un
  `@font-face` quel que soit leur type, et ailleurs sauf une vraie image (png, jpeg, gif, webp, avif, svg+xml, x-icon, bmp : `data:image/woff2` est refusé).
- **`verifie-jetons` lit tout le CSS de `src/`** : une redéfinition d'un jeton du système hors de `@theme` (`:root{--color-encre:#000}` après le bloc, ou dans un autre
  fichier) échoue ; une propriété personnalisée locale qui n'est pas un jeton (`--part`) reste libre ; les erreurs de `jetons-racine.css` remontent.
- **F22 vérifiera le manifeste de précache** : la garde du build y ajoute le contrôle que `precacheAndRoute([...])` de `sw.js` ne contient que des URL de même origine
  (aujourd'hui la garde lit `sw.js` comme un fichier JavaScript, sans en lire la liste de précache).
- **Défauts de Tailwind** : en plus de ceux du plan, `--text-shadow-*`, `--blur-*`, `--perspective-*`, `--leading-*` et `--tracking-*` sont fermés
  (les ombres floues et les flous contredisent « aucun flou »). Restent ouverts, parce qu'ils servent la mise en page : `--spacing`, `--breakpoint-*`,
  `--container-*`, `--aspect-*`, `--font-weight-*`, `--default-*` (donc `transition` garde sa courbe : écrire les durées et courbes des jetons).
  `jetons.test.ts` relit le thème par défaut de Tailwind : une version qui ajouterait une variable casse le test tant qu'elle n'est pas fermée ou admise.
- **`@theme static inline` pour les ombres** : essayé, Tailwind 4.3 réécrit déjà une ombre avec sa valeur ; la classe est la même avec ou sans `inline`
  (aucun test ne peut les distinguer). L'option reste, la doc la demande pour toute variable qui en lit une autre.
- **`verifie-jetons`** analyse les blocs (une valeur peut contenir `;` ou `{}` dans `url()`), refuse une déclaration qui n'est pas un jeton, un jeton
  déclaré deux fois ou hors de `@theme`, exige les quatorze remises à zéro, et compare aussi les quatre woff2, les deux licences OFL et les `@font-face`
  au système.
- **À faire par F7** : `composants.css` du système contient les quatre `@font-face` ; ils sont déjà dans `polices.css` : ne pas les porter une seconde fois
  (`verifie-jetons` compare `polices.css` au système). Poser dans la couche `base` `font-family: var(--font-texte)` (sur `html`) et la police de titre :
  tant que rien n'utilise Fredoka ni Nunito, les deux `preload` ne servent à rien (aucun avertissement vu en 4,5 s en Chromium, mais Chromium en émet un
  si la police reste inutilisée).
- **À faire par F22** : le précache de `sw.js` exclut les woff2 (le motif par défaut de Workbox) : ajouter `woff2` aux `globPatterns` et tester les quatre fichiers.
- `@tailwindcss/node` 4.3.4 est déclaré (le test de F6 l'importe).

### Constats de F7 (revues adverses de la PR de F7, 13/11/2026) : ils priment sur le texte de F7

- **Écarts au système, tous gardés par un test** (`css.test.ts` aplatit le système et le portage, compare règle à règle dans l'ordre, et fait échouer un écart non
  nommé ou périmé) : `@font-face` retirés (dans `polices.css`) ; `.jeu` devient la règle `html` de `base.css` (police, graisse, taille, interligne, fond, encre) ;
  `.jeu *` retiré (doublon du preflight) ; l'anneau de focus (encre de 4 px cerné de jaune) ajouté à `.cases:focus-within`, `.avatar:focus-visible` et
  `.avatar--libre:focus-visible` ; **`@keyframes pulse` renommé `pulse-ondes`** (voir plus bas) ; `transition: none` du mouvement réduit en `!important`
  (un utilitaire `transition-all`, d'une couche supérieure, la rendait). **À renvoyer à la session de design en F25** : ces écarts, à reprendre dans `.design/systeme/`.
- **Collision de nom avec Tailwind** : Tailwind a ses propres `@keyframes pulse`, `spin`, `ping` et `bounce` ; au build, `pulse` écrasait celui de la marmite (l'état
  « écoute » battait de `1` à `.5` au lieu de `.45` à `1`). Le test compile `index.css` et exige des `@keyframes` uniques, ceux de `composants.css`, sans l'un de ces quatre noms.
- **Les anneaux de focus des cases et de l'avatar sont dans la couche des composants, non dans celle de base** (le plan disait `base.css`) : la couche de base ne battrait
  pas le `box-shadow` de `.avatar`, qui est dans les composants.
- **`[hidden]` n'est plus redéclaré** : le preflight de Tailwind pose déjà `[hidden]:where(:not([hidden="until-found"])) { display: none !important }`, qui gagne contre le
  `display` des composants (rejoué en Chromium) et respecte `hidden="until-found"` ; un test lit le CSS compilé.
- **Le lien d'évitement a `z-index: 100`** : sans lui, tout élément positionné qui le suit le recouvre (un `.soleil` de 700 px couvre le coin haut-gauche : le lien, bien focalisé,
  serait invisible au clavier, WCAG 2.4.7 et 2.4.11). **F8 y ajoute une preuve en Chromium** : `elementFromPoint` sur le lien focalisé rend le lien, sur une page qui monte un `.soleil`.
- **Contraste** : les paires sont **lues dans `composants.css`**, règle par règle (`color` et `background` d'une même règle ; texte hérité = encre ; règle sans fond = sur crème
  et papier ; une surcouche telle que `voile` n'a pas de rapport). Une règle qui sépare texte et fond en deux règles n'est pas vue : le banc la mesure dans Chromium avec axe (F8).
  Le seuil de linéarisation sRGB est `0,04045` (WCAG 2.2) ; sans effet sur des couleurs hexadécimales de 8 bits.
- **Les textes d'une règle de mouvement réduit** (14 sélecteurs) sont comparés au système par l'équivalence, non par une liste courte.

### Constats de F8a (la première moitié de F8, 13/11/2026) : ils priment sur le texte de F8

F8 est coupée comme le plan le prévoit. **F8a** (cette PR) : le banc, sa garde, axe, les cibles et le clavier, le job `banc`, et les preuves confiées par les constats de F6 et F7.
**F8b** (à faire) : `comparaison.spec.ts`, l'appariement par légende, l'index et l'artefact. Pour F8b, `Section` accepte une section **sans pendant** dans `reference.html`
(`titre` au lieu de `reference` : « Lien d'évitement », « Anneaux de focus », « Paires texte et fond ») : la comparaison les signale sans échouer. Les cas de Couleurs et de
Typographie portent une `cle`, sans `reference`.

- **Preuves de F6 et F7, jouées en Chromium en local (les trois projets les jouent en CI)** : le lien d'évitement focalisé au clavier est au-dessus d'un `.soleil` de 700 px (`elementFromPoint` au centre et au milieu de chaque
  bord : les coins sont arrondis, un point à 4 px du coin tombe hors du contour et rend le soleil) ; l'anneau de chaque composant (bouton, champ, lien, cases du code, avatar, place
  libre) est mesuré tel que Chromium le dessine (contour d'encre de 4 px, halo jaune de 11 px) ; axe mesure les paires texte/fond des classes du système sur une section « Paires texte et fond »
  (classes de `composants.css` en HTML brut : les sections des composants, F9 à F13, montrent les vrais ; celle-ci reste la sonde des classes). Mutations jouées, chacune casse son test :
  `z-index` du lien retiré, anneau des cases retiré, halo de l'avatar retiré, `--color-gris` éclairci, bouton de 30 px, `tabIndex` positif, `CSP_MODE` en `report-only`, violations non relevées.
- **`securitypolicyviolation` part aussi en `report-only`** : la garde y verrait la violation. Ce qui prouve `enforce`, c'est l'**effet** : le style injecté n'est pas appliqué, l'appel vers un hôte tiers n'atteint jamais
  son leurre (`page.route` compte 0 appel ; un nom en `.invalid` échouerait sans CSP et ne prouverait rien), la violation porte `(enforce)`, et la réponse n'a pas `Content-Security-Policy-Report-Only`.
- **Un `box-shadow` d'un bouton est en transition (90 ms)** : mesuré aussitôt après `Tab`, il rendait un halo de 7 px à moitié écrit. Les mesures attendent `document.getAnimations()` (les transitions finies y sont) ; F9 et la suite
  qui mesurent un style le font aussi (`attendLeRepos`).
- **Axe laisse « incomplet » (ni réussi ni violé) un texte de la couleur de son fond (1:1), un fond en dégradé ou un élément recouvert** : le test de garde de la garde emploie une paire pâle sur menthe ; un test qui ne lit que
  les `violations` resterait vert si un contraste cessait d'être mesuré. `banc.axe.spec.ts` compte donc les contrastes réussis (au moins 90 ; 102 aujourd'hui) et **borne les incomplets à 4**, tous dans la scène du soleil
  (le titre de la section, le texte posé sur le dégradé du soleil, sa légende, le titre de la section suivante : axe lit la boîte de 700 px sans le rognage de la scène). Relever cette borne demande une raison écrite.
  Le lien d'évitement, hors cadre au repos, n'est mesuré qu'une fois focalisé : un test à part le fait.
- **Une paire reste non mesurée** : le `+` de l'avatar de la place libre (gris sur papier) n'est ni réussi ni incomplet pour axe. À mesurer à part quand F13 livre l'avatar. Axe note aussi `label-content-name-mismatch`
  (incomplet) sur les avatars de la sonde (`aria-label="Léa"` pour la lettre « L », « Inviter quelqu'un » pour « + ») : F13 choisit un nom qui contient le texte visible (WCAG 2.5.3).
- **Identifiants du banc** : `aria-labelledby` est une liste d'identifiants séparés par des espaces ; un identifiant tiré d'un titre à plusieurs mots ne nomme aucune section (axe le classe « incomplet »). Ils sont numérotés.
- **`tabJusqua` borne ses appuis par le nombre de contrôles** (un tour de la page), non par 60 : les lots F9 à F17 ajoutent des dizaines de contrôles avant les sections de la sonde. Les mesures d'anneaux attendent la fin des transitions.
- **`tsc -b` compile maintenant `playwright.config.ts` et `e2e/` (avec `DOM` dans `lib`)**, et `build:banc` lance `tsc -b` : une faute de type dans un e2e fait échouer le démarrage du serveur des tests (« Process from config.webServer was not
  able to start »), non le test.
- **`banc.html` sert à `/banc`** (`/banc.html?fige` répond `307` vers `/banc?fige`) ; le build du banc passe `verifie-build.mjs --banc` dans la CI.
- **Les cases du code** : le champ réel est un `<input class="sr-seul">` dans `.cases` (la sonde de F8a). Le seul contrôle sous 44 px admis est ce champ caché (exception écrite dans `banc.cibles.spec.ts`) ;
  F11 en fait un conteneur touchable (`.cases-champ`) et retire l'exception.
- **WebKit n'a pas tourné en local** (bibliothèques système absentes, `sudo` demandé) : le projet `iphone` ne se joue qu'en CI. **Premier passage (rouge, constaté) : WebKit applique `upgrade-insecure-requests` aux sous-ressources en
  `http://127.0.0.1`** (« TLS handshake » sur chaque fichier ; Chromium épargne l'adresse locale) : le banc est donc servi avec la CSP de `wrangler.jsonc` **sans** cette directive (`--var CSP:`, lue dans le fichier par
  `playwright.config.ts`, comme le prévoyaient les constats de F1 pour F22) ; sur l'essai, en https, elle n'a pas d'effet. Le nom de la directive du style injecté (`style-src` ou `style-src-elem`) est accepté sous les deux formes.

### Constats de F8b (la comparaison avec `reference.html`, 13/11/2026) : ils priment sur le texte de F8

- **Ce que F8b livre** : `e2e/comparaison.spec.ts` (un test par projet), `e2e/comparaison/appariement.ts` (l'appariement, fonction pure), `rendu-index.ts` (l'index), `ecrit-index.ts` (la commande qui réunit les `donnees.json` des projets en
  `captures/comparaison/index.html`, que la CI dépose en artefact `comparaison`). **Écarts au plan** : le code est en TypeScript (le plan disait `index.mjs` et `scripts/capture-index.test.mjs`) : un module `.mjs` importé d'un test
  TypeScript n'a pas de types, et Node 22.18 et plus lit le TypeScript sans option ; ses tests sont `e2e/comparaison/*.test.ts` (le projet `scripts` de Vitest les inclut). L'index est écrit après les tests par une commande, non par
  chaque projet : trois projets en parallèle ne peuvent pas se partager un fichier.
- **Règles d'appariement** : le début d'une légende se compare sans casse ni espaces multiples, mais mot pour mot ; **l'égalité exacte l'emporte sur le début** (« tomate » désigne « tomate », non « tomate foncée » : sans cela cinq
  couleurs étaient ambiguës) ; un début qui désigne zéro ou plusieurs légendes, deux cas de même légende, deux cas qui désignent la même légende, une légende de la référence absente du banc **dans une section déjà portée** : le test échoue.
  Une section de la référence que le banc n'a pas encore n'échoue pas (l'index la nomme) : **on porte une section en entier** (F9 porte tout « Bouton », F12 tout « Bloc, pastille, tampon, avatar »…). Un cas ou une section sans `reference`
  est signalé « sans pendant », jamais une erreur.
- **`cle` disparaît de `Cas`** : une pastille de couleur a pour légende son texte, un bloc seul sans `<small>` (Typographie) celle du `h2` de sa section ; les deux passent par `reference`. La référence est lue **dans le navigateur, après exécution de la
  page** (les légendes de la marmite sont générées par son script) : `.cas` et sa `<small>`, sinon `.nuance`, sinon le `.bloc` seul.
- **`colonne` sur `Section`** : la référence donne à chaque grille sa largeur minimale de colonne (150 px les couleurs, 160 les marmites, 320 les scènes, 230 par défaut ; la typographie n'a pas de grille). Sans elle, le banc rendait les couleurs à 248 px
  au lieu de 160 : 17 lignes sur 32 portaient un écart rouge. Chaque lot de composants la déclare pour sa section (`colonne: 160`, `320`, ou `'pleine'`).
- **Premier constat de la comparaison, à corriger hors de F8b : le texte du banc est 3,1 % plus grand que celui de la référence.** Cause (mesurée : 60 px contre 61,875 px pour `--text-titre-xl`) : la référence pose `font-size: var(--text-texte)`
  (16,5 px) sur `.jeu`, donc sur `body`, et les tailles des jetons sont en `rem` ; F7 a fait de `.jeu` la règle `html` de `base.css`, ce qui fait de 16,5 px le `rem` de toute l'appli, donc **toutes les tailles en `rem` (titres, texte, notes) grandissent de 3,1 %**
  (et `--spacing` de Tailwind). Le test de F7 (`css.test.ts`, `html { font-size: var(--text-texte) }`) l'exige en l'état. Correction : `font-size` sur `body`, `html` garde le reste ; le test change avec. Visible dans l'index sur « Fredoka et Nunito »
  (écart de 5 à 6 px de hauteur, repère rouge). Les autres écarts de dimension se lisent dans l'index de la CI.
- **Ce que les revues ont durci** : la légende d'un `.cas` est sa `<small>` **enfant direct** (`:scope > small`) : le premier `.cas` de « Bloc, pastille, tampon, avatar » a une `<small>` dans son bloc, avant sa vraie légende ; l'apostrophe typographique
  (`’`) vaut l'apostrophe droite (la référence écrit « d'écran », le banc peut écrire « d’écran ») ; une section de la référence sans aucune légende (sa page a mal tourné) et deux sections de même titre sont des erreurs ; l'appariement faux
  s'annonce avant toute capture (deux cas de même légende rendaient un sélecteur ambigu : erreur Playwright au lieu du diagnostic) ; une capture vide ou introuvable est nommée en 5 s, non en 30 s sans nom ; les polices de la page de référence
  doivent toutes se charger (sinon de faux écarts, sans signal) ; le délai du test est de 180 s (deux captures par cas, WebKit lent) ; l'index écrit « ÉCART » (la couleur seule ne suffit pas) et la légende de la référence appariée (deux `reference`
  croisées passent l'appariement, l'œil les voit). **Non prouvé** : le `:scope > small` n'a pas de cas qui le distingue avant que F12 porte la section « Bloc… ».
- **WebKit (constaté en CI au premier passage)** : `animations: 'disabled'` s'y réalise en injectant une feuille de style, que la CSP en `enforce` du banc refuse (une violation `style-src-elem` par capture) : la garde, qui ne distingue pas l'outil de
  la page, faisait échouer le test. `comparaison.spec.ts` passe donc `bypassCSP: true` ; la CSP reste gardée par les autres specs sur le même banc. La page `file://` de la référence et ses polices se chargent bien dans WebKit (le contrôle des polices passe).
  Tout test futur qui capture avec `animations: 'disabled'` sur le banc doit en faire autant.
- **Captures** : `animations: 'disabled'` (les animations CSS finies vont à leur état final, les infinies reviennent à leur début, des deux côtés) et `?fige` (Motion à son état final) ; l'état de repos de F14 et suivants se compare donc, non leur mouvement. La page de
  référence s'ouvre dans une seconde page du même contexte, **non surveillée** par la garde : ses erreurs ne font pas échouer le test (elle a ses scripts et styles en ligne, hors de notre CSP).

### Constats de F9 (bouton, lien d'action, champ, 14/11/2026) : ils priment sur le texte de F9

- **Écarts au plan** : pas de `src/textes/composants.ts` (aucun des trois composants n'a un texte en dur : le libellé, l'aide, l'erreur viennent de l'appelant ; un catalogue vide serait du bruit) ; `Button` accepte `type="submit"` (le bouton d'envoi de « Entrer » en a besoin ; `reset` n'est pas offert, le type est fermé) et `ref` ; la PR dépasse 400 lignes (550 ajoutées, dont 355 de tests) : étiquette `size-justified`.
- **`reportees` (nouveau, hors plan)** : le plan dit « on porte une section en entier », mais F9 ne peut porter ni « À maintenir » (F10) ni les cases du code (F11), qui sont dans les mêmes sections de `reference.html`. `Section.reportees` déclare les débuts de légende qu'un lot suivant portera ; une déclaration inconnue, ambiguë ou **déjà montrée par le banc** fait échouer la comparaison. **F10 retire `reportees: ['À maintenir']` de `bouton.tsx` en y ajoutant son cas ; F11 retire `['En cours de saisie', 'Juste', 'Faux']` de `champ.tsx`** (et F25 compte qu'il n'en reste aucune). Limites connues : une section sans `reference` ignore `reportees` sans erreur ; la liaison `Banc.tsx` (`data-reportees`) à `comparaison.spec.ts` n'est prouvée que par Playwright.
- **Occupé et en pause** : `aria-busy` + `aria-disabled` + garde du clic (`preventDefault` : retient aussi l'envoi d'un formulaire). Le bouton reste focalisable. **Rien dans le composant n'annonce l'attente** (`aria-busy` sur un bouton est quasi ignoré des lecteurs d'écran, et le nom ne change pas, par le plan) : **F18, F20 et F21 posent leur propre région `role="status"`** ; pour `pause`, le libellé dit l'attente (« Renvoyer dans 30 s »). La garde ne couvre que `onClick` : un `onKeyDown` ou `onPointerDown` de l'appelant tourne encore, et `pointer-events: none` du système (occupé seulement) envoie le clic à l'élément dessous. **Non prouvé** : le rendu au lecteur d'écran (VoiceOver, TalkBack), à regrouper dans les gestes de Kamil.
- **Écarts CSS nommés dans `css.test.ts`** : `.champ > span` devient `.champ > label` (le libellé est un `<label for>` frère du champ ; F11 et les lots suivants qui posent un champ utilisent `Field` ou ce balisage, jamais l'ancien `<label class="champ"><span>`) ; la règle `pause` (`.bouton[aria-disabled="true"]:not([aria-busy="true"])`, aspect du désactivé) et **son anneau** : sa spécificité (0,3,0) bat `.bouton:focus-visible` (0,2,0) et lui aurait retiré le halo jaune (relevé par la revue, mesuré en Chromium dans `banc.base.spec.ts`). **Tout état stylé par un sélecteur d'attribut doit redonner son anneau.** À renvoyer à la session de design en F25.
- **`Field`** : l'erreur est un **nouveau nœud** `<small role="alert">` (clé React) : un `role="alert"` ajouté à l'aide déjà affichée n'est pas fiablement annoncé ; l'erreur prend la place de l'aide comme description ; `erreur=""` vaut « pas d'erreur » ; `autoComplete` est obligatoire par le type, mais le type de React accepte `""` (`string & {}`) : un `autoComplete=""` passe, à surveiller en revue. Le banc ajoute l'aide DANS le champ alors que la référence la pose en légende : les deux cas « Au repos, avec une aide » et « En erreur » ont 27 px de plus que la référence dans l'index de comparaison (écart voulu, pas un défaut).
- **Bornes d'axe** : un `.soleil` de 700 px déborde de sa scène, et axe juge « recouvert » le texte voisin (confirmé : retirer le soleil ramène 4 incomplets à 0). La sonde du lien d'évitement a donc une marge (`.scene--sonde`, 300 px), la borne des incomplets passe de 4 à **1 au PC, 2 au téléphone et sous WebKit** (par projet), les contrastes réussis de 90 à 125 (133 mesurés au PC). **Toute scène à soleil des lots suivants (F14 : « Décor… ») prend la même marge.** La légende « Tampon » de la sonde des paires reste incomplète au téléphone (déjà vraie sur `main`, cause non établie). **WebKit n'a pas tourné en local** : les bornes de `iphone` sont à confirmer en CI.
- **Mouvement réduit** : le système remplace le rond du bouton occupé par `content: "…"` : Chrome compte le contenu généré dans le nom accessible, qui devient « Un instant… » (contredit « le nom ne change pas »). **Non vérifié** ; à renvoyer à la session de design (F25).

### Constats de F5a (le client et la couche API unique, 14/11/2026) : ils priment sur le texte de F5a

- **Ce que F5a livre** : `src/api/` : `client.ts` (`creeClient({ baseUrl?, fetch?, delaiMs?, emetteur? })` et le singleton `client`), `evenements.ts` (`creeEmetteur`, le singleton `evenements`, les types), `erreurs.ts`, `appel.ts` (`lit`, `litVide`), `idempotence.ts` (`nouvelleCle`) ; `src/textes/erreurs.ts`. `openapi-fetch` **0.17.0** (MIT, publié le 11/02/2026) en dépendance exacte.
- **Les événements** (`Evenements` dans `evenements.ts`, abonnement par `evenements.sur(nom, ecouteur)` qui rend la fonction de désabonnement) : `requete:debut` `{ id, methode, chemin }` ; `requete:fin` `{ id, methode, chemin, issue: 'reponse' | 'coupure' | 'delai' | 'annulee', statut? }` (même `id` que le début : **F18 compte les requêtes en cours par `id`**, et une annulation termine la requête sans être une panne) ; `limite` `{ methode, chemin, retryApresS }` ; `non-authentifie` `{ methode, chemin }` ; `reseau:erreur` `{ methode, chemin, nature: 'coupure' | 'delai' }`. `chemin` est celui du **contrat** (`/api/v1/me/invitations/{id}`, jamais l'URL appelée : ni identifiant ni requête, donc rien de personnel dans un événement). **`non-authentifie` part sur toute `401`, y compris `POST /api/v1/sessions` (mauvais code) : F21 ne s'y fie qu'après avoir comparé `` `${methode} ${chemin}` `` à `routesProtegees`.** Une erreur d'abonné est relancée **hors de l'appel** (`queueMicrotask`) : elle ne fait pas échouer la requête et n'est pas muette (`window.onerror`, puis le suivi d'erreurs).
- **Ce que `lit` lève** : `ErreurApi` (réponse non réussie ; `TropDeDemandes` pour une `429`, toujours avec `retryApresS`), `ErreurReseau` (`nature` `coupure` ou `delai`, `cause` gardée), ou **l'annulation telle quelle** (`AbortError` : un `AbortSignal` annulé n'est ni une panne du réseau ni un événement `reseau:erreur`). Deux cas à savoir : **`ErreurApi.status === 0`** = réponse réussie dont le corps n'est pas du JSON (page d'un proxy ou d'un portail), cause `SyntaxError` **réécrite sans le message de `JSON.parse`** (qui cite le début du corps : revue 2) ; une réponse réussie **sans corps** sur une route qui en promet un lève une `ErreurApi` au statut reçu. `litVide` est pour les routes sans corps (`204`).
- **`response.ok` décide de l'échec, jamais `error`** : `openapi-fetch` rend `error: undefined` pour une réponse sans corps (`204`, `Content-Length: 0`) même en `429` ou `503` (lu dans `dist/index.mjs`, 0.17.0) ; sans ce choix, une `429` vide ne serait plus une `TropDeDemandes` (mutation jouée, un test la tue).
- **`ErreurApi` ne garde que les champs du contrat, par champ** (`code` de forme `[a-z0-9_]`, `instance` de forme `[\w:.-]{1,100}`, titres et détails bornés, 100 erreurs de champ au plus, `errors` au format `ErreurDeChamp` complet). **`detail` est gardé mais n'est jamais affiché** (A2) ; `message` vaut `HTTP <statut>`, suivi du code s'il y en a un. Le **pointeur de la racine** (`""`, RFC 6901) est gardé tel quel. **`title` est celui du serveur** (borné) : F19 choisit la phrase d'après `type` et cherche dans son catalogue avec `Object.hasOwn` ou une `Map` (`type` n'a aucune forme imposée). Les **membres d'extension** d'un problem+json **ne sont pas repris** : le brouillon à jour de `409 plan_perime` (Budget), `extensions.settings` (Foyer), le plat à jour de `409 parts_changees`, `min`, `max`, `step` d'un `422 objectif_hors_bornes` (Cuisiner), que les plans d'API annoncent. Le jour où un écran en a besoin, on ajoute un champ typé à `ErreurApi` (ajout compatible, rien ne change pour les appelants).
- **Les en-têtes de réponse ne sortent pas de `lit`** (il rend `data`). Les routes d'écriture à venir (`If-Match`, `ETag` fort, `409`) auront besoin de l'`ETag` d'une lecture : on ajoutera une sœur de `lit` qui rend aussi la réponse, **sans toucher à `lit`**. `cache: 'no-store'` (le plan l'écrit ainsi, et le Budget veut « aucune réponse mise en cache ») fait que le navigateur n'ajoute jamais d'en-tête conditionnel : un `304` n'arrive que si l'appelant écrit `If-None-Match` lui-même ; `lit` le lèverait alors comme `ErreurApi`. **Question ouverte pour le premier écran qui relit à intervalle (Aujourd'hui, session de cuisine : `ETag` fort, `304`, relecture toutes les 3 ou 60 s)** : soit une sœur de `lit` qui sait un `304`, soit `cache: 'no-cache'` (revalidation par le navigateur, le JavaScript voit un `200`) ; non tranché ni essayé.
- **Délai : 35 s** par requête, un peu au-dessus des 30 s du relais et des 25 s de l'API, pour recevoir leur réponse plutôt que couper avant eux. Une route plus lente (l'appel au modèle des plans de Cuisiner : 75 s côté API, 90 côté relais) demandera un second client avec son `delaiMs` ; le relais coupe aujourd'hui à 30 s (`relais/src/index.ts`), le commentaire de `client.ts` est à reprendre avec lui. Le délai passe par l'option `fetch` d'`openapi-fetch` (`avecDelai`), non par le middleware (qui ne peut pas changer le signal) : **les signaux sont chaînés à la main**, sans `AbortSignal.any` (absent avant Chrome 116 et Safari 17.4, où il aurait fait lever le premier appel, pris par `onError` pour une coupure : « pas de réseau » en permanence, revue 1 et 2) ni `AbortSignal.timeout` (dont le rejet n'est pas certain d'être un `TimeoutError` partout) ; un indicateur `delaiDepasse` décide. **`avecDelai` lit aussi le corps** avant de rendre la réponse (`arrayBuffer()`, puis une `Response` neuve) : une coupure ou un délai pendant cette lecture est une erreur du `fetch`, donc typée (`ErreurReseau`, `requete:fin` en `coupure` ou `delai`, `reseau:erreur`), non un `TypeError` brut levé plus tard par `response.json()` (revue 1). Conséquence : la réponse est entièrement mise en mémoire (aucun flux ; l'API ne sert que du JSON) ; `response.url`, `redirected` et `type` ne passent pas (rien ne les lit). `onError` classe en `coupure` toute erreur non annulée, y compris un bug de programmation levé avant l'envoi (un `TypeError` de `new Request`) : il passerait pour une panne réseau. Un `fetch` injecté qui ignore son signal n'est jamais coupé (le vrai le respecte). **happy-dom n'applique pas les contraintes de `Response`** (`new Response(null, { status: 101 })` y passe, undici lève `RangeError`) : ce que ces cas feraient en navigateur n'est pas prouvé par les tests. **`crypto.randomUUID` demande un contexte sécurisé** (https ou `localhost`) : un essai sur téléphone en `http://192.168…` lèverait à la première écriture ; l'essai et la prod sont en https.
- **Écarts au plan** : (1) `retryApresDeLimite(response)` et `lisRetryApres(valeur, maintenant?)` sont exportés d'`erreurs.ts` (le client et `depuisReponse` en ont besoin) ; (2) `Retry-After` : seul `^\d+$` ou une date HTTP (commençant par un nom de jour) est lu ; **`-5`, `abc`, `1.5`, `1e3`, `May 5` et toute date qui n'est pas une IMF-fixdate sont illisibles** (donc 10 s sur une `429`, `undefined` ailleurs), `0` vaut 1 s ; (3) une `ErreurReseau` n'est **pas** une `ErreurApi` ; (4) les titres de `textes/erreurs.ts` ne sont que le repli de `ErreurApi.title` : **les phrases des écrans restent à F18 à F21** (A3) ; (5) `msw` 3.0.4 nomme l'option `onUnhandledFrame: 'error'`, non `onUnhandledRequest` (le plan reprenait l'ancien nom : le compilateur l'a refusé).
- **Preuves** : 74 tests sous happy-dom ; **rejoué dans Chromium réel** (un petit serveur Node, le client construit par Vite) : en-tête `X-Popote-Client: web`, cookie de session envoyé, `Cache-Control: no-cache` côté requête (ce que Chromium écrit pour `no-store`), `Idempotency-Key` entre guillemets, corps JSON d'un `POST` intact après `new Request(requete, { signal })`, `Retry-After: 30` lu, délai (`TimeoutError`), annulation (`AbortError`), coupure (`TypeError`) et **coupure au milieu du corps** (en-têtes reçus, connexion détruite) typés ; rejoué après la réécriture de `avecDelai` (revues). **happy-dom** ne rend ni `cache` ni `credentials` sur une `Request` (le test lit ce qu'on lui donne à construire) et **écrit sur stderr** chaque réponse non réussie et chaque coupure simulée (« GET … 422 », « socket hang up ») : bruit de happy-dom, sans lien avec le code. Mutations jouées : 43, toutes tuées après les revues (la seconde en avait fait survivre 11 : requête refaite sans corps, `Retry-After` ignoré par l'événement `limite`, relance muette, pas de `requete:fin` pour un `5xx`, délai par défaut, entre autres ; chacune a son test).
- **Pour F5b** : `nouvelleCle()` rend la chaîne **entre guillemets** ; `reessaieEcriture` garde **la même** dans les variables de la mutation. `lit(client.GET('/api/v1/me', { signal }))` est la forme des `queryFn`. Le test d'architecture de F5b exclura `src/api/` : `client.ts` est le seul fichier qui importe `openapi-fetch` et appelle `fetch`.

### Constats de F12 (bloc, pastille, avatar, bulle, 14/11/2026) : ils priment sur le texte de F12

- **Écarts au plan** : `src/textes/composants.ts` existe maintenant (F9 n'en avait pas besoin) : « Place libre » et le signe « + » de la place libre. `Avatar` : la place libre a pour nom « Place libre » **par défaut** (`name` facultatif), une personne a un `name` obligatoire (union de types : une place libre n'a ni lettre ni teinte). `src/ui/nonInteractif.ts` (nouveau) : ce qui rend un élément touchable ou focalisable, retiré **au type et à l'exécution** par un **motif** (`onClick*`, `onKey*`, `onPointer*`, `onMouse*`, `onTouch*`, `onDrag*`, `onDrop*`, `onFocus*`, variantes `Capture` comprises) et une liste d'attributs (`role`, `tabIndex`, `contentEditable`, `draggable`, `accessKey`, `popover`, `aria-pressed|expanded|haspopup|checked|selected`) ; la première version, une liste fermée de 15 noms, laissait passer `onClickCapture` et `contentEditable` (relevé par les deux revues). La PR dépasse 400 lignes (≈ 550 lignes, dont ≈ 330 de tests) : `size-justified`.
- **JSX ne vérifie pas les attributs à trait d'union** (`aria-label`, `aria-labelledby`, `data-*`) : `Omit` ne les refuse pas au type. `Avatar` pose son nom **après** le spread et force `aria-labelledby` à `undefined` (sinon `aria-labelledby` l'emporterait sur le nom). Tout composant qui possède un attribut ARIA doit faire de même, et le tester à l'exécution.
- **`reportees` à retirer par F13 et F14** (dans `src/banc/sections/bloc-pastille-tampon-avatar.tsx`) : F13 retire `'Jauges'`, `'Suivi'`, `'Lignes d’effet'` en ajoutant ses cas ; F14 retire `'Bloc avec pastilles et tampon'` **et supprime le cas sans pendant « Bloc avec pastilles, sans le tampon »** (il ferait doublon avec le vrai). Un cas ajouté **sans** `reference` laisse la déclaration valide et finit « sans pendant » sans qu'aucun test échoue : mettre `reference`. `comparaison.spec.ts` exige maintenant que « Bloc, pastille, tampon, avatar » ait des paires (18 au moins).
- **Axe ne mesure pas le « + » de la place libre** (un signe n'est pas du texte pour lui) : `e2e/banc.informe.spec.ts` le mesure tel que Chromium le dessine (4,5:1, gris sur papier : 6,5:1 mesuré). Le même fichier prouve que pastille, avatar et bulle n'entrent ni dans `CONTROLES` ni dans l'ordre du clavier (sections de F12 seulement : « Anneaux de focus » montre des avatars qui SONT des boutons).
- **Bornes d'axe** : `REUSSITES_MIN` 125 devient **145** (154 mesurés au PC, 153 au téléphone ; les mêmes 8 de marge) et `REUSSITES_PAR_SECTION` ajoute un plancher par section (bloc 14, bulle 7) : le plancher global ne voyait pas la perte de la bulle seule. Les incomplets ne changent pas. **WebKit n'a pas tourné en local** : à confirmer en CI.
- **Avatar touchable, plus tard** : il sera un `<button>` qui contient l'avatar, et son nom devra **contenir le texte visible** (WCAG 2.5.3 ; le constat de F8a l'attribuait à F13 par erreur : l'avatar est de F12). Aujourd'hui `role="img"` n'est pas un widget, la règle ne s'applique pas. Un `name=""` donne `aria-label=""` sans erreur de type (une place libre y reprend « Place libre »).
- **`Bubble announce`** : la région `status` n'est annoncée que quand son **texte change** (même nœud) ; montée avec son texte, elle ne l'est pas de façon fiable. Le banc le montre par un bouton qui change la phrase (`src/banc/BulleQuiParle.tsx`) ; un écran qui écrit `{texte && <Bubble announce>…}` fait l'erreur. **Non prouvé** : le rendu au lecteur d'écran (VoiceOver, TalkBack), à regrouper dans les gestes de Kamil.
- **Limites connues** : `Block as` n'est contraint qu'au type (`as="button"` rend un `button` à l'exécution) ; un `free` non littéral (`free={estLibre}`) ne compile pas (écrire les deux branches) ; aucun des quatre composants n'accepte `ref` ; la queue de la bulle (`::before`, −13 px) déborde d'environ 1 px de sa colonne dans le banc malgré `.avec-queue` ; le cas « Bloc avec pastilles, sans le tampon » n'a pas de capture de comparaison (172 px contre 177 px à la référence, tampon exclu, mesuré à la main). Les deux paires comparées (pastilles, avatars) ont **exactement** les dimensions de la référence au PC et au téléphone.

### Constats de F14a (fournisseur Motion, `mouvement.ts`, `Screen`, `Enter`, 14/11/2026) : ils priment sur le texte de F14

- **Écarts au plan** : `variantesTampon` et `Stamp`, `Sun`, `Ground` sont à F14b (la coupe prévue : `variantesTampon` n'a pas de consommateur avant `Stamp`). `variantesEntree` rend `{ initial, animate, transition }` (le plan disait `.delay` à plat : c'est `transition.delay`, `0.14` au rang 2). Au-delà de `RANG_MAX` (9, soit 630 ms de retard), les éléments arrivent ensemble ; un rang négatif ou non entier lève `RangeError` (un écran qui calcule `rang={i / 2}` tomberait sur `ErreurRoute` : arrondir côté appelant). `MotionProvider` ne pose pas `reducedMotion="user"` mais `'always'` ou `'never'`, d'après la préférence qu'il lit lui-même (`useSyncExternalStore`) ou son prop `reduit` : Motion lit la préférence une fois pour tout le processus, un test ne pourrait jamais en changer. `useMouvementReduit` (et donc `Enter`) **lève hors d'un `MotionProvider`** : `src/routes/routes.test.tsx` n'en enveloppe pas ses routes ; le premier écran de route qui utilisera `Enter` doit l'y envelopper (F18 et suivants). `motion` passe de 13.5.1 à **14.12.0**, **épinglé** (le plan l'exige) ; l'entrée de l'appli passe de 105,9 à 134,6 ko gzip (+28,7 : F24 mesure ensuite). `Screen` ne pose que `bg-creme` : le fond, la zone sûre et la hauteur sont déjà ceux du `body` (`base.css`) ; il n'a ni `ref` ni animation propre (l'écran « monte » par le rang 0 de ses éléments). La PR dépasse 400 lignes (≈ 530, dont ≈ 290 de tests) : `size-justified`.
- **`m` s'importe en `import * as m from 'motion/react-m'`** (et non `{ m }` : l'export est un espace de noms de balises, `m.div`, `m.span`, `m.li`…). **`strict` ne lève qu'en développement et en test** (le contrôle est sous `process.env.NODE_ENV !== "production"` dans `framer-motion`) : en production un `motion.div` égaré passerait sans bruit (+38 ko). La garde est une règle de lint, `no-restricted-imports` de `.oxlintrc.json` (`motion` de `motion/react` interdit ; seul `MotionProvider.test.tsx` y déroge, pour prouver `strict`). Les lots F10, F11, F13 à F16 écrivent `m.*`. En dev, Motion affiche un avertissement de console sous `prefers-reduced-motion: reduce` (non une erreur).
- **`Enter` annonce son arrivée** : `data-entree="en-cours"` puis `"arrive"` (`onAnimationComplete`), que `e2e/banc.ts` (`attendLeRepos`) attend avant toute mesure. Les animations de Motion pilotées par JavaScript (`y`, `scale`) n'entrent pas dans `document.getAnimations()` : les lots suivants qui en ont font de même (un attribut de fin), ou ajoutent leur attente. Le style posé par Motion (`opacity`, `transform`) bat toute classe : ne pas en mettre sur un `Enter`. Seul `className` est transmis.
- **Preuves en Chromium** (`e2e/banc.entree.spec.ts`, trois projets en CI) : départ lu à l'instant où l'élément entre dans la page (opacité 0, `matrix(0.92, 0, 0, 0.92, 0, 36)`), arrivée dans l'ordre des rangs, 217 ms entre le premier et le quatrième (attendu 210 ; bornes 150 à 450, 60 passages sur 60 en charge normale et 24 sur 24 avec 44 boucles actives) ; sous `prefers-reduced-motion`, `transform: none` dès le départ et tout arrive d'un coup. **WebKit (CI, projet `iphone`) a obligé deux assouplissements** : il lance déjà l'animation du rang 0 quand le test lit le style (opacité de 0,008, non 0 : le départ est donc « presque invisible, rapetissé, décalé de plus de 20 px », non une matrice exacte), et il rend déjà l'état final d'une animation réduite de 1 ms (le test réduit ne vérifie que l'absence de transformation). Tout test futur qui lit le style de départ d'un mouvement Motion doit tolérer « à peine commencé ». Unitaire : `Enter` demande à la politique le rang et la préférence qu'il reçoit (un rang décalé de 1 ferait attendre le premier élément, qui porte le LCP).
- **Banc** : la section « Entrée d'écran » est **sans pendant** dans `reference.html` : la scène de « Décor, bulle, entrée d'écran, confettis » porte aussi le soleil, le sol, la marmite et les confettis. **F14b** porte la scène du soleil : **marge `.scene--sonde`** obligatoire (axe lit la boîte de 700 px du `.soleil` sans le rognage et juge « recouvert » le texte voisin), plancher d'axe de sa section, et retrait de `'Bloc avec pastilles et tampon'` de `reportees` avec suppression du cas « Bloc avec pastilles, sans le tampon » (constat de F12). Planchers d'axe : `REUSSITES_MIN` 145 -> 152 (162 mesurés au PC, 161 au téléphone) et 7 pour « Entrée d'écran » ; WebKit non joué en local.
- **Revue adverse** (un agent Sonnet, effort élevé : le crédit Codex est épuisé et la règle du 14/11 n'en demande qu'une) : 0 bloquant, 2 importants et 11 mineurs ; traités : la garde de lint ci-dessus, le test du rang transmis, le test du mouvement réduit au niveau de `Enter`, `subscribe` sorti du composant, un commentaire CSS périmé, un titre de test faux, les limites écrites. **Non traité** : `Screen` fait doublon avec le fond du `body` (le plan le demande) ; la garde de `attendLeRepos` n'est prouvée par aucun test (axe passe sans elle, les 550 ms sont écoulées : elle est écrite comme précaution) ; `docs/conventions.md` ne mentionne pas Motion (à faire en F25).

---

## Sources (vérifiées en ligne ou par essai le 13/11/2026)

1. **Tailwind CSS 4 : thème** https://tailwindcss.com/docs/theme (`@theme`, `--color-*: initial`, `--*: initial`, `static`,
   `inline`, espaces de noms) ; **styles personnalisés** https://tailwindcss.com/docs/adding-custom-styles (`@layer
   components` sous les utilitaires) ; **détection des classes** https://tailwindcss.com/docs/detecting-classes-in-source-files.
   Essayé avec `@tailwindcss/node` 4.3.3 (D3).
2. **TanStack Router** : https://tanstack.com/router/latest/docs/framework/react/installation/with-vite (plugin avant
   `@vitejs/plugin-react`, `routeTree.gen.ts`), `…/guide/code-splitting` (`autoCodeSplitting`, le chargeur n'est pas
   scindé), `…/guide/data-loading` (`errorComponent`, `pendingMs`), `…/guide/document-head-management` (`head`,
   `HeadContent`, retirer `<title>`), `…/guide/authenticated-routes`, `…/api/router/RouterOptionsType`.
3. **openapi-typescript et openapi-fetch** : https://openapi-ts.dev/cli (`--check`), https://openapi-ts.dev/openapi-fetch/
   (`createClient<paths>`, `data`/`error`/`response`) ; essayé : en-têtes du client, middleware `onRequest`, `onResponse`,
   `onError`, 429 avec `Retry-After`, `Idempotency-Key` entre guillemets, avec `openapi-fetch` 0.17.0 et MSW 3.0.4 sous
   happy-dom 21.0.4 ; `--check` rend 0 puis 1 ; TypeScript 6.0.3 oui, 7.0.2 non (D1).
4. **Motion** : https://motion.dev/docs/react-reduce-bundle-size (`LazyMotion`, `m`, `domAnimation` +24 ko, `strict`),
   https://motion.dev/docs/react-motion-config (`reducedMotion`, `nonce`), https://motion.dev/docs/react-accessibility
   (`reducedMotion="user"` ne coupe que transformations et mise en page), https://motion.dev/docs/react-upgrade-guide.
   Essayé avec 14.12.0 : `LazyMotion`, `domAnimation`, `MotionConfig`, `useReducedMotion`, `AnimatePresence`, `animate`,
   `MotionGlobalConfig.skipAnimations` exportés par `motion/react`, `m` par `motion/react-m`.
5. **vite-plugin-pwa** : https://vite-pwa-org.netlify.app/guide/register-service-worker.html (`injectRegister`),
   https://vite-pwa-org.netlify.app/workbox/generate-sw.html (`navigateFallbackDenylist`). Essayé avec 2.0.0 et Vite 8.3.6 :
   aucun script en ligne, `{denylist:[/^\/api\//]}` dans `sw.js`, `selfDestroying` typé.
6. **oasdiff 1.35.0**, rejoué : `oasdiff breaking base revision --fail-on ERR` rend 1 quand une route est retirée (« api-path-removed-without-deprecation »), 0 quand une route est ajoutée. **Playwright** : https://playwright.dev/docs/accessibility-testing (`AxeBuilder`, `withTags`),
   https://playwright.dev/docs/test-snapshots ; types de 1.63 (`animations: 'disabled'`, `reducedMotion`).
7. **Lighthouse CI** : https://googlechrome.github.io/lighthouse-ci/docs/configuration.html (`assert`, `resource-summary`,
   `numberOfRuns`, `upload.target`).
8. **Vitest** : https://vitest.dev/guide/projects (`test.projects`, `workspace` déprécié depuis 3.2). **oxlint** :
   https://oxc.rs/docs/guide/usage/linter/plugins.html (`jsx-a11y`, `react`) ; essayé : `<div onClick>`, `<img>` sans `alt`.
9. **Cloudflare Wrangler 4.155** : `wrangler dev --var`, `wrangler rollback`, `wrangler versions list` (essayé :
   `--var CSP_MODE:enforce` sert la CSP en `enforce`).
10. **WCAG 2.2** (SC 1.3.5, 1.4.1, 1.4.11, 2.1.1, 2.2.2, 2.4.3, 2.4.11, 2.5.1, 3.3.1, 3.3.4, 4.1.3), **WAI-ARIA APG**
    (« Dialog (Modal) », « Button »), **MDN** (`<dialog>`, `aria-live`, `autocomplete`) : skill `building-frontends`
    (sources 1 à 35).
11. **La revue de la PR #38** : `~/PERSO/sauvegardes-popote/maquettes-parcours-2026-11-13/systeme-jeu/revue-pr38.md`,
    points 5 à 19.
12. **Plans 0.4 et 0.4bis** (popote-web) et **`normes-api.md`** de `popote-api` (§ 3.2, 3.3, 3.5, 3.6, 3.10, garde
    d'origine `X-Popote-Client`).
