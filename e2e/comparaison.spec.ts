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

// WebKit applique `animations: 'disabled'` en injectant une feuille de style : la CSP en `enforce` du banc la refuse (constaté en
// CI, une violation par capture), et la garde, qui ne distingue pas l'outil de la page, fait échouer le test. Ce test ne garde pas
// la CSP (garde.spec.ts, banc.axe.spec.ts et les autres le font sur le même banc, sans captures) : il la contourne.
test.use({ bypassCSP: true })

/*
 * Chaque cas du banc est capturé à côté de la même section de `reference.html`, pour que la session de design juge. Aucune
 * comparaison de pixels ne fait échouer le test (un pixel change à chaque espacement) : il échoue seulement si l'appariement
 * est faux (légende absente, ambiguë, en double) ou si une capture est vide. `ecrit-index.ts` en tire `captures/comparaison/index.html`.
 */
test('chaque cas du banc est capturé à côté de la même section de reference.html', async ({ page, context }, info) => {
  // Deux captures par cas : le temps croît avec les lots de composants (F9 à F17), WebKit est le plus lent.
  test.setTimeout(180_000)
  const projet = info.project.name
  const dossier = resolve(RACINE, 'captures/comparaison', projet)
  await rm(dossier, { recursive: true, force: true })
  await mkdir(dossier, { recursive: true })

  // La page de référence : ses légendes se lisent APRÈS exécution de la page (celles de la marmite sont générées par son script).
  const pageReference = await context.newPage()
  await pageReference.goto(REFERENCE)
  // Aucune police de la référence ne doit manquer : une police de repli ferait de faux écarts, sans signal.
  const policesManquantes = await pageReference.evaluate(async () => {
    const essais = await Promise.allSettled([...document.fonts].map((police) => police.load()))
    return essais.filter((essai) => essai.status === 'rejected').length
  })
  expect(policesManquantes, 'polices de reference.html qui ne se chargent pas').toBe(0)
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
        ? cas.map((c) => marque(c, c.querySelector(':scope > small')?.textContent?.trim() ?? '', 'cas'))
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
  const donnees: DonneesProjet = { projet, paires: [], sansPendant, nonPortees }
  const ecritDonnees = () => writeFile(resolve(dossier, 'donnees.json'), `${JSON.stringify(donnees, null, 2)}\n`)
  // Un appariement faux se dit avant toute capture : deux cas de même légende rendraient d'ailleurs un sélecteur ambigu.
  if (erreurs.length > 0) await ecritDonnees()
  expect(erreurs, 'appariement des cas du banc et des légendes de reference.html').toEqual([])
  const genreDe = new Map(sectionsReference.flatMap((s) => s.elements).map((e) => [e.rang, e.genre]))
  const vide: string[] = []
  const dejaVus = new Set<string>()

  // Playwright attend qu'un élément soit visible avant de le capturer : un cas vide serait un délai de 30 s sans nom. Court ici, et nommé.
  const capture = async (cible: Locator, fichier: string): Promise<Mesure> => {
    try {
      await cible.screenshot({ animations: 'disabled', path: resolve(dossier, fichier), timeout: 5_000 })
      const boite = await cible.boundingBox()
      if (!boite || boite.width < 2 || boite.height < 2) vide.push(fichier)
      return { largeur: boite?.width ?? 0, hauteur: boite?.height ?? 0, image: fichier }
    } catch {
      vide.push(fichier)
      return { largeur: 0, hauteur: 0, image: fichier }
    }
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
      legendeReference: paire.reference.legende,
      reference: await capture(pageReference.locator(`[data-cmp="${paire.reference.rang}"]`), `${nom}.reference.png`),
      banc: await capture(cibleBanc, `${nom}.banc.png`),
    })
  }

  // Écrit avant les assertions : l'index existe aussi quand une capture est vide, c'est là qu'on regarde pourquoi.
  await ecritDonnees()

  expect(vide, 'captures vides ou introuvables').toEqual([])
  // Le plancher ne monte pas seul : on nomme les sections qui doivent être comparées (chaque lot ajoute la sienne ici s'il le veut).
  expect([...new Set(paires.map((p) => p.section))]).toEqual(expect.arrayContaining(['Couleurs', 'Typographie']))
  expect(paires.length, 'cas appariés').toBeGreaterThanOrEqual(16)
})
