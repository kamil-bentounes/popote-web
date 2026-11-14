import type { Page } from '@playwright/test'
import { test, expect } from './garde.ts'
import { ouvreLeBanc } from './banc.ts'

const SECTION = '[data-section="Entrée d’écran"]'

interface Rejeu {
  /** Le style des quatre éléments à l'instant où l'écran vient d'être remonté (avant tout mouvement). */
  depart: Array<{ opacity: string; transform: string }>
  /** Quand chaque élément a annoncé son arrivée, en ms après le clic, dans l'ordre des rangs. */
  arrivees: number[]
}

/**
 * Rejoue l'entrée (« Rejouer l'entrée » remonte l'écran) et relève ce que le navigateur en fait. Le départ se lit à l'instant où
 * chaque élément entre dans la page : React a posé le style de départ de Motion, et aucune image n'a encore été dessinée.
 */
async function rejoue(page: Page): Promise<Rejeu> {
  return page.evaluate(async (selecteur) => {
    const section = document.querySelector(selecteur)!
    const arrivees = new Map<string, number>()
    const departs = new Map<string, { opacity: string; transform: string }>()
    let debut = 0
    const observateur = new MutationObserver((lots) => {
      for (const lot of lots) {
        for (const ajoute of lot.addedNodes) {
          if (!(ajoute instanceof HTMLElement)) continue
          for (const element of ajoute.querySelectorAll<HTMLElement>('[data-entree]')) {
            const style = getComputedStyle(element)
            departs.set(element.textContent ?? '', { opacity: style.opacity, transform: style.transform })
          }
        }
        const cible = lot.target as HTMLElement
        if (lot.type === 'attributes' && cible.dataset.entree === 'arrive') arrivees.set(cible.textContent ?? '', performance.now() - debut)
      }
    })
    observateur.observe(section, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-entree'] })
    debut = performance.now()
    ;(section.querySelector('.lien') as HTMLButtonElement).click()
    const fin = performance.now() + 5000
    while (arrivees.size < 4 && performance.now() < fin) await new Promise((suite) => setTimeout(suite, 10))
    observateur.disconnect()
    const textes = [...departs.keys()]
    return { depart: textes.map((texte) => departs.get(texte)!), arrivees: textes.map((texte) => arrivees.get(texte) ?? Number.NaN) }
  }, SECTION)
}

test('les éléments d’un écran partent invisibles, rapetissés et plus bas, puis arrivent dans l’ordre, 70 ms d’écart', async ({ page }) => {
  await ouvreLeBanc(page)
  const { depart, arrivees } = await rejoue(page)
  expect(depart).toHaveLength(4)
  // « À peine commencé », non « exactement au départ » : WebKit lance déjà l'animation du rang 0 quand on lit (opacité de 0,008 constatée en CI).
  for (const { opacity, transform } of depart) {
    expect(Number(opacity)).toBeLessThan(0.2)
    const [echelle, decalage] = [/^matrix\(([\d.]+),/.exec(transform)?.[1], /,\s*([\d.]+)\)$/.exec(transform)?.[1]].map(Number)
    expect(echelle, `rapetissé (transformation lue : ${transform})`).toBeLessThan(0.97)
    expect(decalage, `plus bas (transformation lue : ${transform})`).toBeGreaterThan(20)
  }
  expect(arrivees.every(Number.isFinite), 'chaque élément annonce son arrivée').toBe(true)
  expect([...arrivees].sort((a, b) => a - b), 'ils arrivent dans l’ordre des rangs').toEqual(arrivees)
  // Le quatrième part 210 ms après le premier : l'intervalle absorbe l'image (16 ms) et la charge d'une CI, pas un retard de 0 ni de 700 ms par rang.
  const ecart = arrivees[3]! - arrivees[0]!
  expect(ecart).toBeGreaterThan(150)
  expect(ecart).toBeLessThan(450)
})

test('en mouvement réduit, rien ne se déplace ni ne grandit : l’opacité seule, et tout arrive d’un coup', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await ouvreLeBanc(page)
  const { depart, arrivees } = await rejoue(page)
  // Pas d'assertion sur l'opacité de départ : l'animation dure 1 ms, et WebKit en rend déjà l'état final quand on lit le style (constaté en CI, 1 au lieu de 0).
  // Ce qui compte ici est qu'aucune transformation n'ait jamais existé.
  expect(depart).toHaveLength(4)
  for (const { transform } of depart) expect(transform).toBe('none')
  expect(arrivees.every(Number.isFinite)).toBe(true)
  // Sans retard par rang : le quatrième arrive avec le premier, à une image près.
  expect(arrivees[3]! - arrivees[0]!).toBeLessThan(120)
})
