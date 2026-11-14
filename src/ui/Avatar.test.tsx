import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { verifieAxe } from '../test/axe'
import { Avatar } from './Avatar'

describe('Avatar', () => {
  it('est une image nommée par la personne : la lettre est le dessin, le nom est celui qu’on lit', () => {
    render(<Avatar name="Léa" letter="L" tone="menthe" />)
    const avatar = screen.getByRole('img', { name: 'Léa' })
    expect(avatar).toHaveClass('avatar', 'avatar--menthe')
    expect(avatar).toHaveTextContent('L')
    expect(avatar).not.toHaveClass('avatar--libre')
  })

  it('est jaune par défaut', () => {
    render(<Avatar name="Sam" letter="S" />)
    expect(screen.getByRole('img', { name: 'Sam' }).className.split(' ')).toEqual(['avatar'])
  })

  it('la place libre est nommée « Place libre » sans que l’appelant le dise, et porte un signe, non une lettre', () => {
    render(<Avatar free />)
    const place = screen.getByRole('img', { name: 'Place libre' })
    expect(place).toHaveClass('avatar', 'avatar--libre')
    expect(place).toHaveTextContent('+')
  })

  it('la place libre peut dire ce qu’elle propose', () => {
    render(<Avatar free name="Inviter quelqu’un" />)
    expect(screen.getByRole('img', { name: 'Inviter quelqu’un' })).toHaveClass('avatar--libre')
  })

  it('la place libre montre toujours son signe, même si un appelant en JavaScript lui passe une lettre', () => {
    const lettre = { letter: 'L' } as object
    render(<Avatar free {...lettre} />)
    expect(screen.getByRole('img', { name: 'Place libre' })).toHaveTextContent('+')
    expect(screen.getByRole('img', { name: 'Place libre' })).not.toHaveTextContent('L')
  })

  it('une place libre au nom vide reprend « Place libre » ; une personne sans nom n’emprunte jamais ce nom', () => {
    const sansNom = { letter: 'L' } as object
    render(<><Avatar free name="" /><Avatar {...(sansNom as { name: string; letter: string })} /></>)
    expect(screen.getAllByRole('img').map((img) => img.getAttribute('aria-label'))).toEqual(['Place libre', null])
  })

  it('ni `aria-labelledby` ni `tone` glissés par un appelant en JavaScript ne changent le nom ni la teinte d’une place libre', () => {
    const glisses = { 'aria-labelledby': 'zz', tone: 'menthe' } as object
    render(<Avatar free {...glisses} />)
    const place = screen.getByRole('img', { name: 'Place libre' })
    expect(place).not.toHaveAttribute('aria-labelledby')
    expect(place).not.toHaveClass('avatar--menthe')
  })

  it('laisse passer `className` et les attributs', () => {
    render(<Avatar name="Léa" letter="L" className="p-2" data-exemple="oui" />)
    expect(screen.getByRole('img', { name: 'Léa' })).toHaveClass('p-2')
    expect(screen.getByRole('img', { name: 'Léa' })).toHaveAttribute('data-exemple', 'oui')
  })

  it('refuse par le type une personne sans nom, une place libre avec une lettre, un rôle', () => {
    // @ts-expect-error `name` est obligatoire pour une personne
    render(<Avatar letter="L" />)
    // @ts-expect-error une place libre n'a pas de lettre
    render(<Avatar free letter="L" />)
    // @ts-expect-error le rôle est posé par le composant
    render(<Avatar name="Léa" letter="L" role="presentation" />)
    render(<Avatar name="Sam" letter="S" />)
    expect(screen.getByRole('img', { name: 'Sam' })).toBeInTheDocument()
  })

  it('le nom passe par `name` : un `aria-label` glissé par ailleurs (JSX ne vérifie pas les attributs à trait d’union) ne le remplace pas', () => {
    const autre = { 'aria-label': 'Autre', role: 'presentation' } as object
    render(<Avatar name="Léa" letter="L" {...autre} />)
    expect(screen.getByRole('img', { name: 'Léa' })).toBeInTheDocument()
    expect(screen.queryByRole('presentation')).toBeNull()
  })

  it('n’est ni focalisable ni cliquable : aucun gestionnaire n’est posé', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn<() => void>()
    const interdits = { onClick, tabIndex: 0 } as object
    render(<Avatar name="Léa" letter="L" {...interdits} />)
    const avatar = screen.getByRole('img', { name: 'Léa' })
    await user.click(avatar)
    expect(onClick).not.toHaveBeenCalled()
    expect(avatar).not.toHaveAttribute('tabindex')
  })

  it('n’a aucune violation axe', async () => {
    const { container } = render(<><Avatar name="Sam" letter="S" /><Avatar name="Léa" letter="L" tone="menthe" /><Avatar free /></>)
    expect(await verifieAxe(container)).toEqual([])
  })
})
