import { createFileRoute } from '@tanstack/react-router'
import { cheminSur } from '../api/chemin-sur'
import { ErreurRoute } from '../etats/ErreurRoute'
import { navigation } from '../textes/navigation'

export const Route = createFileRoute('/entrer')({
  // Le validateur ne rend que ces deux paramètres, et un `retour` qui n'est qu'un chemin de l'appli. Le routeur recopie pourtant
  // les paramètres inconnus dans `search` : lire `retour` par `Route.useSearch()`, jamais par `location.search` (brut).
  validateSearch: (recherche: Record<string, unknown>): { retour?: string; raison?: 'expiree' } => ({
    retour: cheminSur(recherche.retour),
    raison: recherche.raison === 'expiree' ? 'expiree' : undefined,
  }),
  // L'écran d'attente du parcours 1 : le parcours « Entrer » le remplacera.
  component: () => <h1>{navigation.entrerAttente}</h1>,
  head: () => ({ meta: [{ title: navigation.titreEntrer }] }),
  errorComponent: ErreurRoute,
})
