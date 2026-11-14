import * as m from 'motion/react-m'
import type { HTMLAttributes } from 'react'
import { etatsVisuels } from '../textes/etats-visuels'
import { classes } from './classes'
import { Coche } from './icones'
import { variantesRemplissage } from './mouvement'
import { sans, sansInteraction, type Interactif } from './nonInteractif'
import { useMouvementReduit } from './useMouvementReduit'

export interface Step {
  label: string
  done: boolean
}

// Le nom et `aria-current` sont posés ici : un attribut glissé par un appelant (JSX ne vérifie pas ceux à trait d'union) ne les remplace pas.
const A_NOUS = /^(aria-.*|style|children)$/

export type StepsProps = Omit<HTMLAttributes<HTMLOListElement>, Interactif | `aria-${string}` | 'style' | 'children'> & {
  /** Ce que suit la liste (« Suivi de l'invitation ») : son nom pour un lecteur d'écran. */
  name: string
  steps: readonly Step[]
}

/**
 * Le suivi en étapes du système (`.suivi`) : une liste ordonnée, dont la longueur est lue par les lecteurs d'écran. Une étape faite
 * montre une coche, `data-fait`, et dit « faite » en texte ; une étape à venir dit « à venir » : jamais la couleur seule (WCAG 1.4.1).
 * La dernière étape faite est l'étape courante (`aria-current="step"`). L'étape qui se remplit joue son remplissage par Motion
 * (`variantesRemplissage`, qui remplace `@keyframes remplit`). Elle ne se touche pas.
 */
export function Steps({ name, steps, className, ...reste }: StepsProps) {
  const reduit = useMouvementReduit()
  const courante = steps.findLastIndex((etape) => etape.done)
  return (
    <ol {...sans(sansInteraction(reste), A_NOUS)} aria-label={name} className={classes('suivi', className)}>
      {steps.map(({ label, done }, rang) => (
        <li key={label} data-fait={done ? '' : undefined} aria-current={rang === courante ? 'step' : undefined}>
          <i aria-hidden="true">{done && <m.span className="suivi-remplit" {...variantesRemplissage(reduit)} />}</i>
          {done && <Coche />}
          {label}
          <span className="sr-seul">{done ? etatsVisuels.etape.faite : etatsVisuels.etape.aVenir}</span>
        </li>
      ))}
    </ol>
  )
}
