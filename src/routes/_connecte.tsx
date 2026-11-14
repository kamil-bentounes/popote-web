import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { ErreurApi } from '../api/erreurs'
import { cheminSur } from '../api/chemin-sur'
import { moiOptions } from '../api/ressources/moi'
import { ErreurRoute } from '../etats/ErreurRoute'
import { navigation } from '../textes/navigation'

/**
 * La porte des écrans connectés : une route sans chemin dont toute route enfant a besoin d'une session. Elle lit `moi` ; seule
 * une `401` (pas de session) renvoie à « Entrer », avec la page demandée en `retour`. Toute autre panne (503, réseau, 403…)
 * remonte à la frontière de la route : une personne connectée dont l'API est en panne n'a pas à se reconnecter.
 * Elle fait confiance à `moi` déjà en cache (voir `moi.ts`) : vider `['moi']` à la déconnexion et sur `non-authentifie` est à F21.
 */
export const Route = createFileRoute('/_connecte')({
  beforeLoad: async ({ context, location }) => {
    try {
      await context.queryClient.ensureQueryData(moiOptions)
    } catch (erreur) {
      // Le chemin et la requête, jamais l'URL absolue ni le fragment : `cheminSur` refuse tout le reste.
      if (erreur instanceof ErreurApi && erreur.status === 401) {
        throw redirect({ to: '/entrer', search: { retour: cheminSur(location.pathname + location.searchStr) } })
      }
      throw erreur
    }
  },
  component: Outlet,
  head: () => ({ meta: [{ title: navigation.titreAccueil }] }),
  errorComponent: ErreurRoute,
})
