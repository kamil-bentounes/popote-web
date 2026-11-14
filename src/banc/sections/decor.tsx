import type { Section } from '../section'
import { SceneDeDecor } from '../SceneDeDecor'

/**
 * Le soleil et le sol, dans leurs trois teintes. Les scènes de « Décor, bulle, entrée d'écran, confettis » (`reference.html`) y ajoutent
 * la marmite, la bulle et les confettis (F17, F16) : cette section est donc sans pendant tant qu'ils ne sont pas là.
 */
export const section: Section = {
  titre: 'Décor',
  colonne: 'pleine',
  cas: [
    { legende: 'Soleil jaune et sol : les écrans de moment fort', rendu: <SceneDeDecor titre="Ce soir, c’est lasagnes" note="Soleil jaune" /> },
    { legende: 'Soleil ciel : attente et voix', rendu: <SceneDeDecor variant="ciel" fond="bg-ciel" titre="Ce lien a expiré" note="Soleil ciel" /> },
    { legende: 'Soleil rose : la fête', rendu: <SceneDeDecor variant="rose" fond="bg-rose" titre="Bravo, vous deux !" note="Soleil rose" /> },
  ],
}
