import * as m from 'motion/react-m'
import { useState, type HTMLAttributes } from 'react'
import { classes } from './classes'
import { variantesJauge } from './mouvement'
import { sans, sansInteraction, type Interactif } from './nonInteractif'
import { borneLaPart } from './pourcentage'
import { useMouvementReduit } from './useMouvementReduit'

// Tout l'ARIA de la jauge est posé ici, sauf `aria-describedby` (une aide que l'écran relie) : un `aria-valuenow` ou `aria-labelledby`
// glissé par un appelant l'emporterait sur le nôtre (JSX ne vérifie pas les attributs à trait d'union).
const ARIA_A_NOUS = /^(aria-(?!describedby$).*|style|children)$/

export type GaugeProps = Omit<HTMLAttributes<HTMLDivElement>, Interactif | `aria-${string}` | 'style' | 'children'> & {
  /** Ce que mesure la jauge (« Énergie du jour ») : son nom pour un lecteur d'écran, qui lit aussi la valeur. */
  name: string
  /** De 0 à 100 ; au-delà ou en deçà, elle est bornée, et `NaN` vaut 0. */
  value: number
  tone?: 'tomate' | 'ciel'
  'aria-describedby'?: string
}

/**
 * La jauge du système (`.jauge`) : énergie, protéines, budget. Une barre de progression (`role="progressbar"`) qui dit sa valeur : la
 * couleur ne la porte pas seule. Le remplissage passe par Motion (`variantesJauge`, qui remplace la transition de `width` du système) ;
 * les rayures ne défilent que pendant ce remplissage (`data-anime`, que le CSS lit) : un mouvement sans fin qu'on ne peut pas arrêter
 * est un défaut (WCAG 2.2.2). Elle ne se touche pas.
 */
export function Gauge({ name, value, tone = 'tomate', className, ...reste }: GaugeProps) {
  const reduit = useMouvementReduit()
  const part = borneLaPart(value)
  const [anime, setAnime] = useState(false)
  return (
    <div
      {...sans(sansInteraction(reste), ARIA_A_NOUS)}
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- `<progress>` ne se style pas comme `.jauge` (rayures, contour, remplissage animé) et ne contient pas de barre à nous
      role="progressbar"
      aria-label={name}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={part}
      className={classes('jauge', tone === 'ciel' && 'jauge--ciel', className)}
    >
      <m.i
        {...variantesJauge(part, reduit)}
        data-anime={anime ? '' : undefined}
        onAnimationStart={() => setAnime(true)}
        onAnimationComplete={() => setAnime(false)}
      />
    </div>
  )
}
