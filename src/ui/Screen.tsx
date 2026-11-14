import type { HTMLAttributes } from 'react'
import { classes } from './classes'

/**
 * Un écran : le conteneur d'un parcours, sur le fond crème. Un `div`, pas un `main` : la racine (`routes/__root.tsx`) a déjà
 * `<main id="contenu">`, et un second créerait des repères en double (WCAG 1.3.1). La zone sûre des téléphones et la hauteur
 * de l'écran sont déjà celles du `body` (`base.css`) : les redoubler ici doublerait les marges. La mise en page d'un écran est
 * celle de son parcours ; l'écran arrive par ses éléments (`Enter`), le premier sans attendre. Limite : pas de `ref` (à ajouter
 * quand un parcours en a besoin).
 */
export function Screen({ className, ...reste }: HTMLAttributes<HTMLDivElement>) {
  return <div {...reste} className={classes('bg-creme', className)} />
}
