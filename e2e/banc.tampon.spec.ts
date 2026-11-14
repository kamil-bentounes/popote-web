import type { Page } from '@playwright/test'
import { test, expect } from './garde.ts'
import { ouvreLeBanc } from './banc.ts'

const SECTION = '[data-section="Tampon"]'

interface Pose {
  /** Le style du tampon à l'instant où il entre dans la page, avant toute image dessinée. */
  depart: { opacite: number; echelle: number; angle: number }
  /** Quand il a annoncé son arrivée, en ms après le clic. */
  arrivee: number
  /** Le premier état relevé en route (échelle entre 2 % et 80 %) : à l'échelle nulle l'angle n'existe plus, la matrice est nulle. */
  enRoute?: { opacite: number; echelle: number; angle: number }
  fin: { opacite: number; echelle: number; angle: number }
}

/** Remonte le tampon (« Poser le tampon ») et relève ce que le navigateur en fait. */
async function pose(page: Page): Promise<Pose> {
  return page.evaluate(async (selecteur) => {
    const section = document.querySelector(selecteur)!
    // `matrix(a, b, …)` : l'échelle est la norme de (a, b), l'angle son argument ; `none` est l'identité.
    const lit = (element: Element) => {
      const style = getComputedStyle(element)
      const [a = 1, b = 0] = (/^matrix\(([^)]+)\)/.exec(style.transform)?.[1] ?? '1, 0').split(',').map(Number)
      return { opacite: Number(style.opacity), echelle: Math.hypot(a, b), angle: (Math.atan2(b, a) * 180) / Math.PI }
    }
    let depart: Pose['depart'] | undefined
    let arrivee = Number.NaN
    let enRoute: Pose['enRoute']
    let debut = 0
    const observateur = new MutationObserver((lots) => {
      for (const lot of lots) {
        for (const ajoute of lot.addedNodes) {
          if (!(ajoute instanceof HTMLElement)) continue
          const tampon = ajoute.matches('[data-tampon]') ? ajoute : ajoute.querySelector('[data-tampon]')
          if (tampon) depart = lit(tampon)
        }
        const cible = lot.target as HTMLElement
        if (lot.type === 'attributes' && cible.dataset.tampon === 'arrive') arrivee = performance.now() - debut
      }
    })
    observateur.observe(section, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-tampon'] })
    debut = performance.now()
    ;(section.querySelector('.lien') as HTMLButtonElement).click()
    const fin = performance.now() + 5000
    while (Number.isNaN(arrivee) && performance.now() < fin) {
      await new Promise((suite) => requestAnimationFrame(suite))
      const etat = lit(section.querySelector('.tampon')!)
      if (enRoute === undefined && etat.echelle > 0.02 && etat.echelle < 0.8) enRoute = etat
    }
    observateur.disconnect()
    return { depart: depart!, arrivee, enRoute, fin: lit(section.querySelector('.tampon')!) }
  }, SECTION)
}

test('le tampon part de l’échelle nulle, grandit en tournant depuis l’autre côté, puis se pose à 8 degrés', async ({ page }) => {
  await ouvreLeBanc(page)
  const { depart, enRoute, arrivee, fin } = await pose(page)
  // « À peine commencé », non « exactement au départ » : WebKit lance déjà l'animation quand on lit (voir F14a).
  expect(depart.echelle, 'rapetissé au départ').toBeLessThan(0.5)
  expect(enRoute, 'une image où il grandit encore').toBeDefined()
  expect(enRoute!.angle, 'en route, il est encore penché dans l’autre sens').toBeLessThan(0)
  expect(Number.isFinite(arrivee), 'il annonce son arrivée').toBe(true)
  expect(arrivee, 'il met le temps du jeton (550 ms)').toBeGreaterThan(450)
  expect(arrivee).toBeLessThan(1500)
  expect(fin.echelle).toBeCloseTo(1, 2)
  expect(fin.angle).toBeCloseTo(8, 0)
  expect(fin.opacite).toBe(1)
})

test('en mouvement réduit, le tampon apparaît sans tourner ni grandir, à son inclinaison de repos', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await ouvreLeBanc(page)
  const { depart, arrivee, fin } = await pose(page)
  expect(depart.echelle).toBeCloseTo(1, 2)
  expect(depart.angle, 'l’inclinaison de `.tampon`, qui n’est pas un mouvement').toBeCloseTo(8, 0)
  expect(arrivee, 'il arrive d’un coup').toBeLessThan(400)
  expect(fin.echelle).toBeCloseTo(1, 2)
  expect(fin.angle).toBeCloseTo(8, 0)
  expect(fin.opacite).toBe(1)
})
