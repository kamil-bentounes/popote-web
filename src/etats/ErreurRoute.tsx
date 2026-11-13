import { Link, useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { navigation } from '../textes/navigation'
import { estEchecDeChargementDeModule } from './chargement-module'

/**
 * La frontière d'erreur de chaque route. Provisoire : F19 en remplace le contenu sans toucher aux
 * routes. Jamais `error.message` ni la pile à l'écran (souvent en anglais, parfois technique). Le
 * journal de l'erreur n'est pas ici : le routeur et React la consignent déjà, et F19 posera la
 * référence à communiquer.
 */
export function ErreurRoute({ error }: ErrorComponentProps) {
  const routeur = useRouter()
  const reessayer = () => {
    if (estEchecDeChargementDeModule(error)) location.reload()
    else void routeur.invalidate()
  }
  return (
    <section>
      {/* Seul le message est annoncé : les boutons ne font pas partie de l'alerte. */}
      <div role="alert">
        <h1>{navigation.erreurTitre}</h1>
        <p>{navigation.erreurAide}</p>
      </div>
      <button type="button" onClick={reessayer}>
        {navigation.reessayer}
      </button>{' '}
      <Link to="/">{navigation.retourAccueil}</Link>
    </section>
  )
}
