import type { Section } from '../section'
import { Bubble } from '../../ui/Bubble'
import { BulleQuiParle } from '../BulleQuiParle'

/**
 * La bulle de la marmite. Dans `reference.html` elle n'existe que dans la scène de « Décor, bulle, entrée d'écran, confettis »,
 * à côté de la marmite (F17) : F14 et F17 portent cette scène. Ici, la bulle seule, dans ses deux emplois.
 */
export const section: Section = {
  titre: 'Bulle',
  cas: [
    { legende: 'Une phrase', rendu: <div className="rangee avec-queue"><Bubble>Bonsoir !</Bubble></div> },
    { legende: 'Qui parle : région status, annoncée quand son texte change', rendu: <BulleQuiParle /> },
    { legende: 'Une phrase longue passe à la ligne', rendu: <div className="rangee avec-queue"><Bubble>Il reste deux repas à choisir cette semaine, et le frigo a de quoi faire des lasagnes.</Bubble></div> },
  ],
}
