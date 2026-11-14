import * as m from 'motion/react-m'
import { useState, type ReactNode } from 'react'
import { variantesEntree } from './mouvement'
import { useMouvementReduit } from './useMouvementReduit'

const BALISES = { div: m.div, li: m.li, p: m.p, section: m.section, span: m.span } as const

export interface EnterProps {
  /** L'ordre d'arrivée : 0 pour le premier élément de l'écran (il n'attend pas), puis 1, 2… (70 ms de plus chacun). */
  rang: number
  /** `div` par défaut ; `li` dans une liste, `span` ou `p` quand l'enfant ne doit pas changer de nature. */
  as?: keyof typeof BALISES
  className?: string
  children: ReactNode
}

/**
 * Un élément d'écran qui arrive en rebondissant (règle 6 du système). Le mouvement réduit, les durées et les courbes
 * viennent de `mouvement.ts`. `data-entree` passe de `en-cours` à `arrive` quand le mouvement est fini : un test, ou
 * un écran qui doit attendre que tout soit posé, peut l'attendre au lieu de deviner une durée.
 *
 * Limites voulues : seul `className` est transmis (ni `id`, ni `aria-*`, ni `ref` : l'élément est un habillage, ce qu'il enveloppe
 * porte le sens) ; et le style posé par Motion (`opacity`, `transform`) bat toute classe : n'y mettre ni opacité ni `transform`.
 */
export function Enter({ rang, as = 'div', className, children }: EnterProps) {
  const reduit = useMouvementReduit()
  const [arrive, setArrive] = useState(false)
  const Balise = BALISES[as]
  return (
    <Balise
      {...variantesEntree(rang, reduit)}
      className={className}
      data-entree={arrive ? 'arrive' : 'en-cours'}
      onAnimationComplete={() => setArrive(true)}
    >
      {children}
    </Balise>
  )
}
