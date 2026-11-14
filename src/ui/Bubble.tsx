import type { HTMLAttributes } from 'react'
import { classes } from './classes'

export type BubbleProps = Omit<HTMLAttributes<HTMLParagraphElement>, 'role'> & {
  /**
   * C'est l'assistant qui parle : la bulle devient une région `status`, que les lecteurs d'écran annoncent. Pour qu'un texte qui
   * change soit annoncé, la bulle doit être montée avant que son texte change (même nœud, contenu qui bouge) ; une région posée avec
   * son texte déjà dedans n'est pas annoncée de façon fiable.
   */
  announce?: boolean
}

/** La bulle du système (`.bulle`) : ce que dit la marmite. La marmite elle-même est décorative : c'est cette bulle qui porte le texte. */
export function Bubble({ announce = false, className, ...reste }: BubbleProps) {
  return <p {...reste} role={announce ? 'status' : undefined} className={classes('bulle', className)} />
}
