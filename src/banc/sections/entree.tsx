import type { Section } from '../section'
import { EcranQuiArrive } from '../EcranQuiArrive'

/**
 * L'entrée d'écran de « Décor, bulle, entrée d'écran, confettis » (`reference.html`). Cette scène-là porte aussi le soleil, le sol,
 * la marmite et les confettis (F14b, F17, F16) : elle n'a pas de pendant tant qu'ils ne sont pas là. Ici, l'entrée seule : le rang
 * 0 sans retard, puis 70 ms de plus par rang, rejouable.
 */
export const section: Section = {
  titre: 'Entrée d’écran',
  cas: [{ legende: 'Les éléments se posent l’un après l’autre, le premier sans attendre', rendu: <EcranQuiArrive /> }],
}
