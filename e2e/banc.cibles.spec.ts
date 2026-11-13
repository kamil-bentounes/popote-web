import { test, expect } from './garde.ts'
import { CONTROLES, ouvreLeBanc } from './banc.ts'

/** Les exceptions à la cible de 44 px, une par une, avec leur raison. */
const EXCEPTIONS: Record<string, string> = {
  '.cases > .sr-seul': 'le champ réel des cases du code est caché : les cases dessinées sont ce qu’on touche (F11 en fait le conteneur touchable)',
}

test('chaque contrôle visible du banc mesure 44 × 44 px au moins (règle 10 du système)', async ({ page }) => {
  await ouvreLeBanc(page)
  const trop_petits = await page.locator(CONTROLES).evaluateAll((controles, exceptions) => {
    return controles
      .filter((c) => !exceptions.some((e) => c.matches(e)))
      .map((c) => ({ c, boite: c.getBoundingClientRect() }))
      .filter(({ boite }) => boite.width > 0 && (boite.width < 44 || boite.height < 44))
      .map(({ c, boite }) => `${c.outerHTML.slice(0, 70)} : ${Math.round(boite.width)} × ${Math.round(boite.height)}`)
  }, Object.keys(EXCEPTIONS))
  expect(trop_petits).toEqual([])
  // Le banc a bien des contrôles à mesurer : un sélecteur ou un chargement cassé ne doit pas rendre le test vide.
  expect(await page.locator(CONTROLES).count()).toBeGreaterThanOrEqual(12)
})

test('Tab parcourt les contrôles dans l’ordre du DOM, chacun a un indicateur de focus, Maj+Tab revient, aucun piège', async ({ page }) => {
  await ouvreLeBanc(page)
  const attendus = await page.locator(CONTROLES).evaluateAll((controles) => controles.map((c, i) => (c.setAttribute('data-rang', String(i)), i)))
  const rangFocalise = () => page.evaluate(() => {
    const actif = document.activeElement
    if (!actif || actif === document.body) return { rang: null, indicateur: false }
    const rang = actif.getAttribute('data-rang')
    // L'anneau peut être sur un ancêtre (`.cases:focus-within` autour du champ caché).
    let noeud: Element | null = actif
    while (noeud && noeud !== document.body) {
      const style = getComputedStyle(noeud)
      // L'anneau du système : plein et d'au moins 3 px. Le contour par défaut du navigateur (`auto`) ne compte pas.
      if (style.outlineStyle === 'solid' && parseFloat(style.outlineWidth) >= 3) return { rang: rang === null ? null : Number(rang), indicateur: true }
      noeud = noeud.parentElement
    }
    return { rang: rang === null ? null : Number(rang), indicateur: false }
  })

  const avant: Array<number | null> = []
  for (const rang of attendus) {
    await page.keyboard.press('Tab')
    const { rang: vu, indicateur } = await rangFocalise()
    avant.push(vu)
    expect(indicateur, `contrôle ${rang} sans indicateur de focus`).toBe(true)
  }
  expect(avant).toEqual(attendus)

  await page.keyboard.press('Tab')
  expect((await rangFocalise()).rang, 'Tab ne quitte pas le dernier contrôle : piège au clavier').not.toBe(attendus.at(-1))

  await page.locator(`[data-rang="${attendus.at(-1)}"]`).focus()
  const arriere: Array<number | null> = [attendus.at(-1) ?? null]
  for (let i = 1; i < attendus.length; i++) {
    await page.keyboard.press('Shift+Tab')
    arriere.push((await rangFocalise()).rang)
  }
  expect(arriere).toEqual([...attendus].reverse())
})
