import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ErreurRoute } from './ErreurRoute'

function monteAvecErreur(erreur: Error) {
  const racine = createRootRoute()
  const panne = createRoute({
    getParentRoute: () => racine,
    path: '/',
    component: () => {
      throw erreur
    },
    errorComponent: ErreurRoute,
  })
  const routeur = createRouter({
    routeTree: racine.addChildren([panne]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  const invalide = vi.spyOn(routeur, 'invalidate')
  render(<RouterProvider router={routeur} />)
  return { invalide }
}

afterEach(() => vi.restoreAllMocks())

describe('ErreurRoute, bouton « Réessayer »', () => {
  it('recharge la page quand un morceau de code n’a pas pu être chargé (la panne ne se répare pas autrement)', async () => {
    const recharge = vi.fn<() => void>()
    vi.stubGlobal('location', { ...window.location, reload: recharge })
    const user = userEvent.setup()
    const { invalide } = monteAvecErreur(
      new TypeError('Failed to fetch dynamically imported module: https://exemple.test/assets/entrer-abc.js'),
    )
    await user.click(await screen.findByRole('button', { name: 'Réessayer' }))
    expect(recharge).toHaveBeenCalledOnce()
    expect(invalide).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('rejoue le chargement de la route (invalidate) pour toute autre erreur', async () => {
    const recharge = vi.fn<() => void>()
    vi.stubGlobal('location', { ...window.location, reload: recharge })
    const user = userEvent.setup()
    const { invalide } = monteAvecErreur(new Error('x is undefined'))
    await user.click(await screen.findByRole('button', { name: 'Réessayer' }))
    expect(invalide).toHaveBeenCalled()
    expect(recharge).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('ne journalise rien de l’erreur reçue (le routeur et React s’en chargent ; F19 posera la référence)', async () => {
    const trace = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    monteAvecErreur(new Error('secret-journal'))
    await screen.findByRole('button', { name: 'Réessayer' })
    const appelsDeErreurRoute = trace.mock.calls.filter(([premier]) => premier === 'erreur de route')
    expect(appelsDeErreurRoute).toEqual([])
  })
})
