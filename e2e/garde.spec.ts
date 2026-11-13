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
  // Sans cette directive, WebKit passe les sous-ressources en https sur 127.0.0.1 (voir `playwright.config.ts`).
  expect(banc.headers()['content-security-policy']).not.toContain('upgrade-insecure-requests')
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
  // Le leurre répondrait 200 : sans CSP l'appel aboutirait. Sous `enforce`, il est bloqué avant d'atteindre le réseau.
  let appelsAuLeurre = 0
  await page.route('https://tiers.exemple.invalid/**', (route) => {
    appelsAuLeurre++
    return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*' }, body: 'x' })
  })
  await ouvreLeBanc(page)
  const resultat = await page.evaluate(async () => {
    const style = document.createElement('style')
    style.textContent = 'body { outline: 9px solid red; }'
    document.head.append(style)
    const tiers = await fetch('https://tiers.exemple.invalid/x').then(() => 'abouti', () => 'bloque')
    return { styleSansEffet: getComputedStyle(document.body).outlineStyle === 'none', tiers }
  })
  // `enforce` : le style n'est pas appliqué et l'appel n'aboutit pas (en `report-only`, les deux passeraient, la violation seulement relevée).
  expect({ ...resultat, appelsAuLeurre }).toEqual({ styleSansEffet: true, tiers: 'bloque', appelsAuLeurre: 0 })
  expect(problemes.join('\n')).toMatch(/style-src(-elem)? .*\(enforce\)/)
  expect(problemes.join('\n')).toMatch(/connect-src https:\/\/tiers\.exemple\.invalid.*\(enforce\)/)
})
