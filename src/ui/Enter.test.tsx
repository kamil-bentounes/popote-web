import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { verifieAxe } from '../test/axe'
import { Enter } from './Enter'
import { MotionProvider } from './MotionProvider'
import * as mouvement from './mouvement'

const dansLeFournisseur = (arbre: React.ReactNode, reduit = false) => render(<MotionProvider reduit={reduit}>{arbre}</MotionProvider>)

describe('Enter', () => {
  it('rend ses enfants, dans l’ordre du document', () => {
    dansLeFournisseur(
      <>
        <Enter rang={0}><p>Premier</p></Enter>
        <Enter rang={1}><p>Deuxième</p></Enter>
        <Enter rang={2}><p>Troisième</p></Enter>
      </>,
    )
    expect(screen.getAllByRole('paragraph').map((p) => p.textContent)).toEqual(['Premier', 'Deuxième', 'Troisième'])
  })

  it('est un `div` par défaut, et prend la balise demandée (une liste garde ses `li`)', () => {
    const { container } = dansLeFournisseur(
      <>
        <Enter rang={0}>Seul</Enter>
        <ul><Enter rang={1} as="li">Item</Enter></ul>
      </>,
    )
    expect(container.firstElementChild?.tagName).toBe('DIV')
    expect(screen.getByRole('listitem')).toHaveTextContent('Item')
  })

  it('laisse passer `className`', () => {
    const { container } = dansLeFournisseur(<Enter rang={0} className="flex">Seul</Enter>)
    expect(container.firstElementChild).toHaveClass('flex')
  })

  it('annonce son arrivée (`data-entree`), que l’écran et les tests peuvent attendre', async () => {
    const { container } = dansLeFournisseur(<Enter rang={3}>Seul</Enter>)
    await waitFor(() => expect(container.firstElementChild).toHaveAttribute('data-entree', 'arrive'))
  })

  // Le mouvement lui-même se prouve dans Chromium (`e2e/banc.entree.spec.ts`) ; ici, que `Enter` donne à la politique le rang reçu et la
  // préférence du fournisseur, sans les altérer (un rang décalé ferait attendre le premier élément, qui porte le LCP).
  it.each([
    [0, false],
    [3, false],
    [3, true],
  ])('demande à la politique le rang %i en mouvement réduit : %s', (rang, reduit) => {
    const variantes = vi.spyOn(mouvement, 'variantesEntree')
    dansLeFournisseur(<Enter rang={rang}>Seul</Enter>, reduit)
    expect(variantes).toHaveBeenCalledWith(rang, reduit)
    variantes.mockRestore()
  })

  it('refuse un rang invalide', () => {
    expect(() => dansLeFournisseur(<Enter rang={-1}>Seul</Enter>)).toThrow(RangeError)
  })

  it('n’a aucune violation axe', async () => {
    const { container } = dansLeFournisseur(<Enter rang={0}><h1>Ce soir</h1></Enter>)
    expect(await verifieAxe(container)).toEqual([])
  })
})
