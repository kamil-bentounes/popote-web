/** Les sept états du système, dans l'ordre de sa page de référence ; ce sont les valeurs de `data-etat` (D13 : le vocabulaire du système reste en français). */
export const ETATS_MARMITE = ['repos', 'sommeil', 'ecoute', 'reflexion', 'parole', 'joie', 'inquiet'] as const
export type EtatMarmite = (typeof ETATS_MARMITE)[number]

export const estUnEtat = (valeur: string): valeur is EtatMarmite => (ETATS_MARMITE as readonly string[]).includes(valeur)
