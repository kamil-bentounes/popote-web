import { domAnimation, LazyMotion, MotionConfig } from 'motion/react'
import type { ReactNode } from 'react'
import { ContexteMouvementReduit, usePreferenceMouvementReduit } from './useMouvementReduit'

/**
 * Le fournisseur de Motion, posé une fois à la racine de l'appli et du banc. Tout composant animé écrit `m.*` (`import * as m from
 * 'motion/react-m'`), jamais `motion.*` : `strict` fait lever un `motion` égaré (en développement et en test seulement : en production, la règle de lint
 * `no-restricted-imports` de `.oxlintrc.json` est la garde), qui embarquerait la bibliothèque entière
 * (~43 ko) au lieu de ~5 ko, plus ~24 ko de fonctions d'animation du DOM chargées ici une fois.
 *
 * Écart au plan : `reducedMotion` n'est pas « user » mais la valeur que ce fournisseur calcule lui-même (la préférence du
 * système, ou `reduit` quand l'appelant l'impose : le banc et les tests). Motion lit la même requête, mais une seule fois et
 * pour tout le processus : un test ne pourrait jamais changer d'avis. Les composants lisent la même valeur par
 * `useMouvementReduit`, donc la coupure des transformations de Motion et notre politique (`mouvement.ts`) ne se contredisent pas.
 */
export function MotionProvider({ children, reduit }: { children: ReactNode; reduit?: boolean }) {
  const preference = usePreferenceMouvementReduit()
  const reduitEffectif = reduit ?? preference
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion={reduitEffectif ? 'always' : 'never'}>
        <ContexteMouvementReduit value={reduitEffectif}>{children}</ContexteMouvementReduit>
      </MotionConfig>
    </LazyMotion>
  )
}
