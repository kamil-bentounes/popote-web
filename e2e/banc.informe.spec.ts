import { test, expect } from './garde.ts'
import { CONTROLES, ouvreLeBanc } from './banc.ts'

const SECTION = '[data-section="Bloc, pastille, tampon, avatar"]'

/** Le rapport de contraste WCAG de deux couleurs `rgb(r, g, b)` lues dans le style calculé. */
function rapport(premiere: string, seconde: string): number {
  const luminance = (rgb: string) => {
    const [r, g, b] = (rgb.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map((c) => Number(c) / 255)
    const lin = (c = 0) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  }
  const [a, b] = [luminance(premiere), luminance(seconde)]
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

// Axe ne mesure pas le « + » de la place libre : un signe seul n'est pas du texte pour lui (ni réussi ni incomplet). On le mesure ici,
// tel que Chromium le dessine : c'est un signe qu'il faut voir (WCAG 1.4.11, 3:1) ; on exige 4,5:1, comme le gris sur papier du texte.
test('le « + » de la place libre tient 4,5:1 sur son fond, tel que Chromium le dessine', async ({ page }) => {
  await ouvreLeBanc(page)
  const place = page.locator(`${SECTION} .avatar--libre`)
  await expect(place).toHaveCount(1)
  const { couleur, fond } = await place.evaluate((noeud) => {
    const style = getComputedStyle(noeud)
    return { couleur: style.color, fond: style.backgroundColor }
  })
  // Le signe est bien là (axe ne le voit pas : sans lui, le test mesurerait un cercle vide). Les deux couleurs sont opaques ici ; un fond
  // `transparent` serait lu comme noir par `rapport`, qui ignore l'alpha.
  await expect(place).toHaveText('+')
  expect(rapport(couleur, fond)).toBeGreaterThanOrEqual(4.5)
})

test('la pastille, l’avatar et la bulle ne se touchent pas : aucun n’est un contrôle, aucun n’entre dans l’ordre du clavier', async ({ page }) => {
  await ouvreLeBanc(page)
  // Les sections des composants seulement : « Anneaux de focus » montre des avatars qui SONT des boutons (le halo de F7).
  const informent = page.locator(`${SECTION} :is(.pastille, .avatar), [data-section="Bulle"] .bulle`)
  expect(await informent.count(), 'le banc montre des pastilles, des avatars et des bulles').toBeGreaterThanOrEqual(12)
  const fautifs = await informent.evaluateAll((noeuds, controles) => {
    return noeuds
      .filter((n) => n.matches(controles) || (n as HTMLElement).tabIndex >= 0)
      .map((n) => n.outerHTML.slice(0, 70))
  }, CONTROLES)
  expect(fautifs).toEqual([])
})
