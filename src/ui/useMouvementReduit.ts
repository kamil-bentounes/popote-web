import { createContext, use, useSyncExternalStore } from 'react'

const REQUETE = '(prefers-reduced-motion: reduce)'

/** `true` quand le fournisseur de mouvement impose (ou constate) un mouvement réduit ; `undefined` hors de tout fournisseur. */
export const ContexteMouvementReduit = createContext<boolean | undefined>(undefined)

/** Ce que la personne a demandé à son système, suivi dans le temps (elle peut le changer pendant la session). */
export function usePreferenceMouvementReduit(): boolean {
  return useSyncExternalStore(
    (rappel) => {
      const requete = window.matchMedia(REQUETE)
      requete.addEventListener('change', rappel)
      return () => requete.removeEventListener('change', rappel)
    },
    () => window.matchMedia(REQUETE).matches,
    () => false,
  )
}

/** Le mouvement est-il réduit ? À lire par tout composant animé, pour choisir ses variantes (`mouvement.ts`). */
export function useMouvementReduit(): boolean {
  const reduit = use(ContexteMouvementReduit)
  if (reduit === undefined) throw new Error('useMouvementReduit hors d’un MotionProvider')
  return reduit
}
