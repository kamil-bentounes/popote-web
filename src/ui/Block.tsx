import type { HTMLAttributes } from 'react'
import { classes } from './classes'

export type BlockProps = HTMLAttributes<HTMLElement> & {
  /** `div` par défaut. `section` n'est une région que si l'appelant la nomme (`aria-label`) ; `article` pour un contenu qui se lit seul. */
  as?: 'div' | 'section' | 'article'
}

/** Le bloc du système (`.bloc`) : la surface qui porte du contenu. Il n'a pas de marge intérieure : l'écran la choisit. */
export function Block({ as: Balise = 'div', className, ...reste }: BlockProps) {
  return <Balise {...reste} className={classes('bloc', className)} />
}
