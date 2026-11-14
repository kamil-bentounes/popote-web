import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { verifieAxe } from '../test/axe'
import { Coche, Croix, Fleche } from './icones'

const ICONES = { Coche, Croix, Fleche }

describe('icônes', () => {
  it.each(Object.entries(ICONES))('%s est un SVG de 24 sur 24, caché des lecteurs d’écran et hors de l’ordre du clavier', (_nom, Icone) => {
    const { container } = render(<Icone />)
    const svg = container.querySelector('svg')!
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveAttribute('focusable', 'false')
    expect(svg).toHaveClass('icone')
  })

  it('les trois ont une forme différente : la coche, la croix et la flèche ne se confondent pas sans leur couleur', () => {
    const traces = Object.values(ICONES).map((Icone) => render(<Icone />).container.querySelector('path')!.getAttribute('d'))
    expect(new Set(traces).size).toBe(3)
    expect(traces.every((d) => d && d.length > 5)).toBe(true)
  })

  it('laisse passer `className`', () => {
    const { container } = render(<Coche className="w-8" />)
    expect(container.querySelector('svg')).toHaveClass('icone', 'w-8')
  })

  it('reste caché même si un appelant en JavaScript lui donne un nom, un rôle ou la voix', () => {
    const glisse = { 'aria-hidden': false, 'aria-label': 'Fait', 'aria-labelledby': 'zz', role: 'img', tabIndex: 0, focusable: 'true', onClick: () => undefined } as object
    const { container } = render(<Croix {...glisse} />)
    const svg = container.querySelector('svg')!
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveAttribute('focusable', 'false')
    for (const attribut of ['aria-label', 'aria-labelledby', 'role', 'tabindex']) expect(svg).not.toHaveAttribute(attribut)
  })

  it('refuse par le type un rôle et un gestionnaire (un nom, à trait d’union, n’est vérifié que par le test d’exécution ci-dessus)', () => {
    // @ts-expect-error une icône décorative n'a pas de rôle
    // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- le rôle est refusé par le type : c'est le sujet du test
    const { container } = render(<><Coche role="img" /><Coche onClick={() => undefined} /></>)
    expect(container.querySelectorAll('svg[role]')).toHaveLength(0)
  })

  it('n’a aucune violation axe', async () => {
    const { container } = render(<><Coche /><Croix /><Fleche /></>)
    expect(await verifieAxe(container)).toEqual([])
  })
})
