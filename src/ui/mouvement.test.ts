import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { COURBES, DUREES, RANG_MAX, variantesEntree } from './mouvement'

const jetons = readFileSync(resolve(process.cwd(), 'src/styles/jetons.css'), 'utf8')
const jeton = (nom: string): string => {
  const valeur = new RegExp(`--${nom}:\\s*([^;]+);`).exec(jetons)?.[1]
  if (valeur === undefined) throw new Error(`jeton --${nom} introuvable dans jetons.css`)
  return valeur.trim()
}
const ms = (valeur: string): number => Number(/^(\d+)ms$/.exec(valeur)?.[1])
const courbe = (valeur: string): number[] => /^cubic-bezier\(([^)]+)\)/.exec(valeur)![1]!.split(',').map(Number)

describe('mouvement : les constantes sont celles des jetons', () => {
  it.each([
    ['entree', 'duree-entree'],
    ['decalageEntree', 'decalage-entree'],
    ['ecran', 'duree-ecran'],
    ['appui', 'duree-appui'],
  ] as const)('DUREES.%s vaut --%s', (cle, nom) => {
    expect(DUREES[cle]).toBe(ms(jeton(nom)))
  })

  it.each([
    ['rebond', 'ease-rebond'],
    ['sortie', 'ease-sortie'],
  ] as const)('COURBES.%s vaut --%s', (cle, nom) => {
    expect([...COURBES[cle]]).toEqual(courbe(jeton(nom)))
  })
})

describe('variantesEntree', () => {
  it('le premier élément (rang 0) n’a aucun retard : il porte le LCP', () => {
    expect(variantesEntree(0, false).transition.delay).toBe(0)
  })

  it('chaque rang retarde de 70 ms (en secondes pour Motion)', () => {
    expect(variantesEntree(2, false).transition.delay).toBe(0.14)
    expect(variantesEntree(3, false).transition.delay).toBe(0.21)
  })

  it('part de l’opacité nulle, monte de 36 px en rapetissé, et arrive à plat avec la courbe rebond', () => {
    const { initial, animate, transition } = variantesEntree(1, false)
    expect(initial).toEqual({ opacity: 0, y: 36, scale: 0.92 })
    expect(animate).toEqual({ opacity: 1, y: 0, scale: 1 })
    expect(transition.duration).toBe(0.55)
    expect(transition.ease).toEqual([0.34, 1.56, 0.64, 1])
  })

  it('au-delà du rang maximal, les éléments arrivent ensemble (l’entrée reste sous la seconde)', () => {
    const dernier = variantesEntree(RANG_MAX, false).transition.delay
    expect(variantesEntree(RANG_MAX + 25, false).transition.delay).toBe(dernier)
    expect(dernier + DUREES.entree / 1000).toBeLessThan(1.2)
  })

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])('refuse le rang %s', (rang) => {
    expect(() => variantesEntree(rang, false)).toThrow(RangeError)
  })

  describe('en mouvement réduit', () => {
    it.each([0, 2, RANG_MAX + 3])('rang %i : ni y, ni scale, ni rotate, seulement l’opacité, en 1 ms et sans retard', (rang) => {
      const { initial, animate, transition } = variantesEntree(rang, true)
      for (const etat of [initial, animate]) {
        expect(Object.keys(etat)).toEqual(['opacity'])
      }
      expect(transition.duration).toBe(0.001)
      expect(transition.delay).toBe(0)
    })
  })
})
