import type { Section } from '../section'

// [nom du jeton, légende, texte clair sur ce fond ?] : le blanc n'est permis que sur les deux foncées (règle 3 du système).
const NUANCES: Array<[string, string, boolean]> = [
  ['creme', 'crème', false], ['papier', 'papier', false], ['encre', 'encre', true], ['menthe', 'menthe', false],
  ['jaune', 'jaune', false], ['tomate', 'tomate', false], ['ciel', 'ciel', false], ['rose', 'rose', false],
  ['tomate-fonce', 'tomate foncée', true], ['ciel-fonce', 'ciel foncé', true], ['menthe-pale', 'menthe pâle', false],
  ['jaune-pale', 'jaune pâle', false], ['rose-pale', 'rose pâle', false], ['tomate-pale', 'tomate pâle', false],
  ['lilas-pale', 'lilas pâle', false],
]

export const section: Section = {
  reference: 'Couleurs',
  colonne: 150,
  cas: NUANCES.map(([jeton, legende, clair]) => ({
    legende,
    reference: legende, // la pastille de la référence a pour légende son texte
    rendu: (
      <div className="nuance" style={{ background: `var(--color-${jeton})`, color: clair ? 'var(--color-papier)' : undefined }}>
        {legende}
      </div>
    ),
  })),
}
