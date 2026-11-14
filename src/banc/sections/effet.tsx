import type { Section } from '../section'
import { EffectList, EffectRow } from '../../ui/EffectRow'

/** Les lignes d'effet de la section « Bloc, pastille, tampon, avatar » de `reference.html` (légende « Lignes d'effet avant un geste grave »). */
export const section: Section = {
  reference: 'Bloc, pastille, tampon, avatar',
  cas: [
    {
      legende: 'Lignes d’effet avant un geste grave',
      reference: 'Lignes d’effet',
      rendu: (
        <EffectList>
          <EffectRow sens="perd">Tes objectifs <b>disparaissent</b>.</EffectRow>
          <EffectRow sens="reste">Léa <b>garde</b> le frigo.</EffectRow>
          <EffectRow sens="change">Elle est <b>prévenue</b>.</EffectRow>
        </EffectList>
      ),
    },
  ],
}
