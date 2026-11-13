import { createFileRoute } from '@tanstack/react-router'
import { ErreurRoute } from '../etats/ErreurRoute'
import { NonTrouvee } from '../etats/NonTrouvee'
import { navigation } from '../textes/navigation'

// Toute adresse qu'aucune autre route ne reconnaît : une page « introuvable » qui a son propre titre
// (WCAG 2.4.2). Le `notFoundComponent` de la racine reste pour un `notFound()` levé par un chargeur.
export const Route = createFileRoute('/$')({
  component: NonTrouvee,
  head: () => ({ meta: [{ title: navigation.titreIntrouvable }] }),
  errorComponent: ErreurRoute,
})
