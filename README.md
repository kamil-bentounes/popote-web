# popote-web

Le front de Popote (React 19, Vite). L'API et la base sont dans `popote-api`.

## Lancer en local
1. Dans `popote-api` : `npx supabase start` puis `uv run uvicorn popote_api.main:app --reload --port 8000`.
2. Ici : `npm ci && npm run dev` (le proxy de Vite envoie `/api` vers le port 8000).

## Vérifier
`npm run lint && npx tsc -b && npm test && npm run build`
