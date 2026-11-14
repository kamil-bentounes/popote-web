import { test, expect } from './garde.ts'
import { ouvreLeBanc } from './banc.ts'

/*
 * La marmite en mouvement réduit : plus rien ne bouge tout seul, et chaque état doit se lire à son seul dessin (revue 3 : « `parole`
 * est identique à `repos` »). On relève, pour chaque état, la SIGNATURE visible : les parties du dessin réellement affichées (leur
 * opacité cumulée jusqu'à la marmite) et celles qui sont déplacées ou tournées. Les sept signatures doivent être distinctes ET
 * correspondre au tableau « La marmite et l'assistant » du système (`.design/systeme/LISEZMOI.md`) : un état dont on efface le signe
 * (la vapeur, la goutte…) casse ici.
 */
test.use({ reducedMotion: 'reduce' })

const PARTIES = ['vapeur', 'zzz', 'ondes', 'yeux', 'pupilles', 'dodo', 'joie', 'bouche', 'bouche-ouverte', 'goutte', 'couvercle']
type Signature = { visibles: string[]; deplacees: string[] }

// Ce que dit le tableau du système, état par état. Les parties toujours là (couvercle) et les yeux sont dans `visibles` quand ils le sont.
const ATTENDU: Record<string, Signature> = {
  repos: { visibles: ['yeux', 'pupilles', 'bouche', 'couvercle'], deplacees: [] },
  sommeil: { visibles: ['zzz', 'dodo', 'bouche', 'couvercle'], deplacees: [] }, // yeux fermés (dessinés, « z z »)
  ecoute: { visibles: ['ondes', 'yeux', 'pupilles', 'bouche', 'couvercle'], deplacees: ['yeux', 'couvercle'] }, // ondes, grands yeux, couvercle levé
  reflexion: { visibles: ['vapeur', 'yeux', 'pupilles', 'bouche', 'couvercle'], deplacees: ['pupilles', 'couvercle'] }, // vapeur, regard en l'air, couvercle de travers
  parole: { visibles: ['yeux', 'pupilles', 'bouche-ouverte', 'couvercle'], deplacees: [] }, // bouche ouverte
  joie: { visibles: ['joie', 'bouche', 'couvercle'], deplacees: [] }, // yeux rieurs
  inquiet: { visibles: ['goutte', 'yeux', 'pupilles', 'bouche', 'couvercle'], deplacees: ['pupilles', 'bouche'] }, // bouche à l'envers, goutte, regard baissé
}

async function signaturesDuBanc(page: import('@playwright/test').Page): Promise<Record<string, Signature>> {
  return page.evaluate((parties) => {
    const resultat: Record<string, { visibles: string[]; deplacees: string[] }> = {}
    for (const marmite of document.querySelectorAll<HTMLElement>('[data-section="La marmite"] [data-cas] .marmite')) {
      const etat = marmite.dataset.etat ?? ''
      if (marmite.closest('[data-cas]')?.getAttribute('data-reference') === null) continue // le cas « en vrai » est animé et sans pendant
      const visibles: string[] = []
      const deplacees: string[] = []
      for (const partie of parties) {
        const noeud = marmite.querySelector<SVGElement>(`.${partie}`)
        if (!noeud) throw new Error(`la partie « ${partie} » n'est pas dessinée`)
        let opacite = 1
        for (let n: Element | null = noeud; n && n !== marmite; n = n.parentElement) opacite *= Number(getComputedStyle(n).opacity)
        if (opacite > 0) visibles.push(partie)
        if (getComputedStyle(noeud).transform !== 'none') deplacees.push(partie)
      }
      resultat[etat] = { visibles: visibles.sort(), deplacees: deplacees.sort() }
    }
    return resultat
  }, [...PARTIES])
}

test('en mouvement réduit, plus rien ne bouge dans la section de la marmite', async ({ page }) => {
  await ouvreLeBanc(page)
  const animations = await page.locator('[data-section="La marmite"]').evaluate((s) => s.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length)
  expect(animations).toBe(0)
})

test('les sept états se lisent à leur seul dessin : sept signatures distinctes, celles du tableau du système', async ({ page }) => {
  await ouvreLeBanc(page)
  const relevees = await signaturesDuBanc(page)
  expect(Object.keys(relevees).sort()).toEqual(Object.keys(ATTENDU).sort())
  const attendu = Object.fromEntries(Object.entries(ATTENDU).map(([etat, sig]) => [etat, { visibles: [...sig.visibles].sort(), deplacees: [...sig.deplacees].sort() }]))
  expect(relevees).toEqual(attendu)
  const uniques = new Set(Object.values(relevees).map((s) => JSON.stringify(s)))
  expect(uniques.size).toBe(7)
})

// Les couleurs du dessin viennent de classes (`m-fond-*`, `m-trait-*`) : une classe oubliée ou mal écrite rend la forme noire, et rien d'autre
// ne la verrait. On compare le remplissage et le trait calculés aux jetons, tels que Chromium les peint.
test('le dessin est peint des jetons du système : corps en tomate, yeux en papier, « z z » en encre, vapeur en gris', async ({ page }) => {
  await ouvreLeBanc(page)
  const mesure = await page.evaluate(() => {
    const jeton = (nom: string) => {
      const sonde = document.createElement('i')
      sonde.style.color = `var(${nom})`
      document.body.append(sonde)
      const couleur = getComputedStyle(sonde).color
      sonde.remove()
      return couleur
    }
    const marmite = document.querySelector('[data-section="La marmite"] .marmite')!
    const lis = (selecteur: string, propriete: 'fill' | 'stroke') => getComputedStyle(marmite.querySelector(selecteur)!)[propriete]
    return {
      corps: { fill: lis('path.m-fond-tomate', 'fill'), stroke: lis('path.m-fond-tomate', 'stroke') },
      oeil: lis('.yeux ellipse', 'fill'),
      pupille: lis('.pupilles circle', 'fill'),
      zzz: lis('.zzz', 'fill'),
      vapeur: lis('.vapeur path', 'stroke'),
      joue: lis('circle.m-fond-rose', 'fill'),
      couvercle: lis('.couvercle rect', 'fill'),
      goutte: lis('.goutte', 'fill'),
      tomate: jeton('--color-tomate'), encre: jeton('--color-encre'), papier: jeton('--color-papier'), gris: jeton('--color-gris'),
      rose: jeton('--color-rose'), jaune: jeton('--color-jaune'), ciel: jeton('--color-ciel'),
    }
  })
  expect(mesure.corps).toEqual({ fill: mesure.tomate, stroke: mesure.encre })
  expect([mesure.oeil, mesure.pupille, mesure.zzz]).toEqual([mesure.papier, mesure.encre, mesure.encre])
  expect([mesure.vapeur, mesure.joue, mesure.couvercle, mesure.goutte]).toEqual([mesure.gris, mesure.rose, mesure.jaune, mesure.ciel])
})
