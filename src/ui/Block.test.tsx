import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { verifieAxe } from '../test/axe'
import { Block } from './Block'

describe('Block', () => {
  it('est un `div` du système (`.bloc`) par défaut, qui porte ses enfants, sa classe et ses attributs', () => {
    render(<Block className="p-2" data-exemple="oui">Lasagnes</Block>)
    const bloc = screen.getByText('Lasagnes')
    expect(bloc.tagName).toBe('DIV')
    expect(bloc).toHaveClass('bloc', 'p-2')
    expect(bloc).toHaveAttribute('data-exemple', 'oui')
  })

  it.each([['section', 'SECTION'], ['article', 'ARTICLE'], ['div', 'DIV']] as const)('`as="%s"` rend un %s', (as, balise) => {
    render(<Block as={as}>Contenu</Block>)
    expect(screen.getByText('Contenu').tagName).toBe(balise)
  })

  it('une `section` nommée est une région : le nom vient de l’appelant', () => {
    render(<Block as="section" aria-label="Ce soir">Lasagnes</Block>)
    expect(screen.getByRole('region', { name: 'Ce soir' })).toHaveClass('bloc')
  })

  it('refuse par le type une balise qui n’est pas un conteneur', () => {
    // @ts-expect-error `button` n'est pas un conteneur : un bloc ne se touche pas
    render(<Block as="button">Non</Block>)
    render(<Block as="section">Oui</Block>)
    expect(screen.getByText('Oui').tagName).toBe('SECTION')
  })

  it('n’a aucune violation axe', async () => {
    const { container } = render(<Block as="article"><h2>Ce soir</h2></Block>)
    expect(await verifieAxe(container)).toEqual([])
  })
})
