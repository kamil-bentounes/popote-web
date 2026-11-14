import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { verifieAxe } from '../test/axe'
import { Screen } from './Screen'

describe('Screen', () => {
  it('est un `div`, pas un repère : la racine de l’appli a déjà son `main`, un second doublerait les repères (WCAG 1.3.1)', () => {
    const { container } = render(<Screen>Bonsoir</Screen>)
    expect(container.firstElementChild?.tagName).toBe('DIV')
    expect(screen.queryByRole('main')).not.toBeInTheDocument()
    expect(screen.getByText('Bonsoir')).toBeInTheDocument()
  })

  it('pose le fond crème et laisse passer `className` et les attributs', () => {
    const { container } = render(<Screen className="p-4" data-ecran="accueil">Bonsoir</Screen>)
    expect(container.firstElementChild).toHaveClass('bg-creme', 'p-4')
    expect(container.firstElementChild).toHaveAttribute('data-ecran', 'accueil')
  })

  it('n’a aucune violation axe', async () => {
    const { container } = render(<Screen><h1>Ce soir</h1></Screen>)
    expect(await verifieAxe(container)).toEqual([])
  })
})
