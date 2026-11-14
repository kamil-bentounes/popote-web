import { createContext, use, useSyncExternalStore } from 'react'

const REQUETE = '(prefers-reduced-motion: reduce)'

/** `true` quand le fournisseur de mouvement impose (ou constate) un mouvement réduit ; `undefined` hors de tout fournisseur. */
export const ContexteMouvementReduit = createContext<boolean | undefined>(undefined)

// Hors du composant : une fonction recréée à chaque rendu ferait se réabonner React à chaque fois.
function abonne(rappel: () => void): () => void {
  const requete = window.matchMedia(REQUETE)
  requete.addEventListener('change', rappel)
  return () => requete.removeEventListener('change', rappel)
}
const lit = (): boolean => window.matchMedia(REQUETE).matches
const litCoteServeur = (): boolean => false

/** Ce que la personne a demandé à son système, suivi dans le temps (elle peut le changer pendant la session). */
export function usePreferenceMouvementReduit(): boolean {
  return useSyncExternalStore(abonne, lit, litCoteServeur)
}

/** Le mouvement est-il réduit ? À lire par tout composant animé, pour choisir ses variantes (`mouvement.ts`). */
export function useMouvementReduit(): boolean {
  const reduit = use(ContexteMouvementReduit)
  if (reduit === undefined) throw new Error('useMouvementReduit hors d’un MotionProvider')
  return reduit
}
