import { expect, test as base, type Page } from '@playwright/test'

/**
 * Relève ce qu'une page ne doit jamais produire : une violation de CSP, une erreur de console, une exception non
 * attrapée. Posée AVANT toute navigation : l'écouteur `securitypolicyviolation` est dans un script d'amorce.
 */
export async function surveille(page: Page): Promise<string[]> {
  const problemes: string[] = []
  await page.exposeFunction('signaleViolationCsp', (detail: string) => problemes.push(`CSP : ${detail}`))
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (evenement) => {
      const { violatedDirective, blockedURI, disposition } = evenement
      void (window as unknown as { signaleViolationCsp: (d: string) => void }).signaleViolationCsp(
        `${violatedDirective} ${blockedURI || 'en ligne'} (${disposition})`,
      )
    })
  })
  page.on('console', (message) => {
    if (message.type() === 'error') problemes.push(`console : ${message.text()}`)
  })
  page.on('pageerror', (erreur) => problemes.push(`exception : ${erreur.message}`))
  return problemes
}

/** `test` de nos e2e : en plus de `@playwright/test`, il échoue si la garde a relevé quelque chose. */
export const test = base.extend<{ problemes: string[] }>({
  problemes: [
    async ({ page }, use) => {
      const problemes = await surveille(page)
      await use(problemes)
      expect(problemes, 'violations de CSP, erreurs de console ou exceptions').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }
