import { QueryClient } from '@tanstack/react-query'
import { createMemoryHistory, createRootRouteWithContext, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import { act, render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { evenements } from '../api/evenements'
import { optionsDuRouteur } from '../router'
import { Route as racineReelle } from '../routes/__root'
import { MotionProvider } from '../ui/MotionProvider'
import { reveil as textes } from '../textes/reveil'
import { PRET_MS, reveil, SEUIL_MS } from './reveil'

// La VRAIE racine, avec la VRAIE machine du réveil, branchée comme `main.tsx` la branche : seules les requêtes sont jouées à la main.
let arrete: () => void
beforeEach(() => {
  vi.useFakeTimers({ now: new Date('2026-11-14T10:00:00Z') })
  arrete = reveil.demarre()
})
afterEach(() => {
  arrete()
  vi.useRealTimers()
})

async function monte() {
  const racine = createRootRouteWithContext<{ queryClient: QueryClient }>()({ ...racineReelle.options } as never)
  // Un élément qui reste d'une page à l'autre (une barre d'onglets) : s'il était remplacé, le focus ne pourrait plus lui retourner.
  const mise = createRoute({
    getParentRoute: () => racine,
    id: 'mise',
    component: () => (
      <>
        <button type="button">Dans la page</button>
        <Outlet />
      </>
    ),
  })
  const page = createRoute({ getParentRoute: () => mise, path: '/', component: () => <p>La page</p> })
  const autre = createRoute({ getParentRoute: () => mise, path: '/autre', component: () => <p>Une autre page</p> })
  const routeur = createRouter({
    ...optionsDuRouteur,
    routeTree: racine.addChildren([mise.addChildren([page, autre])]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
    context: { queryClient: new QueryClient() },
  })
  render(
    <StrictMode>
      <MotionProvider reduit>
        <RouterProvider router={routeur} />
      </MotionProvider>
    </StrictMode>,
  )
  await act(async () => void (await vi.advanceTimersByTimeAsync(0)))
  return routeur
}

const requete = (id: string) => ({ id, methode: 'GET', chemin: '/api/v1/me' })
const coque = () => document.getElementById('coque')!

describe('la racine pendant le réveil', () => {
  it('rend la coque inerte tant que l’écran de réveil est là, puis interactive', async () => {
    await monte()
    expect(coque()).not.toHaveAttribute('inert')
    act(() => evenements.emet('requete:debut', requete('a')))
    await act(async () => void (await vi.advanceTimersByTimeAsync(SEUIL_MS)))
    expect(screen.getByRole('heading', { level: 1, name: textes.titre })).toHaveFocus()
    expect(coque()).toHaveAttribute('inert')
    // Le lien d'évitement et le bouton de la page : rien de ce que la coque contient ne reçoit le focus.
    const focalisables = coque().querySelectorAll<HTMLElement>('a[href], button, [tabindex]')
    expect(focalisables.length).toBeGreaterThanOrEqual(3)
    for (const element of focalisables) expect(element.closest('[inert]')).toBe(coque())
    expect(document.getElementById('transverses')).toContainElement(screen.getByRole('heading', { level: 1, name: textes.titre }))
    act(() => evenements.emet('requete:fin', { ...requete('a'), issue: 'reponse', statut: 200 }))
    // « prêt » reste affiché : la coque ne redevient pas interactive avant que l'écran s'efface.
    expect(coque()).toHaveAttribute('inert')
    await act(async () => void (await vi.advanceTimersByTimeAsync(PRET_MS + 1200)))
    expect(coque()).not.toHaveAttribute('inert')
  })

  it('quand la navigation qui a réveillé l’API se termine sous l’écran, le focus va au nouveau contenu, non au lien cliqué', async () => {
    const routeur = await monte()
    const bouton = screen.getByRole('button', { name: 'Dans la page' })
    bouton.focus()
    act(() => evenements.emet('requete:debut', requete('a')))
    await act(async () => void (await vi.advanceTimersByTimeAsync(SEUIL_MS)))
    // La page d'arrivée se charge pendant l'écran : le chemin résolu change alors que la coque est inerte (le focus ne peut pas y aller).
    const arrivee = routeur.navigate({ to: '/autre' } as never)
    await act(async () => void (await vi.advanceTimersByTimeAsync(50)))
    await arrivee
    expect(screen.getByText('Une autre page')).toBeInTheDocument()
    act(() => evenements.emet('requete:fin', { ...requete('a'), issue: 'reponse', statut: 200 }))
    await act(async () => void (await vi.advanceTimersByTimeAsync(PRET_MS + 1200)))
    expect(coque()).not.toHaveAttribute('inert')
    expect(document.getElementById('contenu')).toHaveFocus()
  })

  it('sans navigation pendant l’écran, le focus retourne à l’élément d’avant', async () => {
    await monte()
    const bouton = screen.getByRole('button', { name: 'Dans la page' })
    bouton.focus()
    act(() => evenements.emet('requete:debut', requete('a')))
    await act(async () => void (await vi.advanceTimersByTimeAsync(SEUIL_MS)))
    act(() => evenements.emet('requete:fin', { ...requete('a'), issue: 'reponse', statut: 200 }))
    await act(async () => void (await vi.advanceTimersByTimeAsync(PRET_MS + 1200)))
    expect(bouton).toHaveFocus()
  })
})
