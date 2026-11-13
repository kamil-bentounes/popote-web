import type { QueryClient } from '@tanstack/react-query'
import { createRouter, type RouterHistory } from '@tanstack/react-router'
import { ErreurRoute } from './etats/ErreurRoute'
import { NonTrouvee } from './etats/NonTrouvee'
import { routeTree } from './routeTree.gen'

/** Les réglages communs, partagés avec les tests (qui montent d'autres arbres de routes). */
export const optionsDuRouteur = {
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  // Un chargement sous 400 ms ne montre rien ; au-delà, l'écran d'attente reste 400 ms au moins.
  defaultPendingMs: 400,
  defaultPendingMinMs: 400,
  defaultErrorComponent: ErreurRoute,
  defaultNotFoundComponent: NonTrouvee,
} as const

interface OptionsRouteur {
  queryClient: QueryClient
  /** Pour les tests : un historique en mémoire. */
  history?: RouterHistory
}

export function creeRouteur({ queryClient, history }: OptionsRouteur) {
  return createRouter({
    ...optionsDuRouteur,
    routeTree,
    history,
    context: { queryClient },
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof creeRouteur>
  }
}
