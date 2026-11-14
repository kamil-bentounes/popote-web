import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
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

  it.each([false, true])('appelle `onArrive` quand le mouvement est fini (mouvement réduit : %s)', async (reduit) => {
    const onArrive = vi.fn<() => void>()
    dansLeFournisseur(<Stamp onArrive={onArrive}>Mangé !</Stamp>, reduit)
    await waitFor(() => expect(onArrive).toHaveBeenCalledTimes(1))
    expect(screen.getByText('Mangé !')).toHaveAttribute('data-tampon', 'arrive')
  })

  // `waitFor` passe au premier appel et ne regarde pas après : on laisse le temps à un second appel de venir.
  const laisseLeTemps = () => new Promise((suite) => setTimeout(suite, 100))

  it('n’appelle `onArrive` qu’une fois en mode strict de React, qui joue chaque effet deux fois', async () => {
    const onArrive = vi.fn<() => void>()
    render(<StrictMode><MotionProvider><Stamp onArrive={onArrive}>Mangé !</Stamp></MotionProvider></StrictMode>)
    await waitFor(() => expect(onArrive).toHaveBeenCalled())
    await laisseLeTemps()
    expect(onArrive).toHaveBeenCalledTimes(1)
  })

  it('n’appelle pas `onArrive` de nouveau quand le mouvement réduit change en route', async () => {
    const onArrive = vi.fn<() => void>()
    const tampon = (reduit: boolean) => <MotionProvider reduit={reduit}><Stamp onArrive={onArrive}>Mangé !</Stamp></MotionProvider>
    const { rerender } = render(tampon(false))
    await waitFor(() => expect(onArrive).toHaveBeenCalled())
    rerender(tampon(true))
    await laisseLeTemps()
    expect(onArrive).toHaveBeenCalledTimes(1)
  })

  it('ignore à l’exécution les props de Motion que le type ignore : gestes, style, animation propre', async () => {
    const onTap = vi.fn<() => void>()
    const motion = { whileTap: { scale: 0.9 }, onTap, drag: true, style: { color: 'red' }, animate: { opacity: 0.3 } } as object
    dansLeFournisseur(<Stamp {...motion}>Mangé !</Stamp>)
    const tampon = screen.getByText('Mangé !')
    await waitFor(() => expect(tampon).toHaveAttribute('data-tampon', 'arrive'))
    expect(tampon).not.toHaveAttribute('tabindex')
    expect(tampon).not.toHaveAttribute('draggable')
    expect(tampon.style.color).toBe('')
    expect(tampon.style.touchAction).toBe('')
    expect(tampon.style.opacity).not.toBe('0.3')
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
