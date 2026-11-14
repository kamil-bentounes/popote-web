import type { Section } from '../section'
import { MarmiteEnJoie } from '../MarmiteEnJoie'
import { ETATS_MARMITE, type EtatMarmite } from '../../ui/etatsMarmite'
import { Pot } from '../../ui/Pot'

/** Les sept légendes de `reference.html` (« La marmite »), dans l'ordre de ses états : « Nom : valeur de data-etat ». */
const NOMS: Record<EtatMarmite, string> = {
  repos: 'Repos',
  sommeil: 'Sommeil',
  ecoute: 'Écoute',
  reflexion: 'Réflexion',
  parole: 'Parole',
  joie: 'Joie',
  inquiet: 'Inquiétude',
}

/**
 * La section « La marmite ». Les sept états sont posés fixes (la joie ne retombe pas : `joieMs` infini, pour être comparée) ; le cas
 * « Touche le bouton » montre la vraie joie, qui retombe. Les deux scènes de « Décor, bulle, entrée d'écran, confettis » où la
 * marmite figure (avec la bulle, le soleil, le sol, les confettis) viennent avec F14 et F16.
 */
export const section: Section = {
  reference: 'La marmite',
  colonne: 160,
  cas: [
    ...ETATS_MARMITE.map((etat) => {
      const legende = `${NOMS[etat]} : ${etat}`
      return { legende, reference: legende, rendu: <Pot etat={etat} joieMs={Infinity} /> }
    }),
    { legende: 'Joie en vrai : deux sauts, puis elle retombe au repos', rendu: <MarmiteEnJoie /> },
  ],
}
