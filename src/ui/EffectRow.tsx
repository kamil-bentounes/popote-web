import type { HTMLAttributes, ReactNode } from 'react'
import { etatsVisuels } from '../textes/etats-visuels'
import { classes } from './classes'
import { Coche, Croix, Fleche } from './icones'
import { sans, sansInteraction, type Interactif } from './nonInteractif'

export type Sens = 'perd' | 'reste' | 'change'

// Une forme distincte par sens : la croix, la coche et la flèche ne se confondent pas sans leur couleur.
const ICONE_DE: Record<Sens, () => ReactNode> = {
  perd: () => <Croix />,
  reste: () => <Coche />,
  change: () => <Fleche />,
}

export type EffectRowProps = Omit<HTMLAttributes<HTMLLIElement>, Interactif> & {
  /** Ce que le geste fait de ce dont parle la ligne : le retire, le garde, le change. */
  sens: Sens
}

/**
 * La ligne d'effet du système (`.effet`) : avant un geste grave, ce qui disparaît, ce qui reste, ce qui change. Le sens se dit trois
 * fois (la couleur, la forme du signe SVG, un préfixe lu par les lecteurs d'écran) : jamais la couleur seule. Elle se pose dans une
 * `EffectList`. Elle ne se touche pas.
 */
export function EffectRow({ sens, className, children, ...reste }: EffectRowProps) {
  // Un appelant en JavaScript : un sens inconnu aurait une ligne sans signe ni préfixe, donc sans sens du tout.
  if (!Object.hasOwn(ICONE_DE, sens)) throw new RangeError(`sens d'effet inconnu : ${String(sens)}`)
  return (
    <li {...sansInteraction(reste)} data-sens={sens} className={classes('effet', className)}>
      <i aria-hidden="true">{ICONE_DE[sens]()}</i>
      <span>
        <span className="sr-seul">{etatsVisuels.effet[sens]}</span>
        {children}
      </span>
    </li>
  )
}

/** La surface des lignes d'effet : un bloc du système, qui est une liste (un `<li>` hors de toute liste est invalide). */
export function EffectList({ className, ...reste }: Omit<HTMLAttributes<HTMLUListElement>, 'role'>) {
  // `role="list"` : voir `Steps` (WebKit retire la sémantique d'une liste sans puces).
  // oxlint-disable-next-line jsx-a11y/no-redundant-roles -- le rôle redit la liste, exprès
  return <ul {...sans(reste, ['role'])} role="list" className={classes('bloc px-[14px] py-1', className)} />
}
