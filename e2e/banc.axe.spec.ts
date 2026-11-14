import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { test, expect } from './garde.ts'
import { ouvreLeBanc, tabJusqua, titresDesSections } from './banc.ts'

const BALISES = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

/*
 * Axe ne tranche pas toujours : un fond en dégradé ou un recouvrement rend le contraste « incomplet » (ni réussi ni violé).
 * Un test qui ne lit que les violations resterait vert si un contraste cessait d'être mesuré : on compte donc aussi les
 * réussites et on borne les incomplets. Admis aujourd'hui, deux au plus, que l'on juge à l'œil : le texte posé sur le soleil de la
 * sonde du lien d'évitement (un dégradé), et, au téléphone seulement, la légende du tampon de la sonde des paires (cause non établie : le tampon
 * tourne, et c'est son voisinage qu'axe juge recouvert). Le soleil, de 700 px, déborde aussi de sa scène, et axe lit sa boîte sans le rognage : le texte
 * voisin lui paraissait « recouvert » (le titre et la légende de la scène ; F9 a vu l'aide et la légende du champ, juste au-dessus).
 * La scène a donc une marge (`.scene--sonde`, `banc.css`) qui tient le soleil à distance de tout autre texte, et la borne est
 * redescendue de 4 à 2. À relever seulement avec une raison écrite.
 */
// Au téléphone et sous WebKit (390 px) : le texte du soleil et la légende du tampon ; au PC : le texte du soleil seul.
const incompletsAdmis = (projet: string) => (projet === 'pc' ? 1 : 2)
// Et, à part, un seul dans « La marmite » (F17) : le « z z » de la marmite endormie est un `<text>` du dessin SVG, et axe le range
// « incomplet » (`imgNode`, un texte dans une image : il ne sait pas le juger) ; encre sur crème, il se lit à l'œil, et le dessiner en
// chemins s'écarterait du système. Borné par section : un autre incomplet, ailleurs, ne se cache pas dans cette marge.
// F18 : l'écran de réveil en montre trois (les trois moments où la marmite dort).
const INCOMPLETS_PAR_SECTION: Record<string, number> = { 'La marmite': 1, 'Écran de réveil': 3 }
// 187 mesurés au PC (186 au téléphone) avec F14b et F17 : le décor en ajoute 10, le tampon qui arrive 4, le tampon du bloc 1, la marmite 10 (162 et 161 avec F14a). Même marge qu'avant (9), pour WebKit, non joué en local.
// F13 : le bloc de la référence passe de 15 à 36 contrastes (le suivi, les lignes d'effet), « Icônes » en ajoute 2 et « Jauge qui se remplit » 4 : 227 mesurés au PC, 226 au téléphone ; même marge (9).
const REUSSITES_MIN = 217
// Le plancher global ne voit pas la perte d'une section entière de F12 (la bulle seule : 7 sur 154 ; l'entrée d'écran, mesurée une fois ses éléments posés : 7 ; le décor : 10 sur 187). Un plancher par section, mesuré, le voit.
// F13 : le bloc de la référence porte maintenant le suivi (étapes, lues par axe) et les lignes d'effet ; « Icônes » et « Jauge qui se remplit » n'ont que des légendes (les barres et les signes ne sont pas du texte pour axe : le plancher prouve qu'il les lit encore).
// Le décor : titre et note de chaque scène, sur le sol (jamais sur le dégradé du soleil, que `incompletsAdmis` ne laisse pas passer).
const REUSSITES_PAR_SECTION: Record<string, number> = { 'Bloc, pastille, tampon, avatar': 36, Bulle: 7, 'Entrée d’écran': 7, Décor: 10, Tampon: 4, 'La marmite': 10, 'Écran de réveil': 12, Icônes: 2, 'Jauge qui se remplit': 4 }

async function mesure(page: Page, include: string) {
  const { violations, incomplete, passes } = await new AxeBuilder({ page }).include(include).withTags(BALISES).analyze()
  const contraste = (liste: typeof passes) => liste.filter((r) => r.id === 'color-contrast').flatMap((r) => r.nodes)
  return { violations, incompletsContraste: contraste(incomplete).length, reussitesContraste: contraste(passes).length }
}

// Le contraste est inclus : c'est ici, dans un vrai navigateur, qu'il se mesure (happy-dom n'a pas de mise en page). Deux
// passes : avec et sans mouvement réduit, qui change ce que le système dessine (`composants.css`, fin du fichier).
for (const mouvement of ['no-preference', 'reduce'] as const) {
  test(`axe ne trouve aucune violation WCAG A et AA dans chaque section, et mesure le contraste (mouvement : ${mouvement})`, async ({ page }, info) => {
    await page.emulateMedia({ reducedMotion: mouvement })
    await ouvreLeBanc(page)
    const titres = await titresDesSections(page)
    expect(titres).toEqual(expect.arrayContaining(['Couleurs', 'Typographie', 'Anneaux de focus', 'Paires texte et fond']))
    const violations: string[] = []
    let incomplets = 0
    const incompletsParSection: Record<string, number> = {}
    let reussites = 0
    const parSection: Record<string, number> = {}
    for (const titre of titres) {
      const mesures = await mesure(page, `[data-section="${titre}"]`)
      violations.push(...mesures.violations.map((v) => `${titre} : ${v.id} (${v.nodes.map((n) => n.target.join(' ')).join(' ; ')})`))
      incompletsParSection[titre] = mesures.incompletsContraste
      if (!(titre in INCOMPLETS_PAR_SECTION)) incomplets += mesures.incompletsContraste
      reussites += mesures.reussitesContraste
      parSection[titre] = mesures.reussitesContraste
    }
    expect(violations).toEqual([])
    expect(incomplets, 'contrastes qu’axe ne tranche pas : voir incompletsAdmis').toBeLessThanOrEqual(incompletsAdmis(info.project.name))
    for (const [titre, maximum] of Object.entries(INCOMPLETS_PAR_SECTION)) {
      expect(incompletsParSection[titre] ?? 0, `contrastes qu’axe ne tranche pas dans « ${titre} »`).toBeLessThanOrEqual(maximum)
    }
    expect(reussites, 'contrastes mesurés et réussis').toBeGreaterThanOrEqual(REUSSITES_MIN)
    for (const [titre, minimum] of Object.entries(REUSSITES_PAR_SECTION)) {
      expect(parSection[titre] ?? 0, `contrastes réussis de la section « ${titre} »`).toBeGreaterThanOrEqual(minimum)
    }
  })
}

test('le lien d’évitement, hors cadre au repos, est mesuré une fois focalisé', async ({ page }) => {
  await ouvreLeBanc(page)
  await tabJusqua(page, '#lien-evitement')
  const mesures = await mesure(page, '#scene-evitement')
  expect(mesures.violations.map((v) => v.id)).toEqual([])
  expect(mesures.reussitesContraste, 'le texte du lien sur son papier est mesuré').toBeGreaterThanOrEqual(1)
})

test('axe voit le contraste : un texte pâle sur la menthe est relevé (garde de la garde)', async ({ page }) => {
  await ouvreLeBanc(page)
  await page.locator('[data-section="Paires texte et fond"] .bouton').first().evaluate((bouton) => {
    // Pas la même couleur que le fond : axe laisse « incomplet » un rapport de 1:1.
    ;(bouton as HTMLElement).style.color = 'var(--color-jaune-pale)'
  })
  const { violations } = await new AxeBuilder({ page }).include('[data-section="Paires texte et fond"]').withTags(BALISES).analyze()
  expect(violations.map((v) => v.id)).toContain('color-contrast')
})
