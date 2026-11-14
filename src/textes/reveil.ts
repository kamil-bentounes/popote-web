import type { Palier } from '../etats/reveil'

/**
 * Les phrases de l'écran de réveil : la seule source (amendement A3 du plan), un parcours qui rencontre cet état rend l'écran et
 * ne redit rien. Le titre ne change pas ; la phrase évolue avec la durée de l'attente (`palier`, voir `etats/reveil.ts`) ; une
 * personne qui attend plus que prévu doit le lire. Kamil les relit sur le banc.
 */
export const reveil = {
  titre: 'Popote se réveille',
  /** La phrase de chaque palier : 0 à l'ouverture, puis 3 s, 6 s et 12 s plus tard. Elles ne s'annoncent pas : voir `annonces`. */
  phrases: [
    'Elle ouvre les yeux…',
    'Elle s’étire, ça arrive…',
    'Elle allume le feu…',
    'C’est plus long que d’habitude, on y est presque.',
  ] satisfies Record<Palier, string>,
  pret: 'C’est prêt !',
} as const

/** Les deux seules annonces de l'écran : à son ouverture, puis à son « prêt ». Un changement de phrase est visuel. */
export const annonces = {
  reveil: 'Popote se réveille, ça prend quelques secondes.',
  pret: 'C’est prêt.',
} as const
