import { expect, test } from '@playwright/test'
import { surveille } from './garde.ts'
import { ouvreLeBanc } from './banc.ts'

// Le `test` de `@playwright/test`, pas celui de `garde.ts` : ce fichier teste la garde, il ne doit pas échouer parce
// qu'elle voit ce qu'il provoque exprès.

test('le banc répond sous une CSP en enforce, et /banc.html est redirigé en gardant la requête', async ({ request }) => {
  const banc = await request.get('/banc?fige')
  expect(banc.status()).toBe(200)
  expect(banc.headers()['content-security-policy']).toContain("script-src 'self'")
  expect(banc.headers()['content-security-policy-report-only']).toBeUndefined()
  const ancienne = await request.get('/banc.html?fige', { maxRedirects: 0 })
  expect(ancienne.status()).toBe(307)
  expect(ancienne.headers().location).toBe('/banc?fige')
})

test('le banc ne déclenche aucune violation de CSP, aucune erreur de console', async ({ page }) => {
  const problemes = await surveille(page)
  await ouvreLeBanc(page)
  expect(problemes).toEqual([])
})

test('la garde relève un style injecté et un appel vers un hôte tiers, tous deux bloqués', async ({ page }) => {
  const problemes = await surveille(page)
  await ouvreLeBanc(page)
  const bloque = await page.evaluate(async () => {
    const style = document.createElement('style')
    style.textContent = 'body { outline: 9px solid red; }'
    document.head.append(style)
    const tiers = await fetch('https://tiers.exemple.invalid/x').then(() => false, () => true)
    return { styleSansEffet: getComputedStyle(document.body).outlineStyle === 'none', tiers }
  })
  // `enforce` : le style n'a pas été appliqué (en `report-only`, il l'aurait été, la violation seulement relevée).
  expect(bloque).toEqual({ styleSansEffet: true, tiers: true })
  expect(problemes.join('\n')).toMatch(/style-src-elem .*\(enforce\)/)
  expect(problemes.join('\n')).toMatch(/connect-src https:\/\/tiers\.exemple\.invalid.*\(enforce\)/)
})
