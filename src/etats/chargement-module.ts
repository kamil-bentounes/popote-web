// Les trois messages des navigateurs quand un `import()` dynamique échoue (Chrome, Firefox, Safari).
// Une copie du critère du routeur (`isModuleNotFoundError`, de `@tanstack/router-core`, dépendance
// transitive qu'on n'importe pas) : on décide ici ce que fait « Réessayer ».
const DEBUTS_DE_MESSAGE = [
  'Failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'Importing a module script failed',
]

/**
 * Vrai quand l'erreur est celle d'un morceau de code de route qui n'a pas pu être chargé (hors ligne,
 * ou déploiement qui a retiré l'ancien fichier). `router.invalidate()` ne la répare jamais : le
 * routeur garde l'échec ; seul un rechargement de la page repart de zéro.
 */
export function estEchecDeChargementDeModule(erreur: unknown): boolean {
  if (!(erreur instanceof Error)) return false
  return DEBUTS_DE_MESSAGE.some((debut) => erreur.message.startsWith(debut))
}
