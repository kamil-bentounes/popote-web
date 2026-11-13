import { createFileRoute, redirect } from '@tanstack/react-router'
import { ErreurRoute } from '../etats/ErreurRoute'
import { navigation } from '../textes/navigation'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/entrer', replace: true })
  },
  head: () => ({ meta: [{ title: navigation.titreAccueil }] }),
  errorComponent: ErreurRoute,
})
