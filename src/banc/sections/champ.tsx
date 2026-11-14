import type { Section } from '../section'
import { Field } from '../../ui/Field'

/** La section « Champ et cases de code » de `reference.html` : le champ ; F11 y ajoute les cases du code. */
export const section: Section = {
  reference: 'Champ et cases de code',
  // F11 porte les trois états des cases du code et retire cette ligne.
  reportees: ['En cours de saisie', 'Juste', 'Faux'],
  cas: [
    {
      legende: 'Au repos, avec une aide',
      reference: 'Au repos, avec une aide',
      rendu: <Field label="Ton e-mail" type="email" placeholder="toi@exemple.fr" autoComplete="email" aide="Un code part vers cette adresse." />,
    },
    {
      legende: 'En erreur',
      // La référence écrit le message d'erreur comme légende du cas.
      reference: 'Il manque la fin de l’adresse',
      rendu: <Field label="Ton e-mail" type="email" defaultValue="lea@exemple" autoComplete="email" erreur="Il manque la fin de l’adresse, après le point." />,
    },
    { legende: 'Désactivé', reference: 'Désactivé', rendu: <Field label="Ton prénom" defaultValue="Léa" autoComplete="given-name" disabled /> },
  ],
}
