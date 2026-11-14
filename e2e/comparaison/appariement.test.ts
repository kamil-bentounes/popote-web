import { describe, expect, it } from 'vitest'
import { apparie, normalise, slug, type SectionBanc, type SectionReference } from './appariement.ts'

const reference: SectionReference[] = [
  {
    titre: 'Couleurs',
    elements: [
      { legende: 'tomate', genre: 'nuance', rang: 0 },
      { legende: 'tomate foncée', genre: 'nuance', rang: 1 },
    ],
  },
  { titre: 'Bouton', elements: [{ legende: 'Principal, au repos', genre: 'cas', rang: 2 }] },
]
const banc = (sections: SectionBanc[]) => apparie(reference, sections)

describe('normalise', () => {
  it('ignore la casse et les espaces multiples, pas les mots', () => {
    expect(normalise('  Principal,   AU repos ')).toBe(normalise('principal, au repos'))
    expect(normalise('Principal, au repos')).not.toBe(normalise('Principal, en repos'))
  })
})

describe('slug', () => {
  it('rend un nom de fichier sans accent ni ponctuation, jamais vide', () => {
    expect(slug('Décor, bulle, entrée d’écran')).toBe('decor-bulle-entree-d-ecran')
    expect(slug('???')).toBe('x')
  })
})

describe('apparie', () => {
  it('apparie par début de légende, et l’égalité exacte l’emporte sur le début (« tomate » et « tomate foncée »)', () => {
    const { paires, erreurs } = banc([{ titre: 'Couleurs', reference: 'Couleurs', cas: [
      { legende: 'tomate', reference: 'tomate' },
      { legende: 'tomate foncée', reference: 'Tomate  foncée' },
    ] }])
    expect(erreurs).toEqual([])
    expect(paires.map((p) => [p.legende, p.reference.rang])).toEqual([['tomate', 0], ['tomate foncée', 1]])
  })

  it('refuse un début qui désigne plusieurs légendes', () => {
    const { erreurs } = banc([{ titre: 'Couleurs', reference: 'Couleurs', cas: [{ legende: 'tom', reference: 'tom' }] }])
    expect(erreurs.join('\n')).toMatch(/« tom » désigne plusieurs légendes/)
  })

  it('refuse une référence qui ne désigne aucune légende, et une section qui n’existe pas dans la référence', () => {
    const { erreurs } = banc([
      { titre: 'Couleurs', reference: 'Couleurs', cas: [{ legende: 'vert', reference: 'vert' }] },
      { titre: 'Fantôme', reference: 'Fantôme', cas: [] },
    ])
    expect(erreurs.join('\n')).toMatch(/« vert » ne désigne aucune légende/)
    expect(erreurs.join('\n')).toMatch(/aucune section de reference.html ne s’appelle « Fantôme »/)
  })

  it('refuse deux cas de même légende dans une section, et deux cas qui désignent la même légende', () => {
    const { erreurs } = banc([{ titre: 'Bouton', reference: 'Bouton', cas: [
      { legende: 'A', reference: 'Principal' }, { legende: 'A', reference: 'Principal, au' },
    ] }])
    expect(erreurs.join('\n')).toMatch(/deux cas de la section « Bouton » portent la légende « A »/)
    expect(erreurs.join('\n')).toMatch(/même légende de la référence/)
  })

  it('signale une légende de la référence absente du banc, seulement dans une section déjà portée', () => {
    const { erreurs, nonPortees } = banc([{ titre: 'Couleurs', reference: 'Couleurs', cas: [{ legende: 'tomate', reference: 'tomate' }] }])
    expect(erreurs.join('\n')).toMatch(/« tomate foncée » de reference.html manque au banc/)
    expect(erreurs.join('\n')).not.toMatch(/Principal/)
    expect(nonPortees).toEqual(['Bouton'])
  })

  it('un cas sans `reference` est signalé sans pendant, sans échec ; une section sans pendant n’est pas comparée', () => {
    const { erreurs, sansPendant, paires } = banc([
      { titre: 'Anneaux de focus', cas: [{ legende: 'Bouton' }] },
      { titre: 'Bouton', reference: 'Bouton', cas: [{ legende: 'Au repos', reference: 'Principal' }, { legende: 'Sonde' }] },
    ])
    expect(erreurs).toEqual([])
    expect(sansPendant).toEqual(['Anneaux de focus / Bouton', 'Bouton / Sonde'])
    expect(paires).toHaveLength(1)
  })

  it('apparier par position donnerait un autre résultat : les cas arrivent dans le désordre', () => {
    const { paires } = banc([{ titre: 'Couleurs', reference: 'Couleurs', cas: [
      { legende: 'foncée', reference: 'tomate foncée' }, { legende: 'franche', reference: 'tomate' },
    ] }])
    expect(paires.map((p) => p.reference.legende)).toEqual(['tomate foncée', 'tomate'])
  })
})
