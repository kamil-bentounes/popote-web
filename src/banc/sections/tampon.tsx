import type { Section } from '../section'
import { TamponQuiArrive } from '../TamponQuiArrive'

/**
 * Le tampon qui arrive : l'arrivée est du mouvement, que la comparaison avec `reference.html` (qui le capture posé) ne voit pas. Ici, il
 * arrive à chaque appui, pour qu'un test lise son départ, sa fin et son mouvement réduit. Sans pendant dans la référence.
 */
export const section: Section = {
  titre: 'Tampon',
  cas: [{ legende: 'Le tampon arrive en tournant, rejouable', rendu: <TamponQuiArrive /> }],
}
