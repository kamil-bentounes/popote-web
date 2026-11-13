import { Link } from '@tanstack/react-router'
import { navigation } from '../textes/navigation'

/** La page « introuvable », rendue dans la coque. Provisoire : F19 en remplace le contenu. */
export function NonTrouvee() {
  return (
    <section>
      <h1>{navigation.introuvable}</h1>
      <p>{navigation.introuvableAide}</p>
      <Link to="/">{navigation.retourAccueil}</Link>
    </section>
  )
}
