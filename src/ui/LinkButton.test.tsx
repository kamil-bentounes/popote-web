import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { verifieAxe } from '../test/axe'
import { LinkButton } from './LinkButton'

describe('LinkButton', () => {
  it('est un bouton d’action (un lien de navigation reste un <Link>), nommé par son libellé', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn<() => void>()
    render(<LinkButton onClick={onClick}>Annuler</LinkButton>)
    const bouton = screen.getByRole('button', { name: 'Annuler' })
    expect(screen.queryByRole('link')).toBeNull()
    expect(bouton).toHaveAttribute('type', 'button')
    expect(bouton).toHaveClass('lien')
    expect(bouton).not.toHaveClass('lien--danger')
    await user.click(bouton)
    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(onClick).toHaveBeenCalledTimes(3)
  })

  it('passe sa ref au bouton', () => {
    let ref: HTMLButtonElement | null = null
    render(<LinkButton ref={(noeud) => { ref = noeud }}>Annuler</LinkButton>)
    expect(ref).toBe(screen.getByRole('button', { name: 'Annuler' }))
  })

  it('la variante danger pose lien--danger et laisse passer className', () => {
    render(<LinkButton variant="danger" className="mt-2">Quitter Popote</LinkButton>)
    expect(screen.getByRole('button', { name: 'Quitter Popote' })).toHaveClass('lien', 'lien--danger', 'mt-2')
  })

  it('se désactive comme un bouton natif', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn<() => void>()
    render(<LinkButton disabled onClick={onClick}>Annuler</LinkButton>)
    await user.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it.each([['normal', <LinkButton key="a">Annuler</LinkButton>], ['danger', <LinkButton key="b" variant="danger">Quitter Popote</LinkButton>]])(
    'axe ne trouve rien (%s)',
    async (_nom, lien) => {
      const { container } = render(lien)
      expect(await verifieAxe(container)).toEqual([])
    },
  )
})
