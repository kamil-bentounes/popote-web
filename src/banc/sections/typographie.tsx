import type { Section } from '../section'

const TITRES: Array<[string, string]> = [
  ['titre-xl', 'Popote'], ['titre-l', 'Bienvenue, Léa !'], ['titre-m', 'Regarde tes mails'], ['titre-s', 'Lasagnes saumon-poireaux'],
]

export const section: Section = {
  reference: 'Typographie',
  colonne: 'pleine',
  cas: [
    {
      legende: 'Fredoka et Nunito',
      reference: 'Typographie', // un bloc seul : sa légende est le `h2` de sa section
      rendu: (
        <div className="bloc" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {TITRES.map(([taille, texte]) => (
            <span key={taille} className="titre" style={{ fontSize: `var(--text-${taille})` }}>{texte}</span>
          ))}
          <span>Texte courant : un code à 6 chiffres est parti vers ton adresse.</span>
          <span className="texte-doux" style={{ fontSize: 'var(--text-note)' }}>Note : il marche 10 minutes.</span>
        </div>
      ),
    },
  ],
}
