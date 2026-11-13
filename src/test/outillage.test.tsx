import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { verifieAxe } from './axe'

// Ces essais prouvent que l'outillage VOIT quelque chose : un banc de tests qui ne peut pas échouer
// ne protège de rien. Ils restent.
describe('verifieAxe', () => {
  it('voit un bouton sans nom', async () => {
    const { container } = render(
      <main>
        {/* oxlint-disable-next-line jsx-a11y/control-has-associated-label -- le défaut est le sujet du test */}
        <button type="button"></button>
      </main>,
    )
    expect(await verifieAxe(container)).toContain('button-name')
  })

  it('ne se plaint pas d’un bouton nommé', async () => {
    const { container } = render(
      <main>
        <button type="button">Enregistrer</button>
      </main>,
    )
    expect(await verifieAxe(container)).toEqual([])
  })
})

describe('l’environnement de test', () => {
  it('clique un bouton avec userEvent', async () => {
    const user = userEvent.setup()
    const surClic = vi.fn<() => void>()
    render(
      <button type="button" onClick={surClic}>
        Valider
      </button>,
    )
    await user.click(screen.getByRole('button', { name: 'Valider' }))
    expect(surClic).toHaveBeenCalledOnce()
  })

  it('offre les matchers de jest-dom', () => {
    render(<p>Bonjour</p>)
    expect(screen.getByText('Bonjour')).toBeInTheDocument()
  })

  it('a <dialog>.showModal', () => {
    expect(HTMLDialogElement.prototype.showModal).toBeTypeOf('function')
  })

  it('a matchMedia', () => {
    expect(window.matchMedia).toBeTypeOf('function')
  })

  it('nettoie le document entre deux tests', () => {
    expect(screen.queryByRole('button')).toBeNull()
  })
})
