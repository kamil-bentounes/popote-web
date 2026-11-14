import type { Page } from '@playwright/test'
import { test, expect } from './garde.ts'
import { CONTROLES, ouvreLeBanc } from './banc.ts'

const REFERENCE = '[data-section="Bloc, pastille, tampon, avatar"]'
const REMPLISSAGE = '[data-section="Jauge qui se remplit"] [data-jauge-banc]'

interface Image {
  /** La part de la largeur utile (hors les deux contours de 3 px) que la barre occupe. `clientWidth` arrondit : on mesure les rectangles. */
  part: number
  anime: boolean
  animation: string
  enCours: number
}

/** Appuie sur « Remplir de nouveau » et relève, image par image, ce que le navigateur fait de la barre, jusqu'à ce qu'elle soit au repos. */
async function remplit(page: Page): Promise<Image[]> {
  return page.evaluate(async (selecteur) => {
    const cadre = document.querySelector(selecteur)!
    const jauge = cadre.querySelector<HTMLElement>('[role=progressbar]')!
    const barre = jauge.querySelector('i')!
    const lit = (): Image => ({
      part: parseFloat(getComputedStyle(barre).width) / (jauge.getBoundingClientRect().width - 6),
      anime: barre.hasAttribute('data-anime'),
      animation: getComputedStyle(barre).animationName,
      enCours: barre.getAnimations().filter((a) => a.playState === 'running').length,
    })
    const images: Image[] = []
    ;(cadre.parentElement!.querySelector('.lien') as HTMLButtonElement).click()
    const fin = performance.now() + 5000
    let vuPose = false
    while (performance.now() < fin) {
      await new Promise((suite) => requestAnimationFrame(suite))
      const image = lit()
      images.push(image)
      vuPose ||= image.anime
      if (vuPose && !image.anime) break
      // Sous mouvement réduit (1 ms) l'attribut n'est peut-être jamais vu posé : la barre arrivée et au repos suffit.
      if (!vuPose && !image.anime && Math.abs(image.part - 0.85) < 0.005) break
    }
    // Quelques images de plus : une barre qui « repart » après avoir fini serait vue ici.
    for (let i = 0; i < 12; i++) {
      await new Promise((suite) => requestAnimationFrame(suite))
      images.push(lit())
    }
    return images
  }, REMPLISSAGE)
}

test('les rayures ne défilent que pendant le remplissage : posées, elles tournent ; à l’arrivée, plus rien ne bouge', async ({ page }) => {
  await ouvreLeBanc(page)
  await page.locator(REMPLISSAGE).scrollIntoViewIfNeeded()
  const images = await remplit(page)
  const pendant = images.filter((i) => i.anime)
  expect(pendant.length, 'la barre est restée « en train de se remplir » un moment').toBeGreaterThan(5)
  for (const image of pendant) expect(image.animation, 'les rayures défilent pendant le remplissage').toBe('defile')
  const apres = images.slice(images.findLastIndex((i) => i.anime) + 1)
  expect(apres.length, 'la fin du remplissage a été vue').toBeGreaterThanOrEqual(10)
  for (const image of apres) {
    expect(image.animation, 'les rayures ont cessé de défiler').toBe('none')
    expect(image.enCours, 'aucune animation ne tourne sur la barre').toBe(0)
  }
  // Elle est montée jusqu'à 85 % (de 15 %) en passant par des valeurs intermédiaires, et s'y pose.
  expect(Math.min(...pendant.map((i) => i.part))).toBeLessThan(0.6)
  expect(apres.at(-1)!.part).toBeCloseTo(0.85, 2)
})

test('au chargement, aucune jauge ne reste « en train de se remplir » : même celle qui part de zéro et y reste', async ({ page }) => {
  await ouvreLeBanc(page)
  // `[data-anime]` est absent avant que Motion démarre : on attend d'abord que la dernière barre ait atteint sa part.
  await expect.poll(() => page.locator('[data-cas^="Bornes"] .jauge > i').nth(1).evaluate((b) => parseFloat(getComputedStyle(b).width) / (b.parentElement!.getBoundingClientRect().width - 6))).toBeCloseTo(1, 2)
  await expect(page.locator('[data-section="Jauge qui se remplit"] [role=progressbar]')).toHaveCount(4)
  await expect(page.locator('[data-anime]')).toHaveCount(0)
  const animations = await page.locator('.jauge > i').evaluateAll((barres) => barres.map((b) => getComputedStyle(b).animationName))
  expect(animations.every((nom) => nom === 'none')).toBe(true)
})

test('une jauge qui repart avant d’avoir fini finit elle aussi au repos, à sa dernière valeur, sans `data-anime`', async ({ page }) => {
  await ouvreLeBanc(page)
  const cadre = page.locator(REMPLISSAGE)
  await cadre.scrollIntoViewIfNeeded()
  const rejoue = page.locator('[data-section="Jauge qui se remplit"] [data-cas^="Les rayures"] .lien')
  await rejoue.click() // 15 -> 85
  await expect(cadre.locator('i')).toHaveAttribute('data-anime', '')
  // En plein remplissage : la barre a dépassé 30 % sans avoir fini.
  await expect.poll(() => cadre.locator('i').evaluate((b) => parseFloat(getComputedStyle(b).width) / (b.parentElement!.getBoundingClientRect().width - 6))).toBeGreaterThan(0.3)
  await rejoue.click() // 85 -> 15, avant la fin du précédent
  await expect(cadre.locator('i')).not.toHaveAttribute('data-anime', '', { timeout: 5000 })
  await expect.poll(() => cadre.locator('i').evaluate((b) => parseFloat(getComputedStyle(b).width) / (b.parentElement!.getBoundingClientRect().width - 6))).toBeCloseTo(0.15, 2)
  expect(await cadre.locator('i').evaluate((b) => getComputedStyle(b).animationName)).toBe('none')
})

