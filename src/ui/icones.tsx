import type { SVGProps } from 'react'
import { classes } from './classes'
import { sans, sansInteraction, type Interactif } from './nonInteractif'

/**
 * Les signes du système en SVG : une coche, une croix, une flèche. Ils remplacent les glyphes ✕ ✓ →, que la police du système ne
 * dessine pas toujours (revue 17). Un signe n'est jamais le seul porteur du sens (WCAG 1.4.1) : il est décoratif, et le texte à côté
 * dit la même chose. Ils prennent la couleur du texte (`currentColor`) ; la taille vient du contexte (`.effet`, `.suivi`) ou de `className`.
 */
type IconeProps = Omit<SVGProps<SVGSVGElement>, Interactif | `aria-${string}` | 'children' | 'focusable' | 'viewBox' | 'style'>

// Un signe décoratif n'a ni nom ni voix : JSX ne vérifie pas les attributs à trait d'union, donc on les retire à l'exécution.
const NI_NOM_NI_STYLE = /^(aria-.*|style|children|focusable|viewBox)$/

function Icone({ trace, className, ...reste }: IconeProps & { trace: string }) {
  return (
    <svg {...sans(sansInteraction(reste), NI_NOM_NI_STYLE)} viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={classes('icone', className)}>
      <path d={trace} />
    </svg>
  )
}

/** Fait, juste, reste. */
export const Coche = (props: IconeProps) => <Icone {...props} trace="M5 12.5l4.5 4.5L19 7.5" />
/** Disparaît, retiré. */
export const Croix = (props: IconeProps) => <Icone {...props} trace="M6 6l12 12M18 6L6 18" />
/** Change, suite. */
export const Fleche = (props: IconeProps) => <Icone {...props} trace="M5 12h14M13 6l6 6-6 6" />
