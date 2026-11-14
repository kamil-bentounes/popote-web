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

const ANNEAUX = ['Bouton', 'En pause (aria-disabled), focalisable', 'Champ', 'Lien', 'Cases du code', 'Avatar', 'Place libre']

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

test('le bouton occupé garde l’aspect du principal et son rond ; en pause, il prend celui du désactivé, sans rond, et reste au clavier', async ({ page }) => {
  await ouvreLeBanc(page)
  const bouton = (legende: string) => `[data-section="Bouton"] [data-cas="${legende}"] button`
  const style = (selecteur: string) =>
    page.locator(selecteur).evaluate((el) => ({
      fond: getComputedStyle(el).backgroundColor,
      couleur: getComputedStyle(el).color,
      rond: getComputedStyle(el, '::after').content,
    }))
  const principal = await style(bouton('Principal, au repos'))
  const desactive = await style(bouton('Désactivé'))
  const occupe = await style(bouton('Occupé (aria-busy)'))
  const pause = await style(bouton('En pause (aria-disabled), focalisable'))
  expect(principal.fond).not.toBe(desactive.fond)
  expect({ fond: occupe.fond, couleur: occupe.couleur }).toEqual({ fond: principal.fond, couleur: principal.couleur })
  expect(occupe.rond).not.toBe('none') // le rond qui tourne
  expect({ fond: pause.fond, couleur: pause.couleur }).toEqual({ fond: desactive.fond, couleur: desactive.couleur })
  expect(pause.rond).toBe('none')
  // Occupé et en pause restent dans l'ordre du clavier (le focus ne saute pas pendant l'attente) : `tabJusqua` lève s'ils n'y sont pas.
  await tabJusqua(page, bouton('Occupé (aria-busy)'))
  await tabJusqua(page, bouton('En pause (aria-disabled), focalisable'))
})
