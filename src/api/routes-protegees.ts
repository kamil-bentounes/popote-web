// Généré par `npm run contrat:genere` depuis contrat/openapi.json : ne pas modifier à la main.
// Les opérations du contrat qui exigent une session (`security`).
export const routesProtegees = [
  'DELETE /api/v1/me',
  'DELETE /api/v1/me/invitations/{id}',
  'DELETE /api/v1/me/sessions',
  'DELETE /api/v1/me/sessions/{id}',
  'GET /api/v1/me',
  'GET /api/v1/me/invitations',
  'GET /api/v1/me/sessions',
  'POST /api/v1/me/invitations',
  'POST /api/v1/me/reauthentication',
  'PUT /api/v1/me/password',
] as const

export type RouteProtegee = (typeof routesProtegees)[number]
