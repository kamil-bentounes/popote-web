import { render, screen, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { verifieAxe } from '../test/axe'
import { Gauge } from './Gauge'
import { MotionProvider } from './MotionProvider'
import * as mouvement from './mouvement'

const dansLeFournisseur = (arbre: React.ReactNode, reduit = false) => render(<MotionProvider reduit={reduit}>{arbre}</MotionProvider>)
const barre = () => screen.getByRole('progressbar').querySelector('i')!

describe('Gauge', () => {
  it('est une barre de progression nommée, de 0 à 100, qui dit sa valeur : jamais la couleur seule', () => {
    dansLeFournisseur(<Gauge name="Énergie du jour" value={64} />)
    const jauge = screen.getByRole('progressbar', { name: 'Énergie du jour' })
    expect(jauge).toHaveClass('jauge')
    expect(jauge).toHaveAttribute('aria-valuemin', '0')
    expect(jauge).toHaveAttribute('aria-valuemax', '100')
    expect(jauge).toHaveAttribute('aria-valuenow', '64')
  })

  it.each([
    [150, '100'],
    [-3, '0'],
    [Number.NaN, '0'],
    [Number.POSITIVE_INFINITY, '100'],
  ])('une valeur de %s se lit %s : la jauge ne déborde pas et ne dit jamais « NaN »', async (valeur, lue) => {
    dansLeFournisseur(<Gauge name="Énergie" value={valeur} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', lue)
    await waitFor(() => expect(barre().style.getPropertyValue('--part')).toBe(`${lue}%`))
  })

  it('remplit sa barre à la part demandée (`--part`, que le CSS du système lit)', async () => {
    dansLeFournisseur(<Gauge name="Énergie" value={64} />)
    await waitFor(() => expect(barre().style.getPropertyValue('--part')).toBe('64%'))
  })

  it('suit la valeur quand elle change', async () => {
    const { rerender } = dansLeFournisseur(<Gauge name="Énergie" value={20} />)
    rerender(<MotionProvider><Gauge name="Énergie" value={80} /></MotionProvider>)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '80')
    await waitFor(() => expect(barre().style.getPropertyValue('--part')).toBe('80%'))
  })

  it('est tomate par défaut ; `tone="ciel"` pose la variante du système', () => {
    dansLeFournisseur(<><Gauge name="Énergie" value={10} /><Gauge name="Protéines" value={10} tone="ciel" /></>)
    expect(screen.getByRole('progressbar', { name: 'Énergie' }).className.split(' ')).toEqual(['jauge'])
    expect(screen.getByRole('progressbar', { name: 'Protéines' })).toHaveClass('jauge', 'jauge--ciel')
  })

  describe('les rayures ne défilent que pendant l’arrivée (WCAG 2.2.2)', () => {
    it('une jauge qui repart sur une nouvelle valeur finit elle aussi sans `data-anime`', async () => {
      const { rerender } = dansLeFournisseur(<Gauge name="Énergie" value={10} />)
      rerender(<MotionProvider><Gauge name="Énergie" value={90} /></MotionProvider>)
      await waitFor(() => expect(barre().style.getPropertyValue('--part')).toBe('90%'))
      await waitFor(() => expect(barre()).not.toHaveAttribute('data-anime'))
      await new Promise((suite) => setTimeout(suite, 50))
      expect(barre()).not.toHaveAttribute('data-anime')
    })

    it('pose puis retire `data-anime` : l’attribut passe bien par « posé » (il n’est pas absent depuis toujours)', async () => {
      const vus: boolean[] = []
      const observateur = new MutationObserver(() => {
        const element = document.querySelector('[role=progressbar] > i')
        if (element) vus.push(element.hasAttribute('data-anime'))
      })
      observateur.observe(document.body, { attributes: true, subtree: true, childList: true, attributeFilter: ['data-anime'] })
      dansLeFournisseur(<Gauge name="Énergie" value={64} />)
      await waitFor(() => expect(barre()).not.toHaveAttribute('data-anime'))
      await new Promise((suite) => setTimeout(suite, 50))
      observateur.disconnect()
      // Au moins un instant où il était posé, et le dernier où il ne l'est plus.
      expect(vus).toContain(true)
      expect(vus.at(-1)).toBe(false)
    })
  })

  it('en mode strict de React, la barre finit au repos et à la bonne valeur', async () => {
    render(<StrictMode><MotionProvider><Gauge name="Énergie" value={64} /></MotionProvider></StrictMode>)
    await waitFor(() => expect(barre().style.getPropertyValue('--part')).toBe('64%'))
    await waitFor(() => expect(barre()).not.toHaveAttribute('data-anime'))
  })

  it('demande à la politique la part bornée et le mouvement réduit du fournisseur', () => {
    const variantes = vi.spyOn(mouvement, 'variantesJauge')
    dansLeFournisseur(<Gauge name="Énergie" value={150} />, true)
    expect(variantes).toHaveBeenCalledWith(100, true)
    variantes.mockRestore()
  })

  it('ne se touche pas : ni gestionnaire, ni rôle, ni `tabindex`, ni `style`, au type comme à l’exécution', () => {
    const glisse = { onClick: () => undefined, tabIndex: 0, role: 'button', style: { color: 'red' }, children: 'x', whileHover: { scale: 2 } } as object
    // @ts-expect-error une jauge informe, elle ne se touche pas
    dansLeFournisseur(<Gauge name="Énergie" value={1} onClick={() => undefined} />)
    // @ts-expect-error ni de rôle : c'est elle qui pose `progressbar`
    // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- le rôle est refusé par le type : c'est le sujet du test
    dansLeFournisseur(<Gauge name="Autre" value={1} role="button" />)
    dansLeFournisseur(<Gauge name="Troisième" value={1} {...glisse} />)
    const jauge = screen.getByRole('progressbar', { name: 'Troisième' })
    expect(jauge).not.toHaveAttribute('tabindex')
    expect(jauge).not.toHaveAttribute('style')
    expect(jauge.querySelector('i')).toBeEmptyDOMElement()
  })

  it('pose son nom et ses bornes après les attributs de l’appelant : un `aria-valuenow` ou `aria-labelledby` glissé ne les remplace pas', () => {
    const glisse = { 'aria-valuenow': 3, 'aria-valuemax': 10, 'aria-valuemin': 5, 'aria-label': 'Faux', 'aria-labelledby': 'zz', 'aria-valuetext': 'trois' } as object
    dansLeFournisseur(<Gauge name="Énergie" value={64} {...glisse} />)
    const jauge = screen.getByRole('progressbar', { name: 'Énergie' })
    expect(jauge).toHaveAttribute('aria-valuenow', '64')
    expect(jauge).toHaveAttribute('aria-valuemax', '100')
    expect(jauge).toHaveAttribute('aria-valuemin', '0')
    expect(jauge).not.toHaveAttribute('aria-labelledby')
    expect(jauge).not.toHaveAttribute('aria-valuetext')
  })

  it('laisse passer `className` et `aria-describedby`', () => {
    dansLeFournisseur(<Gauge name="Énergie" value={1} className="mb-2" aria-describedby="aide" data-exemple="oui" />)
    const jauge = screen.getByRole('progressbar')
    expect(jauge).toHaveClass('jauge', 'mb-2')
    expect(jauge).toHaveAttribute('aria-describedby', 'aide')
    expect(jauge).toHaveAttribute('data-exemple', 'oui')
  })

  it.each(['', '   '])('refuse un nom vide (%j) : une barre sans nom', (nom) => {
    const silence = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() => dansLeFournisseur(<Gauge name={nom} value={10} />)).toThrow(RangeError)
    silence.mockRestore()
  })

  it('n’a aucune violation axe', async () => {
    const { container } = dansLeFournisseur(<><Gauge name="Énergie" value={64} /><Gauge name="Protéines" value={56} tone="ciel" /></>)
    expect(await verifieAxe(container)).toEqual([])
  })
})
