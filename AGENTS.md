# AGENTS.md

Règles pour toute session d'agent sur `popote-web` (le front de Popote ; l'API et la base sont dans `popote-api`).

## Commandes

- Installer : `npm ci` · Lancer : `npm run dev` · Lint : `npm run lint` · Types : `npx tsc -b`
- Tests : `npm test` · Construire : `npm run build` · E2E : `npm run e2e` (demande la pile de `popote-api`)
- Avant de proposer un commit, lint, types, tests et construction doivent passer.

## Règles

- Le front ne parle qu'à `/api` ; jusqu'à l'étape 0.5 il parle encore à Supabase en direct (seule exception).
- Conventions de code : `docs/conventions.md`. Textes de l'écran et commits en français, identifiants en anglais.
- Aucun secret dans le code ni dans un fichier versionné ; `.env.test` ne contient que des valeurs factices.
- Commits Conventional Commits en français, sans ligne de co-auteur. Remote : alias SSH `github-perso` uniquement.
- Ne rien écrire dans l'ancien dépôt `smart-receipe-scheduler` (il sert la prod jusqu'à la bascule).
