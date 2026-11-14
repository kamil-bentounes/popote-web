import type { Section } from '../section'
import { Steps } from '../../ui/Steps'

/** Le suivi de la section « Bloc, pastille, tampon, avatar » de `reference.html` (légende « Suivi en trois étapes »), et ses variantes sans pendant. */
export const section: Section = {
  reference: 'Bloc, pastille, tampon, avatar',
  cas: [
    {
      legende: 'Suivi en trois étapes',
      reference: 'Suivi',
      rendu: (
        <Steps
          name="Suivi de l’invitation"
          steps={[
            { label: 'Envoyée', done: true },
            { label: 'Ouverte', done: true },
            { label: 'Arrivée', done: false },
          ]}
        />
      ),
    },
    {
      legende: 'Suivi : rien de fait, puis tout fait, à quatre étapes',
      rendu: (
        <>
          <Steps
            name="Suivi du repas, avant"
            steps={[{ label: 'Choisi', done: false }, { label: 'Acheté', done: false }, { label: 'Cuisiné', done: false }, { label: 'Mangé', done: false }]}
          />
          <Steps
            name="Suivi du repas, après"
            steps={[{ label: 'Choisi', done: true }, { label: 'Acheté', done: true }, { label: 'Cuisiné', done: true }, { label: 'Mangé', done: true }]}
          />
        </>
      ),
    },
  ],
}
