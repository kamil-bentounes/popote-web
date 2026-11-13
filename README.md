# popote-web

Le front de Popote (React 19, Vite). L'API et la base sont dans `popote-api`.

L'ancien front est retiré (étiquette `ancien-front-2026-11-13`) : le nouveau se construit selon
`docs/superpowers/plans/2026-11-13-fondation-du-front.md`. En attendant, l'essai sert une page d'attente.

## Lancer en local
`npm ci && npm run dev`

## Vérifier
`npm run lint && npx tsc -b && npx tsc -p relais && npm test && npm run build`
