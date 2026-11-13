import { describe, expect, it } from 'vitest'
import { estEchecDeChargementDeModule } from './chargement-module'

describe('estEchecDeChargementDeModule', () => {
  it.each([
    'Failed to fetch dynamically imported module: https://exemple.test/assets/entrer-abc.js',
    'error loading dynamically imported module: https://exemple.test/assets/entrer-abc.js',
    'Importing a module script failed.',
  ])('reconnaît « %s » (Chrome, Firefox, Safari)', (message) => {
    expect(estEchecDeChargementDeModule(new TypeError(message))).toBe(true)
  })

  it('refuse une erreur ordinaire, un faux ami et une valeur qui n’est pas une erreur', () => {
    expect(estEchecDeChargementDeModule(new Error('x is undefined'))).toBe(false)
    expect(estEchecDeChargementDeModule(new Error('Le serveur a dit : Failed to fetch dynamically imported module'))).toBe(false)
    expect(estEchecDeChargementDeModule('Failed to fetch dynamically imported module')).toBe(false)
    expect(estEchecDeChargementDeModule(null)).toBe(false)
    expect(estEchecDeChargementDeModule(undefined)).toBe(false)
  })
})
