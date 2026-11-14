import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { verifieAxe } from '../test/axe'
import { MotionProvider } from './MotionProvider'
import * as mouvement from './mouvement'
import { Stamp } from './Stamp'

const dansLeFournisseur = (arbre: React.ReactNode, reduit = false) => render(<MotionProvider reduit={reduit}>{arbre}</MotionProvider>)

describe('Stamp', () => {
  it('rend son texte dans un `span` du système, sans rôle : il récompense, il ne se touche pas', async () => {
    const user = userEvent.setup()
    dansLeFournisseur(<><Stamp>Mangé !</Stamp><button type="button">Après</button></>)
    const tampon = screen.getByText('Mangé !')
    expect(tampon.tagName).toBe('SPAN')
    expect(tampon).toHaveClass('tampon')
    expect(tampon).not.toHaveAttribute('role')
    expect(tampon).not.toHaveAttribute('tabindex')
    await user.tab()
    expect(screen.getByRole('button', { name: 'Après' })).toHaveFocus()
  })

  it('laisse passer `className`, refuse un gestionnaire au type et le retire à l’exécution', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn<() => void>()
    // @ts-expect-error un tampon ne se touche pas
    dansLeFournisseur(<Stamp onClick={onClick}>Non</Stamp>)
    await user.click(screen.getByText('Non'))
    expect(onClick).not.toHaveBeenCalled()
    dansLeFournisseur(<Stamp className="absolute">Oui</Stamp>)
    expect(screen.getByText('Oui')).toHaveClass('tampon', 'absolute')
  })

  it.each([false, true])('appelle `onArrive` une fois, quand le mouvement est fini (mouvement réduit : %s)', async (reduit) => {
    const onArrive = vi.fn<() => void>()
    dansLeFournisseur(<Stamp onArrive={onArrive}>Mangé !</Stamp>, reduit)
    await waitFor(() => expect(onArrive).toHaveBeenCalledTimes(1))
    expect(screen.getByText('Mangé !')).toHaveAttribute('data-tampon', 'arrive')
  })

  it('annonce son arrivée par `data-tampon`, que les tests et les écrans peuvent attendre', async () => {
    dansLeFournisseur(<Stamp>Mangé !</Stamp>)
    await waitFor(() => expect(screen.getByText('Mangé !')).toHaveAttribute('data-tampon', 'arrive'))
  })

  // Le mouvement lui-même se prouve dans Chromium (`e2e/banc.tampon.spec.ts`) ; ici, que `Stamp` demande à la politique la préférence du fournisseur.
  it.each([false, true])('demande à la politique le mouvement réduit : %s', (reduit) => {
    const variantes = vi.spyOn(mouvement, 'variantesTampon')
    dansLeFournisseur(<Stamp>Mangé !</Stamp>, reduit)
    expect(variantes).toHaveBeenCalledWith(reduit)
    variantes.mockRestore()
  })

  it('n’a aucune violation axe', async () => {
    const { container } = dansLeFournisseur(<Stamp>Mangé !</Stamp>)
    expect(await verifieAxe(container)).toEqual([])
  })
})
