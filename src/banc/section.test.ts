import { describe, expect, it } from 'vitest'
import { fusionne, titreDe, type Section } from './section'

const cas = (legende: string) => ({ legende, rendu: null })

describe('fusionne', () => {
  it('réunit les fichiers qui désignent le même titre, cas dans l’ordre reçu', () => {
    const sections: Section[] = [
      { reference: 'Bloc, pastille, tampon, avatar', cas: [cas('Bloc')] },
      { reference: 'Couleurs', cas: [cas('crème')] },
      { reference: 'Bloc, pastille, tampon, avatar', cas: [cas('Tampon'), cas('Avatars')] },
    ]
    expect(fusionne(sections)).toEqual([
      { titre: 'Bloc, pastille, tampon, avatar', reference: 'Bloc, pastille, tampon, avatar', cas: [cas('Bloc'), cas('Tampon'), cas('Avatars')] },
      { titre: 'Couleurs', reference: 'Couleurs', cas: [cas('crème')] },
    ])
  })

  it('nomme une section sans pendant par son titre, et ne la mêle pas à une section de référence', () => {
    const sansPendant: Section = { titre: 'Anneaux de focus', cas: [cas('Bouton')] }
    expect(titreDe(sansPendant)).toBe('Anneaux de focus')
    expect(titreDe({ reference: 'Couleurs', cas: [] })).toBe('Couleurs')
    expect(fusionne([sansPendant, { reference: 'Couleurs', cas: [cas('crème')] }]).map((s) => s.titre)).toEqual(['Anneaux de focus', 'Couleurs'])
  })

  it('garde la section de la référence qui sert à l’appariement, même sous un autre titre ; rien pour une section sans pendant', () => {
    const [nuances, sansPendant] = fusionne([{ reference: 'Couleurs', titre: 'Nuances', cas: [] }, { titre: 'Anneaux de focus', cas: [] }])
    expect(nuances).toEqual({ titre: 'Nuances', reference: 'Couleurs', cas: [] })
    expect(sansPendant?.reference).toBeUndefined()
  })

  it('un titre explicite l’emporte sur la référence', () => {
    expect(titreDe({ reference: 'Couleurs', titre: 'Nuances', cas: [] })).toBe('Nuances')
  })
})
