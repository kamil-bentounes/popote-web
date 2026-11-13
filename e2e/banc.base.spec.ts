import { test, expect } from './garde.ts'
import { attendLeRepos, ouvreLeBanc, tabJusqua } from './banc.ts'

test('le lien d’évitement focalisé reste au-dessus d’un soleil de 700 px (elementFromPoint)', async ({ page }) => {
  await ouvreLeBanc(page)
  await tabJusqua(page, '#lien-evitement')
  const points = await page.evaluate(() => {
    const lien = document.getElementById('lien-evitement')!
    const { left, top, width, height } = lien.getBoundingClientRect()
    const sur = (x: number, y: number) => document.elementFromPoint(x, y)?.closest('#lien-evitement') === lien
    // Les coins sont arrondis : on vise le milieu de chaque bord, en retrait du contour.
    const milieu = top + height / 2
    return { centre: sur(left + width / 2, milieu), bordGauche: sur(left + 12, milieu), bordDroit: sur(left + width - 12, milieu) }
  })
  expect(points).toEqual({ centre: true, bordGauche: true, bordDroit: true })
})

const ANNEAUX = ['Bouton', 'Champ', 'Lien', 'Cases du code', 'Avatar', 'Place libre']

for (const cas of ANNEAUX) {
  test(`anneau de focus au clavier : ${cas}, encre de 4 px cerné de jaune`, async ({ page }) => {
    await ouvreLeBanc(page)
    await tabJusqua(page, `[data-cas="${cas}"] :is(button, input)`)
    await attendLeRepos(page)
    const mesure = await page.evaluate(() => {
      const jeton = (nom: string) => {
        const sonde = document.createElement('i')
        sonde.style.color = `var(${nom})`
        document.body.append(sonde)
        const couleur = getComputedStyle(sonde).color
        sonde.remove()
        return couleur
      }
      const actif = document.activeElement!
      const porteur = actif.closest('.cases') ?? actif // l'anneau des cases est sur `.cases`, pas sur son champ caché
      const style = getComputedStyle(porteur)
      return { style: style.outlineStyle, largeur: style.outlineWidth, couleur: style.outlineColor, ombre: style.boxShadow, encre: jeton('--color-encre'), jaune: jeton('--color-jaune') }
    })
    expect({ style: mesure.style, largeur: mesure.largeur, couleur: mesure.couleur }).toEqual({ style: 'solid', largeur: '4px', couleur: mesure.encre })
    expect(mesure.ombre).toContain(`${mesure.jaune} 0px 0px 0px 11px`)
  })
}
