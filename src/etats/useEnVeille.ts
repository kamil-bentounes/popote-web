import { useSyncExternalStore } from 'react'
import { reveil, type Reveil } from './reveil'

/**
 * « L'écran de réveil est-il là ? », et rien de plus : un booléen, pas l'état entier. La racine n'a pas à se rendre à chaque
 * changement de phrase (`palier`), qui n'est que visuel.
 */
export function useEnVeille(magasin: Reveil = reveil): boolean {
  return useSyncExternalStore(magasin.abonne, () => magasin.lis().phase !== 'repos')
}
