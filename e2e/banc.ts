import type { Page } from '@playwright/test'

/** Ouvre le banc SANS `?fige` (voir `src/banc/main.tsx`), polices chargées et animations finies : axe mesure un état posé. */
export async function ouvreLeBanc(page: Page): Promise<void> {
  await page.goto('/banc')
  await page.locator('[data-section]').first().waitFor()
  await page.evaluate(() => document.fonts.ready)
  await attendLeRepos(page)
}

/** Attend la fin des animations et des transitions finies (le halo d'un bouton y passe 90 ms) : on mesure un état posé. */
export async function attendLeRepos(page: Page): Promise<void> {
  await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished)))
}

export async function titresDesSections(page: Page): Promise<string[]> {
  return page.locator('[data-section]').evaluateAll((sections) => sections.map((s) => s.getAttribute('data-section') ?? ''))
}

/** Appuie sur Tab jusqu'à ce que l'élément focalisé corresponde (le focus « visible » ne vient que du clavier). */
export async function tabJusqua(page: Page, selecteur: string): Promise<void> {
  for (let appui = 0; appui < 60; appui++) {
    await page.keyboard.press('Tab')
    if (await page.evaluate((s) => document.activeElement?.matches(s) ?? false, selecteur)) return
  }
  throw new Error(`Tab n'atteint jamais ${selecteur}`)
}

/** Les contrôles que la règle 10 du système veut touchables (44 px) ; les désactivés ne reçoivent ni clic ni focus. */
export const CONTROLES = 'button:not(:disabled), a[href], input:not(:disabled), select, textarea, [role=button], summary'
