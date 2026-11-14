import type { EtatMarmite } from '../ui/etatsMarmite'

/**
 * Ce que dit la marmite aux lecteurs d'écran quand on lui demande d'annoncer son état (`<Pot annonce />`). Au repos, rien : on
 * n'annonce pas qu'il ne se passe rien. Les phrases tutoient, comme le reste de l'appli ; Kamil les relit sur le banc.
 */
export const annonces: Record<EtatMarmite, string> = {
  repos: '',
  sommeil: 'Popote se réveille, ça prend quelques secondes.',
  ecoute: 'Popote t’écoute.',
  reflexion: 'Popote réfléchit.',
  parole: 'Popote répond.',
  joie: 'C’est fait, bravo !',
  inquiet: 'Popote s’inquiète : quelque chose bloque.',
}

/** Le « z z » qui flotte au-dessus de la marmite endormie : un signe dessiné, pas une phrase. */
export const signeSommeil = 'z z'
