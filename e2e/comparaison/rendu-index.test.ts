import { describe, expect, it } from 'vitest'
import { renduIndex, type DonneesProjet } from './rendu-index.ts'

const mesure = (largeur: number, hauteur: number) => ({ largeur, hauteur, image: 'x.png' })
const donnees = (...ecarts: Array<[number, number]>): DonneesProjet => ({
  projet: 'pc',
  paires: ecarts.map(([dl, dh], i) => ({ section: 'Bouton', legende: `Cas ${i}`, legendeReference: 'Principal, au repos', reference: mesure(200, 60), banc: mesure(200 + dl, 60 + dh) })),
  sansPendant: [],
  nonPortees: ['La marmite'],
})

describe('renduIndex', () => {
  it('une ligne par paire, les deux images côte à côte, et les dimensions', () => {
    const html = renduIndex([donnees([0, 0], [0, 0], [0, 0])])
    expect(html.match(/<tr class="paire/g)).toHaveLength(3)
    expect(html.match(/<img /g)).toHaveLength(6)
    expect(html).toContain('200 × 60')
  })

  it('pose un repère rouge au-delà de 2 px dans un sens, pas à 2 px', () => {
    expect(renduIndex([donnees([2, -2])])).not.toContain('class="paire ecart"')
    expect(renduIndex([donnees([0, 3])])).toContain('class="paire ecart"')
    expect(renduIndex([donnees([-3, 0])])).toContain('class="paire ecart"')
  })

  it('écrit « écart » en toutes lettres sur une ligne qui dépasse (la couleur seule ne suffit pas), et la légende de la référence appariée', () => {
    const html = renduIndex([donnees([0, 0], [0, 5])])
    expect(html.match(/ÉCART/g)).toHaveLength(1)
    expect(html.match(/Principal, au repos/g)).toHaveLength(2)
  })

  it('échappe le HTML de tout texte (légende, section, projet, listes), et nomme les sections pas encore portées', () => {
    const d = donnees([0, 0])
    const piege = '<img src=x onerror=1>'
    Object.assign(d.paires[0]!, { legende: piege, section: piege, legendeReference: piege })
    Object.assign(d, { projet: piege, sansPendant: [piege], nonPortees: ['La marmite', piege] })
    const html = renduIndex([d])
    expect(html).not.toContain('<img src=x')
    expect(html).toContain('&lt;img src=x')
    expect(html).toContain('La marmite')
  })
})
