# AGENTS.md

Règles pour toute session d'agent sur `popote-web` (le front de Popote ; l'API et la base sont dans `popote-api`).

## Commandes

- Installer : `npm ci` · Lancer : `npm run dev` · Lint : `npm run lint` · Types : `npx tsc -b`
- Tests : `npm test` · Construire : `npm run build` · Banc et e2e : `npm run e2e` (voir `docs/banc.md`)
- Avant de proposer un commit, lint, types, tests et construction doivent passer.

## Règles

- Le front ne parle qu'à `/api`.
- Conventions de code : `docs/conventions.md`. Textes de l'écran et commits en français, identifiants en anglais.
- Aucun secret dans le code ni dans un fichier versionné ; le front n'a aucune configuration propre à un environnement.
- Commits Conventional Commits en français, sans ligne de co-auteur. Remote : alias SSH `github-perso` uniquement.
- Ne rien écrire dans l'ancien dépôt `smart-receipe-scheduler` (il sert la prod jusqu'à la bascule).
- Ancien front : retiré de ce dépôt (F1), lisible à l'étiquette `ancien-front-2026-11-13`. L'essai sert une page d'attente en attendant le nouveau (plan : `docs/superpowers/plans/2026-11-13-fondation-du-front.md`).
