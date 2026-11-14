import type { HTMLAttributes } from 'react'
import { classes } from './classes'
import { sansInteraction, type Interactif } from './nonInteractif'

export type BadgeTone = 'jaune' | 'menthe' | 'rose' | 'lilas'

const CLASSE_DE: Record<BadgeTone, string | undefined> = {
  jaune: undefined,
  menthe: 'pastille--menthe',
  rose: 'pastille--rose',
  lilas: 'pastille--lilas',
}

export type BadgeProps = Omit<HTMLAttributes<HTMLSpanElement>, Interactif> & {
  tone?: BadgeTone
}

/** La pastille du système (`.pastille`) : une information courte. Elle ne se touche pas (règle 9) : ni gestionnaire, ni rôle, ni `tabindex`, au type comme à l'exécution. */
export function Badge({ tone = 'jaune', className, ...reste }: BadgeProps) {
  return <span {...sansInteraction(reste)} className={classes('pastille', CLASSE_DE[tone], className)} />
}
