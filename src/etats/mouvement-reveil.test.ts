import { describe, expect, it } from 'vitest'
import { COURBES, DUREES } from '../ui/mouvement'
import { variantesEcran } from './mouvement-reveil'

describe('variantesEcran', () => {
  it('fait fondre l’écran à l’entrée, et le fait monter en s’effaçant à la sortie, avec la durée et la courbe des jetons', () => {
    const mouvement = variantesEcran(false)
    expect(mouvement.initial).toEqual({ opacity: 0 })
    expect(mouvement.exit.y).toBeLessThan(0)
    expect(mouvement.transition).toEqual({ duration: DUREES.ecran / 1000, ease: COURBES.sortie })
  })

  it('ne déplace rien en mouvement réduit : l’opacité seule, en 1 ms', () => {
    const mouvement = variantesEcran(true)
    expect(Object.keys(mouvement.exit)).not.toContain('y')
    expect(Object.keys(mouvement.initial)).toEqual(['opacity'])
    expect(mouvement.transition).toEqual({ duration: 0.001 })
  })

  it.each([true, false])('ne retient plus les clics pendant que l’écran part (réduit : %s)', (reduit) => {
    expect(variantesEcran(reduit).exit.pointerEvents).toBe('none')
  })
})
