import type { Section } from '../section'
import { Gauge } from '../../ui/Gauge'

/** Les jauges de la section « Bloc, pastille, tampon, avatar » de `reference.html` (légende « Jauges : énergie, protéines »). Le remplissage rejouable est dans `jauge-qui-se-remplit.tsx`. */
export const section: Section = {
  reference: 'Bloc, pastille, tampon, avatar',
  cas: [
    {
      legende: 'Jauges : énergie, protéines',
      reference: 'Jauges',
      rendu: (
        <>
          <Gauge name="Énergie du jour" value={64} />
          <Gauge name="Protéines du jour" value={56} tone="ciel" />
        </>
      ),
    },
  ],
}
