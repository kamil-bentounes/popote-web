import { createFileRoute } from '@tanstack/react-router'
import { ErreurRoute } from '../etats/ErreurRoute'
import { navigation } from '../textes/navigation'

// Provisoire : une route protégée pour que la garde ait une adresse à garder ; le hub la remplacera.
export const Route = createFileRoute('/_connecte/accueil')({
  component: () => <h1>{navigation.accueil}</h1>,
  head: () => ({ meta: [{ title: navigation.titreAccueilConnecte }] }),
  errorComponent: ErreurRoute,
})
