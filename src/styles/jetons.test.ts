// @vitest-environment node
// Tailwind compile le vrai `index.css` : ce que le système permet produit une classe, ce que les défauts de
// Tailwind permettaient et que le système ferme ne produit RIEN (sinon `bg-red-500` contournerait le style).
import { compile } from '@tailwindcss/node'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const base = resolve(process.cwd(), 'src/styles')
const compilateur = await compile(readFileSync(resolve(base, 'index.css'), 'utf8'), { base, onDependency: () => undefined })
const produit = (...classes: string[]) => compilateur.build(classes)

// Une classe produite apparaît comme sélecteur ; l'échappement des « : » et « / » n'intervient pas ici.
const contient = (css: string, classe: string) => css.includes(`.${classe.replaceAll(':', '\\:')}`)

describe('les classes du système sont produites', () => {
  it.each(['bg-menthe', 'text-encre', 'text-titre-m', 'rounded-bloc', 'shadow-dur', 'shadow-dur-petit', 'ease-rebond', 'font-titre', 'font-texte'])(
    '%s',
    (classe) => {
      expect(contient(produit(classe), classe)).toBe(true)
    },
  )

  it('text-titre-m prend la taille du jeton', () => {
    expect(produit('text-titre-m')).toContain('2.125rem')
  })

  it('shadow-dur porte la VALEUR de l’ombre, non une référence à --shadow-dur', () => {
    const regle = /\.shadow-dur\s*\{[^}]*\}/.exec(produit('shadow-dur'))?.[0] ?? ''
    expect(regle).toContain('0 7px 0')
    expect(regle).not.toContain('var(--shadow-dur)')
  })
})

describe('les défauts de Tailwind sont fermés', () => {
  it.each([
    'bg-red-500', 'text-red-500', 'text-xl', 'rounded-xl', 'shadow-md', 'font-sans', 'font-mono', 'ease-in-out', 'animate-spin',
    'drop-shadow-lg', 'inset-shadow-sm', 'text-shadow-md', 'blur-sm', 'backdrop-blur-md', 'leading-tight', 'tracking-wide', 'perspective-near',
  ])(
    '%s ne produit rien',
    (classe) => {
      expect(contient(produit(classe), classe)).toBe(false)
    },
  )

  it('garde ce que la mise en page utilise : espacements, points de rupture, conteneurs, graisses', () => {
    const css = produit('p-4', 'sm:p-2', 'max-w-md', 'font-bold')
    expect(['p-4', 'sm:p-2', 'max-w-md', 'font-bold'].filter((classe) => !contient(css, classe))).toEqual([])
  })

  // Un défaut que Tailwind ajouterait dans une version future ne doit pas contourner le système en silence :
  // chaque variable du thème par défaut est soit fermée par un `--ns-*: initial`, soit admise comme mise en page.
  it('traite chaque variable du thème par défaut de Tailwind : fermée ou admise', () => {
    const defauts = readFileSync(resolve(process.cwd(), 'node_modules/tailwindcss/theme.css'), 'utf8')
    const noms = [...new Set([...defauts.matchAll(/(--[a-z0-9-]+)\s*:/g)].flatMap((paire) => (paire[1] ? [paire[1]] : [])))]
    const jetons = readFileSync(resolve(base, 'jetons.css'), 'utf8')
    const FERMES = ['color', 'text', 'radius', 'shadow', 'inset-shadow', 'drop-shadow', 'font', 'ease', 'animate', 'blur', 'perspective', 'leading', 'tracking', 'text-shadow']
    // Mise en page : gardés exprès (D3). `--font-weight-*` est admis AVANT `--font-*`, dont c'est un autre espace.
    const ADMIS = /^--(?:spacing|breakpoint-|container-|aspect-|font-weight-|default-|max-width-)/
    const inconnus: string[] = []
    for (const nom of noms) {
      if (ADMIS.test(nom)) continue
      // `--shadow` (sans suffixe) est la valeur de l'utilitaire `shadow` : même espace que `--shadow-*`.
      const espace = FERMES.filter((ns) => nom === `--${ns}` || nom.startsWith(`--${ns}-`)).sort((a, b) => b.length - a.length)[0]
      if (!espace || !jetons.includes(`--${espace}-*: initial`)) inconnus.push(nom)
    }
    expect(inconnus).toEqual([])
  })
})

describe('les jetons sont émis même sans utilitaire (@theme static) : Motion les lit en JavaScript', () => {
  it.each([
    ['--duree-appui', '90ms'],
    ['--ease-rebond', 'cubic-bezier(0.34, 1.56, 0.64, 1)'],
    ['--enfoncement', '6px'],
    ['--color-encre', '#2A1A4A'],
    ['--shadow-dur', 'var(--color-encre)'],
  ])('%s', (nom, valeur) => {
    const css = produit()
    expect(css).toContain(`${nom}:`)
    expect(css).toContain(valeur)
  })
})
