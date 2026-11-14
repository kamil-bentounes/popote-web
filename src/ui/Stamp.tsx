import * as m from 'motion/react-m'
import { useRef, useState, type HTMLAttributes } from 'react'
import { classes } from './classes'
import { variantesTampon } from './mouvement'
import { sans, sansInteraction, type Interactif } from './nonInteractif'
import { useMouvementReduit } from './useMouvementReduit'

export type StampProps = Omit<HTMLAttributes<HTMLSpanElement>, Interactif | 'style' | `onAnimation${string}` | 'children'> & {
  children: string
  /** Appelé une seule fois, quand le tampon a fini de se poser : c'est le moment d'une confirmation, de confettis (F16). */
  onArrive?: () => void
}

// Les props de Motion que le type de `HTMLAttributes` ignore, mais qu'un appelant en JavaScript passerait : gestes (un `onTap` ou `drag`
// rendrait le tampon focalisable), animation propre, style. `sansInteraction` ne connaît que les gestionnaires du DOM.
const PROPS_DE_MOTION = /^(style|initial|animate|exit|transition|variants|layout.*|while.*|onTap.*|onHover.*|onPan.*|onDrag.*|drag.*|onAnimation.*|onUpdate|onViewport.*|inherit|custom)$/

/**
 * Le tampon du système (`.tampon`) : il récompense un geste, arrive en tournant (la politique est `variantesTampon`) et dit « posé »
 * par `data-tampon="arrive"` puis `onArrive`, une seule fois (React en mode strict, ou un changement de mouvement réduit en route,
 * rejoueraient la fin du mouvement). Il ne se touche pas. Son texte, court, est le seul sens : un écran qui doit annoncer la réussite à
 * un lecteur d'écran le fait par sa propre région `status` (le tampon, lui, n'est pas une annonce).
 * Motion pose `transform` en ligne et bat toute classe quand le mouvement est normal : n'en mettre aucune qui tourne ou grandisse ; la
 * position (`absolute`, `top`, `right`) passe par `className`. En mouvement réduit Motion ne pose aucun `transform` : l'inclinaison de
 * repos (8 degrés) est alors celle de `.tampon`, que `e2e/banc.tampon.spec.ts` mesure.
 */
export function Stamp({ onArrive, className, ...reste }: StampProps) {
  const reduit = useMouvementReduit()
  const [arrive, setArrive] = useState(false)
  const dejaArrive = useRef(false)
  return (
    <m.span
      {...sans(sansInteraction(reste), PROPS_DE_MOTION)}
      {...variantesTampon(reduit)}
      className={classes('tampon', className)}
      data-tampon={arrive ? 'arrive' : 'en-cours'}
      onAnimationComplete={() => {
        if (dejaArrive.current) return
        dejaArrive.current = true
        setArrive(true)
        onArrive?.()
      }}
    />
  )
}
