import type { Page } from '@playwright/test'

/**
 * Ouvre le banc, polices chargées et animations finies : on mesure un état posé. SANS `?fige` par défaut (voir
 * `src/banc/main.tsx`) : seule la comparaison le passe, `skipAnimations` cachant ce que Motion injecte à l'exécution.
 */
export async function ouvreLeBanc(page: Page, chemin = '/banc'): Promise<void> {
  await page.goto(chemin)
  await page.locator('[data-section]').first().waitFor()
  // Deux images d'abord : `fonts.ready` résout avant que la mise en page ait demandé les polices utilisées.
  await page.evaluate(() => new Promise((fini) => requestAnimationFrame(() => requestAnimationFrame(fini))))
  await page.evaluate(() => document.fonts.ready)
  await attendLeRepos(page)
}

/**
 * Attend la fin des animations et des transitions finies (le halo d'un bouton y passe 90 ms) : on mesure un état posé.
 * Une animation annulée en route ou mise en pause ne bloque ni ne fait échouer l'attente. Les animations que Motion pilote
 * par JavaScript n'y figurent pas : `Enter` annonce la fin de la sienne par `data-entree="arrive"`, `Stamp` par `data-tampon="arrive"`, que l'attente guette aussi
 * (précaution, non prouvée par un test : mi-fondu, un texte aurait un faux contraste pour axe). Les autres sections animées par Motion attendent leur propre fin.
 */
export async function attendLeRepos(page: Page): Promise<void> {
  await page.waitForFunction(() => document.querySelector('[data-entree="en-cours"], [data-tampon="en-cours"]') === null)
  await page.evaluate(() =>
    Promise.allSettled(
      document.getAnimations()
        .filter((a) => a.playState !== 'paused' && a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished),
    ),
  )
}

export async function titresDesSections(page: Page): Promise<string[]> {
  return page.locator('[data-section]').evaluateAll((sections) => sections.map((s) => s.getAttribute('data-section') ?? ''))
}

/** Appuie sur Tab jusqu'à ce que l'élément focalisé corresponde (le focus « visible » ne vient que du clavier). */
export async function tabJusqua(page: Page, selecteur: string): Promise<void> {
  // Au plus un tour de la page : la borne suit le nombre de contrôles, que les lots de composants font grandir.
  const tour = (await page.locator(CONTROLES).count()) + 1
  for (let appui = 0; appui < tour; appui++) {
    await page.keyboard.press('Tab')
    if (await page.evaluate((s) => document.activeElement?.matches(s) ?? false, selecteur)) return
  }
  throw new Error(`Tab n'atteint jamais ${selecteur}`)
}

/** Les contrôles que la règle 10 du système veut touchables (44 px) ; les désactivés ne reçoivent ni clic ni focus. */
export const CONTROLES = 'button:not(:disabled), a[href], input:not(:disabled), select, textarea, [role=button], summary'
