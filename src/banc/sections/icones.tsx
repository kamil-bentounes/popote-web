import type { Section } from '../section'
import { Coche, Croix, Fleche } from '../../ui/icones'

/** Les signes SVG qui remplacent les glyphes ✕ ✓ →. Sans pendant dans `reference.html` : elle ne les montre que dans les lignes d'effet et le suivi. */
export const section: Section = {
  titre: 'Icônes',
  cas: [
    {
      legende: 'Croix, coche, flèche : trois formes, à la couleur du texte',
      rendu: (
        <div className="rangee">
          <Croix className="size-8" />
          <Coche className="size-8" />
          <Fleche className="size-8" />
        </div>
      ),
    },
  ],
}
