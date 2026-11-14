import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { verifieAxe } from '../test/axe'
import { Button } from './Button'

describe('Button', () => {
  it('est un bouton nommé par son libellé, qui ne soumet pas un formulaire par défaut', async () => {
    const user = userEvent.setup()
    const envoi = vi.fn<(e: React.FormEvent) => void>((e) => e.preventDefault())
    render(<form onSubmit={envoi}><Button>Continuer</Button></form>)
    const bouton = screen.getByRole('button', { name: 'Continuer' })
    expect(bouton).toHaveAttribute('type', 'button')
    await user.click(bouton)
    expect(envoi).not.toHaveBeenCalled()
  })

  it('pose les classes du système selon la variante et la taille, et laisse passer `className` et les attributs', () => {
    render(<Button variant="danger" size="petit" className="p-2" data-appuye>Supprimer</Button>)
    const bouton = screen.getByRole('button', { name: 'Supprimer' })
    expect(bouton).toHaveClass('bouton', 'bouton--danger', 'bouton--petit', 'p-2')
    expect(bouton).toHaveAttribute('data-appuye')
    expect(screen.getByRole('button', { name: 'Supprimer' })).not.toHaveClass('bouton--jaune')
  })

  it.each([
    ['principal', []],
    ['jaune', ['bouton--jaune']],
    ['blanc', ['bouton--blanc']],
  ] as const)('la variante %s pose %j', (variant, classes) => {
    render(<Button variant={variant}>Ok</Button>)
    const bouton = screen.getByRole('button', { name: 'Ok' })
    expect(bouton.className.split(' ').sort()).toEqual(['bouton', ...classes].sort())
  })

  it('passe sa ref au bouton (pour y rendre le focus)', () => {
    let ref: HTMLButtonElement | null = null
    render(<Button ref={(noeud) => { ref = noeud }}>Continuer</Button>)
    expect(ref).toBe(screen.getByRole('button', { name: 'Continuer' }))
  })

  it('appelle onClick au clic, à Entrée et à Espace', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn<() => void>()
    render(<Button onClick={onClick}>Continuer</Button>)
    await user.click(screen.getByRole('button'))
    expect(screen.getByRole('button')).toHaveFocus()
    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(onClick).toHaveBeenCalledTimes(3)
  })

  describe('occupé', () => {
    it('pose aria-busy et aria-disabled, garde son nom et reste focalisable', async () => {
      const user = userEvent.setup()
      render(<Button busy>Un instant</Button>)
      const bouton = screen.getByRole('button', { name: 'Un instant' })
      expect(bouton).toHaveAttribute('aria-busy', 'true')
      expect(bouton).toHaveAttribute('aria-disabled', 'true')
      expect(bouton).not.toBeDisabled()
      await user.tab()
      expect(bouton).toHaveFocus()
    })

    it('n’appelle plus rien au clic, à Entrée ni à Espace (revue 9 : aria-busy seul ne bloque pas le clavier)', async () => {
      const user = userEvent.setup()
      const onClick = vi.fn<() => void>()
      render(<Button busy onClick={onClick}>Un instant</Button>)
      await user.tab()
      await user.keyboard('{Enter}')
      await user.keyboard(' ')
      await user.click(screen.getByRole('button'))
      expect(onClick).not.toHaveBeenCalled()
    })

    it('ne soumet pas le formulaire dont il est le bouton d’envoi', async () => {
      const user = userEvent.setup()
      const envoi = vi.fn<(e: React.FormEvent) => void>((e) => e.preventDefault())
      render(<form onSubmit={envoi}><Button type="submit" busy>Envoyer</Button></form>)
      await user.tab()
      await user.keyboard('{Enter}')
      await user.click(screen.getByRole('button'))
      expect(envoi).not.toHaveBeenCalled()
    })

    it('un bouton d’envoi qui n’est pas occupé soumet le formulaire', async () => {
      const user = userEvent.setup()
      const envoi = vi.fn<(e: React.FormEvent) => void>((e) => e.preventDefault())
      render(<form onSubmit={envoi}><Button type="submit">Envoyer</Button></form>)
      await user.click(screen.getByRole('button', { name: 'Envoyer' }))
      expect(envoi).toHaveBeenCalledTimes(1)
    })

    it('garde le même nom et le même contenu qu’au repos (le rond qui tourne est décoratif, dessiné en CSS)', () => {
      const { rerender } = render(<Button>Un instant</Button>)
      const avant = screen.getByRole('button').textContent
      rerender(<Button busy>Un instant</Button>)
      expect(screen.getByRole('button', { name: 'Un instant' }).textContent).toBe(avant)
    })

    it('ne pose rien de tout cela quand il n’est plus occupé', () => {
      render(<Button busy={false}>Continuer</Button>)
      const bouton = screen.getByRole('button')
      expect(bouton).not.toHaveAttribute('aria-busy')
      expect(bouton).not.toHaveAttribute('aria-disabled')
    })
  })

  describe('pause (compte à rebours)', () => {
    it('pose aria-disabled sans aria-busy, reste focalisable, et n’appelle jamais onClick', async () => {
      const user = userEvent.setup()
      const onClick = vi.fn<() => void>()
      render(<Button pause onClick={onClick}>Renvoyer</Button>)
      const bouton = screen.getByRole('button', { name: 'Renvoyer' })
      expect(bouton).toHaveAttribute('aria-disabled', 'true')
      expect(bouton).not.toHaveAttribute('aria-busy')
      expect(bouton).not.toBeDisabled()
      await user.tab()
      expect(bouton).toHaveFocus()
      await user.keyboard('{Enter}')
      await user.keyboard(' ')
      await user.click(bouton)
      expect(onClick).not.toHaveBeenCalled()
    })
  })

  describe('désactivé', () => {
    it('est désactivé pour de bon (disabled natif) : il sort de l’ordre du clavier', async () => {
      const user = userEvent.setup()
      const onClick = vi.fn<() => void>()
      render(<><Button disabled onClick={onClick}>Continuer</Button><Button>Suite</Button></>)
      expect(screen.getByRole('button', { name: 'Continuer' })).toBeDisabled()
      await user.tab()
      expect(screen.getByRole('button', { name: 'Suite' })).toHaveFocus()
      await user.click(screen.getByRole('button', { name: 'Continuer' }))
      expect(onClick).not.toHaveBeenCalled()
    })
  })

  it('ne laisse pas choisir un autre type que button ou submit (le type est fermé par le typage)', () => {
    // @ts-expect-error `reset` n'est pas offert : il viderait un formulaire sans que personne l'ait demandé
    render(<Button type="reset">Vider</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it.each([
    ['au repos', <Button key="a">Continuer</Button>],
    ['occupé', <Button key="b" busy>Un instant</Button>],
    ['en pause', <Button key="c" pause>Renvoyer</Button>],
    ['désactivé', <Button key="d" disabled>Continuer</Button>],
    ['danger petit', <Button key="e" variant="danger" size="petit">Supprimer</Button>],
  ])('axe ne trouve rien (%s)', async (_nom, bouton) => {
    const { container } = render(bouton)
    expect(await verifieAxe(container)).toEqual([])
  })
})
