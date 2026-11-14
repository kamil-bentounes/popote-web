import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { test, expect } from './garde.ts'
import { ouvreLeBanc, tabJusqua, titresDesSections } from './banc.ts'

const BALISES = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

/*
 * Axe ne tranche pas toujours : un fond en dégradé ou un recouvrement rend le contraste « incomplet » (ni réussi ni violé).
 * Un test qui ne lit que les violations resterait vert si un contraste cessait d'être mesuré : on compte donc aussi les
 * réussites et on borne les incomplets. Admis aujourd'hui, deux au plus, que l'on juge à l'œil : le texte posé sur le soleil de la
 * sonde du lien d'évitement (un dégradé), et, au téléphone seulement, la légende du tampon de la sonde des paires (cause non établie : le tampon
 * tourne, et c'est son voisinage qu'axe juge recouvert). Le soleil, de 700 px, déborde aussi de sa scène, et axe lit sa boîte sans le rognage : le texte
 * voisin lui paraissait « recouvert » (le titre et la légende de la scène ; F9 a vu l'aide et la légende du champ, juste au-dessus).
 * La scène a donc une marge (`.scene--sonde`, `banc.css`) qui tient le soleil à distance de tout autre texte, et la borne est
 * redescendue de 4 à 2. À relever seulement avec une raison écrite.
 */
// Au téléphone et sous WebKit (390 px) : le texte du soleil et la légende du tampon ; au PC : le texte du soleil seul.
const incompletsAdmis = (projet: string) => (projet === 'pc' ? 1 : 2)
const REUSSITES_MIN = 125

async function mesure(page: Page, include: string) {
  const { violations, incomplete, passes } = await new AxeBuilder({ page }).include(include).withTags(BALISES).analyze()
  const contraste = (liste: typeof passes) => liste.filter((r) => r.id === 'color-contrast').flatMap((r) => r.nodes)
  return { violations, incompletsContraste: contraste(incomplete).length, reussitesContraste: contraste(passes).length }
}

// Le contraste est inclus : c'est ici, dans un vrai navigateur, qu'il se mesure (happy-dom n'a pas de mise en page). Deux
// passes : avec et sans mouvement réduit, qui change ce que le système dessine (`composants.css`, fin du fichier).
for (const mouvement of ['no-preference', 'reduce'] as const) {
  test(`axe ne trouve aucune violation WCAG A et AA dans chaque section, et mesure le contraste (mouvement : ${mouvement})`, async ({ page }, info) => {
    await page.emulateMedia({ reducedMotion: mouvement })
    await ouvreLeBanc(page)
    const titres = await titresDesSections(page)
    expect(titres).toEqual(expect.arrayContaining(['Couleurs', 'Typographie', 'Anneaux de focus', 'Paires texte et fond']))
    const violations: string[] = []
    let incomplets = 0
    let reussites = 0
    for (const titre of titres) {
      const mesures = await mesure(page, `[data-section="${titre}"]`)
      violations.push(...mesures.violations.map((v) => `${titre} : ${v.id} (${v.nodes.map((n) => n.target.join(' ')).join(' ; ')})`))
      incomplets += mesures.incompletsContraste
      reussites += mesures.reussitesContraste
    }
    expect(violations).toEqual([])
    expect(incomplets, 'contrastes qu’axe ne tranche pas : voir incompletsAdmis').toBeLessThanOrEqual(incompletsAdmis(info.project.name))
    expect(reussites, 'contrastes mesurés et réussis').toBeGreaterThanOrEqual(REUSSITES_MIN)
  })
}

test('le lien d’évitement, hors cadre au repos, est mesuré une fois focalisé', async ({ page }) => {
  await ouvreLeBanc(page)
  await tabJusqua(page, '#lien-evitement')
  const mesures = await mesure(page, '#scene-evitement')
  expect(mesures.violations.map((v) => v.id)).toEqual([])
  expect(mesures.reussitesContraste, 'le texte du lien sur son papier est mesuré').toBeGreaterThanOrEqual(1)
})

test('axe voit le contraste : un texte pâle sur la menthe est relevé (garde de la garde)', async ({ page }) => {
  await ouvreLeBanc(page)
  await page.locator('[data-section="Paires texte et fond"] .bouton').first().evaluate((bouton) => {
    // Pas la même couleur que le fond : axe laisse « incomplet » un rapport de 1:1.
    ;(bouton as HTMLElement).style.color = 'var(--color-jaune-pale)'
  })
  const { violations } = await new AxeBuilder({ page }).include('[data-section="Paires texte et fond"]').withTags(BALISES).analyze()
  expect(violations.map((v) => v.id)).toContain('color-contrast')
})
