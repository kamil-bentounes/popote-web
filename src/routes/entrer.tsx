import { createFileRoute } from '@tanstack/react-router'
import { ErreurRoute } from '../etats/ErreurRoute'
import { navigation } from '../textes/navigation'

export const Route = createFileRoute('/entrer')({
  // L'écran d'attente du parcours 1 : le parcours « Entrer » le remplacera.
  component: () => <h1>{navigation.entrerAttente}</h1>,
  head: () => ({ meta: [{ title: navigation.titreEntrer }] }),
  errorComponent: ErreurRoute,
})
