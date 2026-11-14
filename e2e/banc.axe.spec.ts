import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { test, expect } from './garde.ts'
import { ouvreLeBanc, tabJusqua, titresDesSections } from './banc.ts'

const BALISES = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

/*
 * Axe ne tranche pas toujours : un fond en dégradé ou un recouvrement rend le contraste « incomplet » (ni réussi ni violé).
 * Un test qui ne lit que les violations resterait vert si un contraste cessait d'être mesuré : on compte donc aussi les
 * réussites et on borne les incomplets. Admis aujourd'hui, tous dans la scène du soleil (un décor de 700 px dont axe lit la
 * boîte sans le rognage de la scène) : le titre de la section, le texte posé sur le soleil (dégradé), sa légende, et le titre
 * de la section qui suit. À relever seulement avec une raison écrite ; ces paires se jugent à l'œil.
 */
const INCOMPLETS_ADMIS = 4
const REUSSITES_MIN = 90

async function mesure(page: Page, include: string) {
  const { violations, incomplete, passes } = await new AxeBuilder({ page }).include(include).withTags(BALISES).analyze()
  const contraste = (liste: typeof passes) => liste.filter((r) => r.id === 'color-contrast').flatMap((r) => r.nodes)
  return { violations, incompletsContraste: contraste(incomplete).length, reussitesContraste: contraste(passes).length }
}

// Le contraste est inclus : c'est ici, dans un vrai navigateur, qu'il se mesure (happy-dom n'a pas de mise en page). Deux
// passes : avec et sans mouvement réduit, qui change ce que le système dessine (`composants.css`, fin du fichier).
for (const mouvement of ['no-preference', 'reduce'] as const) {
  test(`axe ne trouve aucune violation WCAG A et AA dans chaque section, et mesure le contraste (mouvement : ${mouvement})`, async ({ page }) => {
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
    expect(incomplets, 'contrastes qu’axe ne tranche pas : voir INCOMPLETS_ADMIS').toBeLessThanOrEqual(INCOMPLETS_ADMIS)
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
