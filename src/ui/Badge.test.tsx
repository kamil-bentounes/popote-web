import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { verifieAxe } from '../test/axe'
import { Badge } from './Badge'

describe('Badge', () => {
  it.each([
    ['jaune', []],
    ['menthe', ['pastille--menthe']],
    ['rose', ['pastille--rose']],
    ['lilas', ['pastille--lilas']],
  ] as const)('la teinte %s pose %j', (tone, classes) => {
    render(<Badge tone={tone}>Invitée</Badge>)
    expect(screen.getByText('Invitée').className.split(' ').sort()).toEqual(['pastille', ...classes].sort())
  })

  it('est un `span` jaune par défaut, qui laisse passer `className` et les attributs', () => {
    render(<Badge className="p-2" data-exemple="oui">512 kcal</Badge>)
    const pastille = screen.getByText('512 kcal')
    expect(pastille.tagName).toBe('SPAN')
    expect(pastille.className).toBe('pastille p-2')
    expect(pastille).toHaveAttribute('data-exemple', 'oui')
  })

  it('n’est ni un bouton, ni focalisable : le clavier la saute, elle ne porte aucun rôle', async () => {
    const user = userEvent.setup()
    render(<><Badge>C’est toi</Badge><button type="button">Après</button></>)
    expect(screen.queryByRole('button', { name: 'C’est toi' })).toBeNull()
    expect(screen.getByText('C’est toi')).not.toHaveAttribute('role')
    expect(screen.getByText('C’est toi')).not.toHaveAttribute('tabindex')
    await user.tab()
    expect(screen.getByRole('button', { name: 'Après' })).toHaveFocus()
  })

  it('refuse un gestionnaire, un rôle et un `tabindex` au type', () => {
    // @ts-expect-error une pastille informe, elle ne se touche pas
    render(<Badge onClick={() => undefined}>Non</Badge>)
    // @ts-expect-error pas de rôle non plus
    render(<Badge role="presentation">Non</Badge>)
    // @ts-expect-error ni de `tabIndex`
    render(<Badge tabIndex={0}>Non</Badge>)
    // @ts-expect-error ni la variante de capture d'un gestionnaire
    render(<Badge onClickCapture={() => undefined}>Non</Badge>)
    // @ts-expect-error ni un champ qui s'écrit
    render(<Badge contentEditable>Non</Badge>)
    render(<Badge>Oui</Badge>)
    expect(screen.getByText('Oui')).toHaveClass('pastille')
  })

  it('ignore à l’exécution ce que le type refuse (un appelant en JavaScript, une erreur de conversion)', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn<() => void>()
    const interdits = { onClick, onKeyDown: onClick, onPointerDown: onClick, role: 'presentation', tabIndex: 0 } as object
    render(<Badge {...interdits}>Mission du soir</Badge>)
    const pastille = screen.getByText('Mission du soir')
    await user.click(pastille)
    pastille.focus()
    await user.keyboard('{Enter}')
    expect(onClick).not.toHaveBeenCalled()
    expect(screen.queryByRole('button')).toBeNull()
    expect(pastille).not.toHaveAttribute('role')
    expect(pastille).not.toHaveAttribute('tabindex')
  })

  it('n’a aucune violation axe', async () => {
    const { container } = render(<><Badge>C’est toi</Badge><Badge tone="rose">Mission du soir</Badge></>)
    expect(await verifieAxe(container)).toEqual([])
  })
})
