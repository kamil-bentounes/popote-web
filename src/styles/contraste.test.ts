// @vitest-environment node
/// <reference types="node" />
// Le contraste est CALCULÉ à partir des jetons (WCAG 2.2, 1.4.3 et 1.4.11), pas lu dans un commentaire : un jeton
// qu'on retouche sans y penser fait échouer le test. Happy-dom n'a pas de mise en page : axe ne mesure pas le
// contraste dans les tests de composants ; ce calcul et le banc (Chromium, F8) le font.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import postcss from 'postcss'
import { describe, expect, it } from 'vitest'

const jetons = readFileSync(resolve(process.cwd(), 'src/styles/jetons.css'), 'utf8')
const couleurs = new Map([...jetons.matchAll(/--color-([a-z-]+):\s*(#[0-9A-Fa-f]{6})\b/g)].flatMap((m) => (m[1] && m[2] ? [[m[1], m[2]] as const] : [])))

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255)
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(r ?? 0) + 0.7152 * lin(g ?? 0) + 0.0722 * lin(b ?? 0)
}

function rapport(premier: string, second: string): number {
  const [a, b] = [premier, second].map((nom) => {
    const hex = couleurs.get(nom)
    if (!hex) throw new Error(`jeton --color-${nom} introuvable dans jetons.css`)
    return luminance(hex)
  }) as [number, number]
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

describe('le texte tient 4,5:1 (WCAG 1.4.3)', () => {
  it.each([
    ['encre', 'creme'], ['encre', 'papier'], ['encre', 'tomate'], ['encre', 'ciel'], ['encre', 'menthe'], ['encre', 'jaune'], ['encre', 'rose'],
    ['encre', 'jaune-pale'], ['encre', 'menthe-pale'], ['encre', 'rose-pale'], ['encre', 'lilas-pale'], ['encre', 'tomate-pale'],
    ['papier', 'tomate-fonce'], ['papier', 'ciel-fonce'],
    ['erreur', 'creme'], ['erreur', 'papier'],
    ['gris', 'creme'], ['gris', 'papier'], ['gris', 'lilas-pale'], ['gris', 'menthe-pale'],
  ])('%s sur %s', (texte, fond) => {
    expect(rapport(texte, fond)).toBeGreaterThanOrEqual(4.5)
  })

  it('le texte d’erreur ne se pose PAS sur la tomate pâle : 4,25:1, sous le seuil (revue 15)', () => {
    expect(rapport('erreur', 'tomate-pale')).toBeLessThan(4.5)
  })

  it('aucune règle de composants.css n’écrit du texte d’erreur sur la tomate pâle', () => {
    const racine = postcss.parse(readFileSync(resolve(process.cwd(), 'src/styles/composants.css'), 'utf8'))
    const fautives: string[] = []
    racine.walkRules((regle) => {
      const valeurs = regle.nodes.flatMap((n) => (n.type === 'decl' ? [`${n.prop}:${n.value}`] : []))
      const texteErreur = valeurs.some((v) => /^color:\s*var\(--color-erreur\)/.test(v))
      const fondPale = valeurs.some((v) => /^background(?:-color)?:\s*var\(--color-tomate-pale\)/.test(v))
      if (texteErreur && fondPale) fautives.push(regle.selector)
    })
    expect(fautives).toEqual([])
  })
})

// Les paires sont LUES dans composants.css, règle par règle : `color` et `background` d'une même règle ; le texte d'une règle qui n'en
// pose pas est l'encre du corps (héritée) ; une règle sans fond pose son texte sur le crème de la page ou le papier d'un bloc. Une
// règle qui sépare le texte et le fond (deux règles) n'est pas vue ici : le banc la mesure dans Chromium avec axe (F8).
describe('les paires de composants.css, dérivées de ses règles, tiennent 4,5:1', () => {
  const jeton = (valeur: string | undefined) => /^var\(--color-([a-z-]+)\)$/.exec(valeur ?? '')?.[1]
  const racine = postcss.parse(readFileSync(resolve(process.cwd(), 'src/styles/composants.css'), 'utf8'))
  const paires: Array<{ regle: string; texte: string; fond: string }> = []
  racine.walkRules((regle) => {
    if (regle.parent?.type === 'atrule' && (regle.parent as { name?: string }).name === 'keyframes') return
    const valeurs = new Map<string, string>()
    regle.walkDecls((d) => void valeurs.set(d.prop, d.value))
    const texte = jeton(valeurs.get('color'))
    const fond = jeton(valeurs.get('background') ?? valeurs.get('background-color'))
    if (!texte && !fond) return
    // Un jeton qui n'est pas une couleur opaque (`voile`, un rgb avec transparence) n'a pas de rapport de contraste : c'est une surcouche.
    if ((texte && !couleurs.has(texte)) || (fond && !couleurs.has(fond))) return
    const fonds = fond ? [fond] : ['creme', 'papier']
    for (const f of fonds) paires.push({ regle: regle.selector, texte: texte ?? 'encre', fond: f })
  })

  it('en trouve (le test ne lit pas dans le vide)', () => {
    expect(paires.length).toBeGreaterThan(15)
    expect(paires.map((p) => p.regle)).toEqual(expect.arrayContaining(['.bouton--danger', '.bouton:disabled', '.tampon', '.pastille']))
  })

  it('aucune paire sous 4,5:1', () => {
    const faibles = paires
      .filter(({ texte, fond }) => rapport(texte, fond) < 4.5)
      .map(({ regle, texte, fond }) => `${regle} : ${texte} sur ${fond} = ${rapport(texte, fond).toFixed(2)}`)
    expect(faibles).toEqual([])
  })

  it('le placeholder d’un champ en erreur (gris sur tomate pâle) tient aussi', () => {
    expect(rapport('gris', 'tomate-pale')).toBeGreaterThanOrEqual(4.5)
  })
})

describe('les composants tiennent 3:1 (WCAG 1.4.11) : l’anneau de focus d’encre sur chaque fond du système', () => {
  it.each(['creme', 'papier', 'menthe', 'jaune', 'ciel', 'rose', 'tomate'])('encre contre %s', (fond) => {
    expect(rapport('encre', fond)).toBeGreaterThanOrEqual(3)
  })
})

describe('le calcul lui-même', () => {
  it('rend 21 pour du noir sur du blanc et 1 pour deux fois la même couleur', () => {
    expect(luminance('#FFFFFF')).toBeCloseTo(1, 5)
    expect(luminance('#000000')).toBeCloseTo(0, 5)
    expect(rapport('encre', 'encre')).toBe(1)
  })
})
