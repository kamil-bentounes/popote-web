/**
 * Ce que lisent les lecteurs d'écran là où le système dit l'état par la forme ou la couleur seule (WCAG 1.4.1) : une étape de suivi
 * faite ou à venir, ce qu'une ligne d'effet fait de ce dont elle parle. Le texte est posé dans un `.sr-seul`, à côté du dessin.
 */
export const etatsVisuels = {
  etape: {
    /** Lue après le nom de l'étape (« Envoyée, faite »). */
    faite: ', faite',
    aVenir: ', à venir',
  },
  effet: {
    /** Lus avant la phrase (« Disparaît : tes objectifs disparaissent. »). */
    perd: 'Disparaît : ',
    reste: 'Reste : ',
    change: 'Change : ',
  },
} as const