test('les bornes se voient : vide (le seul trait d’encre du bord), pleine de bord à bord, 150 comme 100', async ({ page }) => {
  await ouvreLeBanc(page)
  const parts = await page
    .locator('[data-section="Jauge qui se remplit"] [data-cas^="Bornes"] [role=progressbar]')
    .evaluateAll((jauges) => jauges.map((j) => parseFloat(getComputedStyle(j.querySelector('i')!).width) / (j.getBoundingClientRect().width - 6)))
  // La barre est en `border-box` avec un contour droit de 3 px (le système) : à zéro il reste ce trait, rien d'autre.
  expect(parts[0]! * 100).toBeLessThan(2)
  expect(parts[1]).toBeCloseTo(1, 2)
  expect(parts[2]).toBeCloseTo(1, 2)
})

test('sous mouvement réduit, la barre se pose sans que les rayures défilent un seul instant', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await ouvreLeBanc(page)
  await page.locator(REMPLISSAGE).scrollIntoViewIfNeeded()
  const images = await remplit(page)
  expect(images.every((i) => i.animation === 'none')).toBe(true)
  expect(images.every((i) => i.enCours === 0)).toBe(true)
  expect(images.at(-1)!.part).toBeCloseTo(0.85, 2)
  expect(images.at(-1)!.anime).toBe(false)
})

test('le suivi : une coche et « faite » sur chaque étape faite, un seul `aria-current`, l’étape pleine de bord à bord', async ({ page }) => {
  await ouvreLeBanc(page)
  const suivi = page.locator(`${REFERENCE} .suivi`).first()
  const etapes = await suivi.locator('> li').evaluateAll((lis) =>
    lis.map((li) => {
      const remplissage = li.querySelector('.suivi-remplit')
      const barre = li.querySelector('i')!
      return {
        texte: li.textContent,
        coche: li.querySelector('svg') !== null,
        courant: li.getAttribute('aria-current'),
        remplissage: remplissage ? remplissage.getBoundingClientRect().width / (barre.getBoundingClientRect().width - 6) : null,
      }
    }),
  )
  expect(etapes.map((e) => e.texte)).toEqual(['Envoyée, faite', 'Ouverte, faite', 'Arrivée, à venir'])
  expect(etapes.map((e) => e.coche)).toEqual([true, true, false])
  expect(etapes.map((e) => e.courant)).toEqual([null, 'step', null])
  expect(etapes[0]!.remplissage).toBeCloseTo(1, 2)
  expect(etapes[1]!.remplissage).toBeCloseTo(1, 2)
  expect(etapes[2]!.remplissage).toBeNull()
})

test('la ligne d’effet dit son sens par la couleur, par la forme du signe et par un texte : aucun des trois ne suffit seul', async ({ page }) => {
  await ouvreLeBanc(page)
  const lignes = await page.locator(`${REFERENCE} .effet`).evaluateAll((lis) =>
    lis.map((li) => {
      const signe = li.querySelector('i')!
      const svg = signe.querySelector('svg')!.getBoundingClientRect()
      return {
        fond: getComputedStyle(signe).backgroundColor,
        trace: signe.querySelector('path')!.getAttribute('d'),
        taille: [svg.width, svg.height],
        texte: li.textContent,
      }
    }),
  )
  expect(lignes).toHaveLength(3)
  expect(new Set(lignes.map((l) => l.fond)).size, 'trois couleurs').toBe(3)
  expect(new Set(lignes.map((l) => l.trace)).size, 'trois formes').toBe(3)
  expect(lignes.map((l) => l.taille)).toEqual([[18, 18], [18, 18], [18, 18]])
  expect(lignes.map((l) => l.texte)).toEqual([
    'Disparaît : Tes objectifs disparaissent.',
    'Reste : Léa garde le frigo.',
    'Change : Elle est prévenue.',
  ])
})

test('la jauge, le suivi, la ligne d’effet et les icônes ne se touchent pas : aucun n’entre dans l’ordre du clavier', async ({ page }) => {
  await ouvreLeBanc(page)
  const informent = page.locator(':is(.jauge, .suivi, .effet, .icone)')
  expect(await informent.count(), 'le banc les montre').toBeGreaterThanOrEqual(15)
  const fautifs = await informent.evaluateAll((noeuds, controles) => {
    return noeuds
      .filter((n) => n.matches(controles) || (n as HTMLElement).tabIndex >= 0 || n.querySelector(controles) !== null)
      .map((n) => n.outerHTML.slice(0, 70))
  }, CONTROLES)
  expect(fautifs).toEqual([])
})
