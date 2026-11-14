import type { HTMLAttributes } from 'react'
import { classes } from './classes'
import { sansInteraction, type Interactif } from './nonInteractif'

export type GroundProps = Omit<HTMLAttributes<HTMLDivElement>, Interactif | 'children' | 'aria-hidden'>

/**
 * Le sol du système (`.sol`) : la bande crème, au contour d'encre, qui recouvre le bas du soleil. Décoratif comme lui : caché des
 * lecteurs d'écran, sans rôle, jamais focalisable. Son `top` est celui de l'écran qui l'emploie (un utilitaire : `top-[190px]`) ;
 * il se place après le soleil dans le DOM, donc au-dessus, et ce qu'un écran pose sur lui est positionné aussi.
 */
export function Ground({ className, ...reste }: GroundProps) {
  return <div {...sansInteraction(reste)} aria-hidden="true" className={classes('sol', className)} />
}
