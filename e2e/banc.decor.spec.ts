import { test, expect } from './garde.ts'
import { CONTROLES, ouvreLeBanc } from './banc.ts'

const SCENES = '[data-section="Décor"] [data-decor]'

test('le soleil et le sol sont décoratifs : cachés, hors du clavier, sans contrôle', async ({ page }) => {
  await ouvreLeBanc(page)
  await expect(page.locator(SCENES)).toHaveCount(3)
  const decors = page.locator(`${SCENES} :is(.soleil, .sol)`)
  expect(await decors.count()).toBe(6)
  const fautifs = await decors.evaluateAll((noeuds, controles) => {
    return noeuds
      .filter((n) => n.getAttribute('aria-hidden') !== 'true' || n.matches(controles) || (n as HTMLElement).tabIndex >= 0 || n.hasAttribute('role'))
      .map((n) => n.outerHTML.slice(0, 70))
  }, CONTROLES)
  expect(fautifs).toEqual([])
})

test('le texte d’une scène est au-dessus de son soleil et de son sol, et le sol recouvre le soleil', async ({ page }) => {
  await ouvreLeBanc(page)
  const scenes = page.locator(SCENES)
  for (let rang = 0; rang < 3; rang++) {
    const scene = scenes.nth(rang)
    await scene.scrollIntoViewIfNeeded()
    const dessus = await scene.evaluate((noeud) => {
      const cadre = noeud.getBoundingClientRect()
      const x = cadre.left + cadre.width / 2
      const qui = (y: number) => document.elementFromPoint(x, y)
      const titre = noeud.querySelector('.titre')!.getBoundingClientRect()
      return {
        titre: noeud.querySelector('.titre')!.contains(qui(titre.top + titre.height / 2)),
        // 6 px sous le haut du sol (190 px), au-dessus du texte (214 px) : on y voit le sol, non le soleil qui passe dessous.
        sol: qui(cadre.top + 190 + 6)?.classList.contains('sol') ?? false,
      }
    })
    expect(dessus, `scène ${rang}`).toEqual({ titre: true, sol: true })
  }
})

for (const mouvement of ['no-preference', 'reduce'] as const) {
  test(`le soleil tourne, sauf en mouvement réduit (mouvement : ${mouvement})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: mouvement })
    await ouvreLeBanc(page)
    const nom = await page.locator(`${SCENES} .soleil`).first().evaluate((s) => getComputedStyle(s).animationName)
    expect(nom).toBe(mouvement === 'reduce' ? 'none' : 'tourne')
  })
}
