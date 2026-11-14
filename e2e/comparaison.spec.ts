import { mkdir, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Locator } from '@playwright/test'
import { ouvreLeBanc } from './banc.ts'
import { apparie, slug, type SectionBanc, type SectionReference } from './comparaison/appariement.ts'
import type { DonneesProjet, Mesure } from './comparaison/rendu-index.ts'
import { expect, test } from './garde.ts'

const RACINE = resolve(import.meta.dirname, '..')
const REFERENCE = pathToFileURL(resolve(RACINE, '.design/systeme/reference.html')).href

/*
 * Chaque cas du banc est capturé à côté de la même section de `reference.html`, pour que la session de design juge. Aucune
 * comparaison de pixels ne fait échouer le test (un pixel change à chaque espacement) : il échoue seulement si l'appariement
 * est faux (légende absente, ambiguë, en double) ou si une capture est vide. `ecrit-index.ts` en tire `captures/comparaison/index.html`.
 */
test('chaque cas du banc est capturé à côté de la même section de reference.html', async ({ page, context }, info) => {
  const projet = info.project.name
  const dossier = resolve(RACINE, 'captures/comparaison', projet)
  await rm(dossier, { recursive: true, force: true })
  await mkdir(dossier, { recursive: true })

  // La page de référence : ses légendes se lisent APRÈS exécution de la page (celles de la marmite sont générées par son script).
  const pageReference = await context.newPage()
  await pageReference.goto(REFERENCE)
  await pageReference.evaluate(() => document.fonts.ready)
  const sectionsReference: SectionReference[] = await pageReference.evaluate(() => {
    let rang = 0
    const marque = (element: Element, legende: string, genre: 'cas' | 'nuance' | 'bloc') => {
      element.setAttribute('data-cmp', String(rang))
      return { legende, genre, rang: rang++ }
    }
    return [...document.querySelectorAll('.page > section')].map((section) => {
      const titre = section.querySelector('h2')?.textContent?.trim() ?? ''
      const cas = [...section.querySelectorAll('.cas')]
      const nuances = [...section.querySelectorAll('.nuance')]
      const elements = cas.length > 0
        ? cas.map((c) => marque(c, c.querySelector('small')?.textContent?.trim() ?? '', 'cas'))
        : nuances.length > 0
          ? nuances.map((n) => marque(n, n.textContent?.trim() ?? '', 'nuance'))
          : [...section.querySelectorAll(':scope > .bloc')].map((b) => marque(b, titre, 'bloc'))
      return { titre, elements }
    })
  })

  // `?fige` : les animations de Motion à leur état final (CSS : `animations: 'disabled'` aux captures).
  await ouvreLeBanc(page, '/banc?fige')
  const sectionsBanc: SectionBanc[] = await page.locator('[data-section]').evaluateAll((sections) =>
    sections.map((s) => ({
      titre: s.getAttribute('data-section') ?? '',
      reference: s.getAttribute('data-reference') ?? undefined,
      cas: [...s.querySelectorAll('[data-cas]')].map((c) => ({
        legende: c.getAttribute('data-cas') ?? '',
        reference: c.getAttribute('data-reference') ?? undefined,
      })),
    })),
  )

  const { paires, erreurs, sansPendant, nonPortees } = apparie(sectionsReference, sectionsBanc)
  const genreDe = new Map(sectionsReference.flatMap((s) => s.elements).map((e) => [e.rang, e.genre]))
  const donnees: DonneesProjet = { projet, paires: [], sansPendant, nonPortees }
  const vide: string[] = []
  const dejaVus = new Set<string>()

  const capture = async (cible: Locator, fichier: string): Promise<Mesure> => {
    const image = await cible.screenshot({ animations: 'disabled', path: resolve(dossier, fichier) })
    const boite = await cible.boundingBox()
    if (image.length === 0 || !boite || boite.width === 0 || boite.height === 0) vide.push(fichier)
    return { largeur: boite?.width ?? 0, hauteur: boite?.height ?? 0, image: fichier }
  }

  for (const paire of paires) {
    let nom = `${slug(paire.section)}/${slug(paire.legende)}`
    for (let n = 2; dejaVus.has(nom); n++) nom = `${slug(paire.section)}/${slug(paire.legende)}-${n}`
    dejaVus.add(nom)
    const cas = page.locator(`[data-section=${JSON.stringify(paire.section)}] [data-cas=${JSON.stringify(paire.legende)}]`)
    // Une pastille ou un bloc seul n'a pas de `.cas` de référence : côté banc, c'est ce que le cas rend (son premier enfant).
    const cibleBanc = genreDe.get(paire.reference.rang) === 'cas' ? cas : cas.locator(':scope > :first-child')
    donnees.paires.push({
      section: paire.section,
      legende: paire.legende,
      reference: await capture(pageReference.locator(`[data-cmp="${paire.reference.rang}"]`), `${nom}.reference.png`),
      banc: await capture(cibleBanc, `${nom}.banc.png`),
    })
  }

  // Écrit avant les assertions : l'index existe aussi quand l'appariement échoue, c'est là qu'on regarde pourquoi.
  await writeFile(resolve(dossier, 'donnees.json'), `${JSON.stringify(donnees, null, 2)}\n`)

  expect(erreurs, 'appariement des cas du banc et des légendes de reference.html').toEqual([])
  expect(vide, 'captures vides').toEqual([])
  expect(paires.length, 'cas appariés (Couleurs et Typographie au moins)').toBeGreaterThanOrEqual(16)
})
