import type { Section } from '../section'
import { Button } from '../../ui/Button'
import { LinkButton } from '../../ui/LinkButton'

/** La section « Bouton » de `reference.html` : le bouton, le petit bouton et les deux liens d'action. */
export const section: Section = {
  reference: 'Bouton',
  // F10 porte le bouton à maintenir (sa légende commence par « À maintenir ») et retire cette ligne.
  reportees: ['À maintenir'],
  cas: [
    { legende: 'Principal, au repos', reference: 'Principal, au repos', rendu: <Button>Continuer</Button> },
    { legende: 'Appuyé (:active)', reference: 'Appuyé', rendu: <Button data-appuye>Continuer</Button> },
    { legende: 'Occupé (aria-busy)', reference: 'Occupé', rendu: <Button busy>Un instant</Button> },
    { legende: 'Désactivé', reference: 'Désactivé', rendu: <Button disabled>Continuer</Button> },
    { legende: 'Jaune', reference: 'Jaune', rendu: <Button variant="jaune">Envoyer l’invitation</Button> },
    { legende: 'Blanc', reference: 'Blanc', rendu: <Button variant="blanc">Recevoir un code</Button> },
    { legende: 'Danger', reference: 'Danger', rendu: <Button variant="danger">Supprimer</Button> },
    {
      legende: 'Petit bouton, lien, lien de danger',
      reference: 'Petit bouton, lien, lien de danger',
      rendu: (
        <div className="rangee">
          <Button variant="blanc" size="petit">Renvoyer</Button>
          <LinkButton>Annuler</LinkButton>
          <LinkButton variant="danger">Quitter Popote</LinkButton>
        </div>
      ),
    },
    // Sans pendant dans la référence : le bouton en pause (aria-disabled, focalisable) du compte à rebours de F20.
    { legende: 'En pause (aria-disabled), focalisable', rendu: <Button pause>Renvoyer dans 30 s</Button> },
  ],
}
