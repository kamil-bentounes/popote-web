import { describe, expect, it } from 'vitest'
import { borneLaPart } from './pourcentage'

describe('borneLaPart', () => {
  it.each([
    [0, 0],
    [64, 64],
    [100, 100],
    [150, 100],
    [-3, 0],
    [Number.NaN, 0],
    [Number.POSITIVE_INFINITY, 100],
    [Number.NEGATIVE_INFINITY, 0],
  ])('%s devient %s', (entree, attendu) => {
    expect(borneLaPart(entree)).toBe(attendu)
  })

  it('arrondit au centième : un exposant (1e-7) n’est pas une longueur CSS', () => {
    expect(borneLaPart(33.33333)).toBe(33.33)
    expect(borneLaPart(0.0000001)).toBe(0)
    expect(String(borneLaPart(0.0000001))).not.toContain('e')
  })
})
