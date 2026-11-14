import { useEffect, useRef, type RefObject } from 'react'

/**
 * Le focus de l'écran de réveil. À l'ouverture il va au titre (la coque devient inerte, il ne doit pas rester sur un élément
 * masqué : WCAG 2.4.11) ; à la fermeture il retourne à l'élément qui l'avait, ou à `#contenu` s'il n'existe plus. On retient
 * le dernier élément focalisé par `focusin` plutôt que de lire `document.activeElement` à l'ouverture : le navigateur peut
 * avoir déjà retiré le focus d'un élément devenu inerte, et la lecture dépendrait alors de l'ordre des effets.
 */
export function useFocusDuReveil(actif: boolean, titre: RefObject<HTMLElement | null>) {
  const dernier = useRef<HTMLElement | null>(null)
  const etaitActif = useRef(false)

  useEffect(() => {
    // Seul un changement d'état déplace le focus : le premier rendu, ou le double effet de StrictMode, n'y touche pas.
    if (actif === etaitActif.current) return
    etaitActif.current = actif
    if (actif) {
      titre.current?.focus()
      return
    }
    const cible = dernier.current
    if (cible?.isConnected && !cible.closest('[inert]')) cible.focus()
    else document.getElementById('contenu')?.focus()
  }, [actif, titre])

  useEffect(() => {
    if (actif) return
    const retient = (evenement: FocusEvent) => {
      if (evenement.target instanceof HTMLElement) dernier.current = evenement.target
    }
    document.addEventListener('focusin', retient)
    return () => document.removeEventListener('focusin', retient)
  }, [actif])
}
