import * as m from 'motion/react-m'
import { useState, type HTMLAttributes } from 'react'
import { variantesTampon } from './mouvement'
import { type Interactif, sansInteraction } from './nonInteractif'
import { classes } from './classes'
import { useMouvementReduit } from './useMouvementReduit'

export type StampProps = Omit<HTMLAttributes<HTMLSpanElement>, Interactif | 'style' | `onAnimation${string}` | 'children'> & {
  children: string
  /** Appelé une fois, quand le tampon a fini de se poser : c'est le moment d'une confirmation, de confettis (F16). */
  onArrive?: () => void
}

/**
 * Le tampon du système (`.tampon`) : il récompense un geste, arrive en tournant (la politique est `variantesTampon`) et dit « posé »
 * par `data-tampon="arrive"` puis `onArrive`. Il ne se touche pas. Son texte, court, est le seul sens : un écran qui doit
 * annoncer la réussite à un lecteur d'écran le fait par sa propre région `status` (le tampon, lui, n'est pas une annonce).
 * Le style posé par Motion (`transform`) bat toute classe : n'en mettre aucune qui tourne ou grandisse ; la position (`absolute`,
 * `top`, `right`) passe par `className`.
 */
export function Stamp({ onArrive, className, ...reste }: StampProps) {
  const reduit = useMouvementReduit()
  const [arrive, setArrive] = useState(false)
  return (
    <m.span
      {...sansInteraction(reste)}
      {...variantesTampon(reduit)}
      className={classes('tampon', className)}
      data-tampon={arrive ? 'arrive' : 'en-cours'}
      onAnimationComplete={() => {
        setArrive(true)
        onArrive?.()
      }}
    />
  )
}
