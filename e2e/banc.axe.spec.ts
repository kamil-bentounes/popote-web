import AxeBuilder from '@axe-core/playwright'
import { test, expect } from './garde.ts'
import { ouvreLeBanc, titresDesSections } from './banc.ts'

const BALISES = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

// Le contraste est inclus : c'est ici, dans un vrai navigateur, qu'il se mesure (happy-dom n'a pas de mise en page). Deux
// passes : avec et sans mouvement réduit, qui change ce que le système dessine (`composants.css`, fin du fichier).
for (const mouvement of ['no-preference', 'reduce'] as const) {
  test(`axe ne trouve aucune violation WCAG A et AA dans chaque section (mouvement : ${mouvement})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: mouvement })
    await ouvreLeBanc(page)
    const violations: string[] = []
    for (const titre of await titresDesSections(page)) {
      const { violations: trouvees } = await new AxeBuilder({ page }).include(`[data-section="${titre}"]`).withTags(BALISES).analyze()
      violations.push(...trouvees.map((v) => `${titre} : ${v.id} (${v.nodes.map((n) => n.target.join(' ')).join(' ; ')})`))
    }
    expect(violations).toEqual([])
  })
}

test('axe voit le contraste : un texte pâle sur la menthe est relevé (garde de la garde)', async ({ page }) => {
  await ouvreLeBanc(page)
  await page.locator('[data-section="Paires texte et fond"] .bouton').first().evaluate((bouton) => {
    // Pas la même couleur que le fond : axe laisse « incomplet » (non violé) un rapport de 1:1.
    ;(bouton as HTMLElement).style.color = 'var(--color-jaune-pale)'
  })
  const { violations } = await new AxeBuilder({ page }).include('[data-section="Paires texte et fond"]').withTags(BALISES).analyze()
  expect(violations.map((v) => v.id)).toContain('color-contrast')
})
