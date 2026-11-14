import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { verifieAxe } from '../test/axe'
import { MotionProvider } from './MotionProvider'
import * as mouvement from './mouvement'
import { Steps, type Step } from './Steps'

const dansLeFournisseur = (arbre: React.ReactNode, reduit = false) => render(<MotionProvider reduit={reduit}>{arbre}</MotionProvider>)

const INVITATION: Step[] = [
  { label: 'Envoyée', done: true },
  { label: 'Ouverte', done: true },
  { label: 'Arrivée', done: false },
]

describe('Steps', () => {
  it('est une liste nommée dont chaque étape est un élément : les lecteurs d’écran en annoncent le nombre', () => {
    dansLeFournisseur(<Steps name="Suivi de l’invitation" steps={INVITATION} />)
    const liste = screen.getByRole('list', { name: 'Suivi de l’invitation' })
    expect(liste.tagName).toBe('OL')
    expect(liste).toHaveClass('suivi')
    expect(within(liste).getAllByRole('listitem')).toHaveLength(3)
  })

  it('dit « faite » ou « à venir » en texte : la couleur et la coche ne sont pas seules', () => {
    dansLeFournisseur(<Steps name="Suivi" steps={INVITATION} />)
    const [envoyee, ouverte, arrivee] = screen.getAllByRole('listitem')
    expect(envoyee).toHaveTextContent('Envoyée, faite')
    expect(ouverte).toHaveTextContent('Ouverte, faite')
    expect(arrivee).toHaveTextContent('Arrivée, à venir')
  })

  it('pose `data-fait` et une coche SVG cachée sur les étapes faites seulement', () => {
    dansLeFournisseur(<Steps name="Suivi" steps={INVITATION} />)
    const [envoyee, ouverte, arrivee] = screen.getAllByRole('listitem')
    for (const faite of [envoyee, ouverte]) {
      expect(faite).toHaveAttribute('data-fait')
      expect(faite!.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    }
    expect(arrivee).not.toHaveAttribute('data-fait')
    expect(arrivee!.querySelector('svg')).toBeNull()
  })

  it('`aria-current="step"` est sur la dernière étape faite, et sur elle seule', () => {
    dansLeFournisseur(<Steps name="Suivi" steps={INVITATION} />)
    const courants = screen.getAllByRole('listitem').filter((li) => li.hasAttribute('aria-current'))
    expect(courants).toHaveLength(1)
    expect(courants[0]).toHaveTextContent('Ouverte')
    expect(courants[0]).toHaveAttribute('aria-current', 'step')
  })

  it('aucune étape faite : aucune n’est courante ; toutes faites : la dernière l’est', () => {
    const { unmount } = dansLeFournisseur(<Steps name="Suivi" steps={INVITATION.map((e) => ({ ...e, done: false }))} />)
    expect(screen.getAllByRole('listitem').some((li) => li.hasAttribute('aria-current'))).toBe(false)
    unmount()
    dansLeFournisseur(<Steps name="Suivi" steps={INVITATION.map((e) => ({ ...e, done: true }))} />)
    const items = screen.getAllByRole('listitem')
    expect(items.map((li) => li.hasAttribute('aria-current'))).toEqual([false, false, true])
  })

  it('une étape faite après une étape à venir (liste désordonnée) reste courante si elle est la dernière faite', () => {
    dansLeFournisseur(<Steps name="Suivi" steps={[{ label: 'A', done: false }, { label: 'B', done: true }, { label: 'C', done: false }]} />)
    expect(screen.getAllByRole('listitem').map((li) => li.hasAttribute('aria-current'))).toEqual([false, true, false])
  })

  it('rend le remplissage de chaque étape faite par Motion, de 0 à 100 %, et rien pour les étapes à venir', async () => {
    dansLeFournisseur(<Steps name="Suivi" steps={INVITATION} />)
    const [envoyee, , arrivee] = screen.getAllByRole('listitem')
    await waitFor(() => expect(envoyee!.querySelector('.suivi-remplit')).toHaveStyle({ width: '100%' }))
    expect(arrivee!.querySelector('.suivi-remplit')).toBeNull()
  })

  it('une étape qui devient faite se remplit alors', async () => {
    const { rerender } = dansLeFournisseur(<Steps name="Suivi" steps={INVITATION} />)
    rerender(<MotionProvider><Steps name="Suivi" steps={INVITATION.map((e) => ({ ...e, done: true }))} /></MotionProvider>)
    const arrivee = screen.getAllByRole('listitem')[2]!
    expect(arrivee).toHaveAttribute('data-fait')
    await waitFor(() => expect(arrivee.querySelector('.suivi-remplit')).toHaveStyle({ width: '100%' }))
    expect(arrivee).toHaveAttribute('aria-current', 'step')
  })

  it('demande à la politique le mouvement réduit du fournisseur', () => {
    const variantes = vi.spyOn(mouvement, 'variantesRemplissage')
    dansLeFournisseur(<Steps name="Suivi" steps={INVITATION} />, true)
    expect(variantes).toHaveBeenCalledWith(true)
    variantes.mockRestore()
  })

  it('ne se touche pas : une étape n’entre pas dans l’ordre du clavier', async () => {
    const user = userEvent.setup()
    dansLeFournisseur(<><Steps name="Suivi" steps={INVITATION} /><button type="button">Après</button></>)
    await user.tab()
    expect(screen.getByRole('button', { name: 'Après' })).toHaveFocus()
  })

  it('pose son nom et `aria-current` elle-même : ce que glisse un appelant en JavaScript ne les remplace pas', () => {
    const glisse = { 'aria-labelledby': 'zz', 'aria-label': 'Faux', role: 'tablist', onClick: () => undefined, tabIndex: 0, style: { color: 'red' } } as object
    dansLeFournisseur(<Steps name="Suivi" steps={INVITATION} {...glisse} />)
    const liste = screen.getByRole('list', { name: 'Suivi' })
    expect(liste).not.toHaveAttribute('aria-labelledby')
    expect(liste).not.toHaveAttribute('role')
    expect(liste).not.toHaveAttribute('tabindex')
    expect(liste).not.toHaveAttribute('style')
  })

  it('refuse par le type une liste sans nom, un rôle et un gestionnaire', () => {
    // @ts-expect-error une liste de suivi se nomme
    dansLeFournisseur(<Steps steps={INVITATION} />)
    // @ts-expect-error ni de rôle
    dansLeFournisseur(<Steps name="Suivi" steps={INVITATION} role="tablist" />)
    // @ts-expect-error ni de gestionnaire
    dansLeFournisseur(<Steps name="Suivi" steps={INVITATION} onClick={() => undefined} />)
    expect(screen.getAllByRole('list')).toHaveLength(3)
  })

  it('laisse passer `className` et les attributs de données', () => {
    dansLeFournisseur(<Steps name="Suivi" steps={INVITATION} className="mt-2" data-exemple="oui" />)
    expect(screen.getByRole('list')).toHaveClass('suivi', 'mt-2')
    expect(screen.getByRole('list')).toHaveAttribute('data-exemple', 'oui')
  })

  it('n’a aucune violation axe', async () => {
    const { container } = dansLeFournisseur(<Steps name="Suivi de l’invitation" steps={INVITATION} />)
    expect(await verifieAxe(container)).toEqual([])
  })
})
