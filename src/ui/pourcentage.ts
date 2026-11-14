/**
 * Ramène une part à un pourcentage utilisable : de 0 à 100, jamais `NaN`, arrondi au centième. Un arrondi, car un nombre très petit
 * s'écrit en exposant (`1e-7`), qui n'est pas une longueur CSS : `--part: 1e-7%` serait ignoré et la jauge sauterait à sa valeur de départ.
 */
export function borneLaPart(valeur: number): number {
  if (Number.isNaN(valeur)) return 0
  const bornee = Math.min(100, Math.max(0, valeur))
  return Math.round(bornee * 100) / 100
}
