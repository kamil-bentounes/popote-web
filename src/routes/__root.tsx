import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, HeadContent, Outlet, useRouterState } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { ErreurRoute } from '../etats/ErreurRoute'
import { NonTrouvee } from '../etats/NonTrouvee'
import { Transverses } from '../etats/Transverses'
import { navigation } from '../textes/navigation'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  // Le titre par défaut, pour toute page sans titre propre (la page « introuvable ») : `index.html` n'en a plus.
  head: () => ({ meta: [{ title: navigation.titreAccueil }] }),
  component: Racine,
  errorComponent: ErreurRoute,
  notFoundComponent: NonTrouvee,
})

/**
 * Quand le CHEMIN change (pas un simple paramètre de recherche ou fragment, pas au premier chargement),
 * le focus passe au contenu : sans cela, après une navigation, un lecteur d'écran reste sur le lien
 * cliqué (WCAG 2.4.3). On suit le chemin RÉSOLU (`resolvedLocation`) : `location` change dès le début
 * de la navigation, alors que l'ancien contenu est encore à l'écran quand un chargement est lent.
 */
function useFocusAuChangementDeChemin(chemin: string | undefined) {
  const precedent = useRef<string | null>(null)
  useEffect(() => {
    if (chemin === undefined) return
    if (precedent.current !== null && precedent.current !== chemin) {
      document.getElementById('contenu')?.focus()
    }
    precedent.current = chemin
  }, [chemin])
}

function Racine() {
  const chemin = useRouterState({ select: (etat) => etat.resolvedLocation?.pathname })
  useFocusAuChangementDeChemin(chemin)
  return (
    <>
      <HeadContent />
      <div id="coque">
        <a
          className="evitement"
          href="#contenu"
          onClick={(evenement) => {
            evenement.preventDefault()
            document.getElementById('contenu')?.focus()
          }}
        >
          {navigation.allerAuContenu}
        </a>
        <main id="contenu" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
      <Transverses />
    </>
  )
}
