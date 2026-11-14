import type { Section } from '../section'
import { ContenuReveil } from '../../etats/EcranReveil'
import type { Palier } from '../../etats/reveil'

const reveille = (palier: Palier) => <div className="scene scene--reveil"><ContenuReveil etat={{ phase: 'reveil', palier }} /></div>

/**
 * L'écran de réveil (F18) : le contenu seul, en scène (le vrai écran couvre la fenêtre). Les trois moments de la phrase (à l'ouverture,
 * 6 s plus tard, au-delà de 12 s : « plus long que d'habitude »), puis « prêt ». Sans pendant dans `reference.html`, qui ne montre l'écran
 * de réveil que dans le prototype de « Entrer ». La phrase de 3 s, entre les deux premières, ne montre rien de plus : elle est dans le test.
 */
export const section: Section = {
  titre: 'Écran de réveil',
  colonne: 320,
  cas: [
    { legende: 'À l’ouverture, 2 s après le départ de la requête : la marmite dort', rendu: reveille(0) },
    { legende: 'Six secondes plus tard : la phrase a changé', rendu: reveille(2) },
    { legende: 'Au-delà de douze secondes : « plus long que d’habitude »', rendu: reveille(3) },
    { legende: 'Prêt : la marmite saute de joie, puis l’écran s’efface', rendu: <div className="scene scene--reveil"><ContenuReveil etat={{ phase: 'pret' }} /></div> },
  ],
}
