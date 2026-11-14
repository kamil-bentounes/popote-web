import { QueryClient } from '@tanstack/react-query'
import { delaiDeReprise, reessaie } from './reprises'

/**
 * Le client de requêtes de l'appli. Une lecture reste fraîche 30 s et se relit au retour sur la fenêtre. Les reprises sont
 * celles de `reprises.ts`. Une écriture faite hors ligne attend le retour du réseau puis repart avec les MÊMES variables, donc
 * la même clé d'idempotence ; elle n'est rejouée après une panne que par `optionsEcriture`.
 */
export function creeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, refetchOnWindowFocus: true, retry: reessaie, retryDelay: delaiDeReprise },
      mutations: { networkMode: 'online', retry: false, retryDelay: delaiDeReprise },
    },
  })
}
