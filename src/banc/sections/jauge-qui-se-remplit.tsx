import type { Section } from '../section'
import { Gauge } from '../../ui/Gauge'
import { JaugeQuiSeRemplit } from '../JaugeQuiSeRemplit'

/**
 * Le remplissage de la jauge est du mouvement (Motion), que la comparaison avec `reference.html` (qui le capture posé) ne voit pas :
 * ici il repart à chaque appui, pour qu'un test lise les rayures pendant le remplissage et leur arrêt ensuite. Les bornes (0, 100, au-delà)
 * y sont aussi. Sans pendant dans la référence.
 */
export const section: Section = {
  titre: 'Jauge qui se remplit',
  cas: [
    { legende: 'Les rayures ne défilent que pendant le remplissage', rendu: <JaugeQuiSeRemplit /> },
    {
      legende: 'Bornes : vide, pleine, et une valeur au-delà',
      rendu: (
        <>
          <Gauge name="Vide" value={0} />
          <Gauge name="Pleine" value={100} tone="ciel" />
          <Gauge name="Au-delà de 100" value={150} />
        </>
      ),
    },
  ],
}
