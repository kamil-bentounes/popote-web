import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { lit } from '../appel'
import { client } from '../client'

/**
 * La personne connectée. Une ressource = un fichier : ses clés, ses options et ses hooks sont ici, et la clé est précise
 * (`['moi']`), de sorte qu'aucune invalidation ne touche une autre ressource. La garde de session (`routes/_connecte.tsx`)
 * s'en sert. Attention : `staleTime` n'est pas un contrôle périodique de la session. La garde (`ensureQueryData`) rend sans
 * rappeler l'API une `moi` déjà en cache, périmée ou non, jusqu'à sa collecte (5 minutes après la dernière lecture) : seule
 * une 401 vue par ailleurs, ou la déconnexion, doit vider cette clé (F21, parcours « Entrer »).
 */
export const moiOptions = queryOptions({
  queryKey: ['moi'],
  queryFn: ({ signal }) => lit(client.GET('/api/v1/me', { signal })),
  staleTime: 60_000,
})

/** Suspend jusqu'à la réponse : à appeler sous une route dont la frontière d'erreur attrape l'échec. */
export function useMoi() {
  return useSuspenseQuery(moiOptions)
}
