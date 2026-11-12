# Conventions de popote-web

Reprises du § 8 de la spec du socle (`popote-api`, `docs/superpowers/specs/2026-11-12-socle-design.md` dans l'ancien dépôt).

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

---


## L'API

Le front ne parle qu'à `/api` (voir `popote-api/docs/normes-api.md`). Jusqu'à l'étape 0.5, il parle encore à
Supabase en direct : c'est la seule exception, elle disparaît au jour J.
