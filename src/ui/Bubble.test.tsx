import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { verifieAxe } from '../test/axe'
import { Bubble } from './Bubble'

describe('Bubble', () => {
  it('est un paragraphe du système (`.bulle`), sans région : une bulle muette ne s’annonce pas', () => {
    render(<Bubble className="p-2" data-exemple="oui">Bonsoir !</Bubble>)
    const bulle = screen.getByText('Bonsoir !')
    expect(bulle.tagName).toBe('P')
    expect(bulle).toHaveClass('bulle', 'p-2')
    expect(bulle).toHaveAttribute('data-exemple', 'oui')
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('`announce` en fait une région `status` : c’est l’assistant qui parle', () => {
    render(<Bubble announce>Bonsoir !</Bubble>)
    expect(screen.getByRole('status')).toHaveTextContent('Bonsoir !')
    expect(screen.getByRole('status')).toHaveClass('bulle')
    // `status` est poli par défaut : aucun `aria-live` écrit à la main ne doit le couper ou le durcir.
    expect(screen.getByRole('status')).not.toHaveAttribute('aria-live')
  })

  it('la région reste le même nœud quand le texte change : seul son contenu bouge, ce qui l’annonce', () => {
    const { rerender } = render(<Bubble announce>Un instant…</Bubble>)
    const region = screen.getByRole('status')
    rerender(<Bubble announce>Voici ta semaine.</Bubble>)
    expect(screen.getByRole('status')).toBe(region)
    expect(region).toHaveTextContent('Voici ta semaine.')
  })

  it('refuse un rôle écrit à la main : `announce` est le seul moyen d’en poser un', () => {
    // @ts-expect-error le rôle passe par `announce`
    render(<Bubble role="alert">Non</Bubble>)
    render(<Bubble>Oui</Bubble>)
    expect(screen.getByText('Oui')).not.toHaveAttribute('role')
  })

  it('n’a aucune violation axe', async () => {
    const { container } = render(<><Bubble>Bonsoir !</Bubble><Bubble announce>Voici ta semaine.</Bubble></>)
    expect(await verifieAxe(container)).toEqual([])
  })
})
