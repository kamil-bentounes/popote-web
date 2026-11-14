import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { verifieAxe } from '../test/axe'
import { Ground } from './Ground'
import { Sun } from './Sun'

describe('Sun', () => {
  it.each([
    [undefined, ['soleil']],
    ['ciel', ['soleil', 'soleil--ciel']],
    ['rose', ['soleil', 'soleil--rose']],
  ] as const)('la variante %s pose %j', (variant, attendues) => {
    const { container } = render(<Sun variant={variant} />)
    expect([...container.firstElementChild!.classList].sort()).toEqual([...attendues].sort())
  })

  it('est décoratif : caché des lecteurs d’écran, sans rôle, sans texte, et le clavier le saute', async () => {
    const user = userEvent.setup()
    const { container, getByRole } = render(<><Sun /><button type="button">Après</button></>)
    const soleil = container.firstElementChild!
    expect(soleil.tagName).toBe('DIV')
    expect(soleil).toHaveAttribute('aria-hidden', 'true')
    expect(soleil).not.toHaveAttribute('role')
    expect(soleil).not.toHaveAttribute('tabindex')
    expect(soleil).toBeEmptyDOMElement()
    await user.tab()
    expect(getByRole('button', { name: 'Après' })).toHaveFocus()
  })

  it('laisse passer `className`, mais ne laisse pas l’appelant le rendre lisible ni touchable (type et exécution)', () => {
    const { container } = render(<Sun className="top-[190px]" />)
    expect(container.firstElementChild).toHaveClass('soleil', 'top-[190px]')
    // @ts-expect-error un décor ne se touche pas
    render(<Sun onClick={() => undefined} />)
    // @ts-expect-error ni ne prend de rôle
    render(<Sun role="presentation" />)
    const interdits = { role: 'img', tabIndex: 0, 'aria-hidden': 'false' } as object
    const { container: conteneur } = render(<Sun {...interdits} />)
    expect(conteneur.firstElementChild).toHaveAttribute('aria-hidden', 'true')
    expect(conteneur.firstElementChild).not.toHaveAttribute('role')
    expect(conteneur.firstElementChild).not.toHaveAttribute('tabindex')
  })

  it('ignore à l’exécution du texte, un style et une teinte inconnue : un décor est muet et sans style propre', () => {
    const interdits = { children: 'texte', style: { color: 'red' } } as object
    const { container } = render(<Sun {...interdits} variant={'foo' as 'ciel'} />)
    const soleil = container.firstElementChild as HTMLElement
    expect(soleil).toBeEmptyDOMElement()
    expect(soleil.style.color).toBe('')
    expect(soleil.className).toBe('soleil')
  })

  it('n’a aucune violation axe', async () => {
    const { container } = render(<main><h1>Ce lien a expiré</h1><Sun variant="ciel" /><Ground /></main>)
    expect(await verifieAxe(container)).toEqual([])
  })
})

describe('Ground', () => {
  it('est le sol du système, décoratif, jamais focalisable', () => {
    const { container } = render(<Ground className="top-[190px]" />)
    const sol = container.firstElementChild!
    expect(sol).toHaveClass('sol', 'top-[190px]')
    expect(sol).toHaveAttribute('aria-hidden', 'true')
    expect(sol).not.toHaveAttribute('tabindex')
    expect(sol).toBeEmptyDOMElement()
  })

  it('ignore à l’exécution du texte et un style', () => {
    const interdits = { children: 'texte', style: { color: 'red' } } as object
    const { container } = render(<Ground {...interdits} />)
    expect(container.firstElementChild).toBeEmptyDOMElement()
    expect((container.firstElementChild as HTMLElement).style.color).toBe('')
  })

  it('ignore à l’exécution un rôle, un `tabindex` ou un `aria-hidden` contraire', () => {
    const interdits = { role: 'img', tabIndex: 0, 'aria-hidden': 'false' } as object
    const { container } = render(<Ground {...interdits} />)
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
    expect(container.firstElementChild).not.toHaveAttribute('role')
    expect(container.firstElementChild).not.toHaveAttribute('tabindex')
  })
})
