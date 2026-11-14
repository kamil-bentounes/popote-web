import type { HTMLAttributes } from 'react'
import { classes } from './classes'
import { sansInteraction, type Interactif } from './nonInteractif'

export type SunVariant = 'ciel' | 'rose'

export type SunProps = Omit<HTMLAttributes<HTMLDivElement>, Interactif | 'children' | 'aria-hidden'> & {
  /** Jaune par défaut (les écrans de moment fort) ; `ciel` pour l'attente et la voix, `rose` pour la fête. */
  variant?: SunVariant
}

/**
 * Le soleil du système (`.soleil`) : un décor de 700 px qui tourne (la rotation, en CSS, est coupée en mouvement réduit). Il est
 * posé par son parent (position absolue, `top` par un utilitaire) et ne dit rien : caché des lecteurs d'écran, sans rôle, jamais
 * focalisable, au type comme à l'exécution. Il déborde de son écran : le parent le rogne (`overflow: hidden`) ; et un lien
 * d'évitement ou tout contrôle posé au-dessus doit être positionné lui aussi, sinon le soleil le recouvre.
 */
export function Sun({ variant, className, ...reste }: SunProps) {
  return <div {...sansInteraction(reste)} aria-hidden="true" className={classes('soleil', variant && `soleil--${variant}`, className)} />
}
