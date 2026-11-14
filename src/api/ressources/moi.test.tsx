import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { Component, Suspense, type ReactNode } from 'react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { creeQueryClient } from '../query-client'
import { moiOptions, useMoi } from './moi'

const serveur = setupServer()
beforeAll(() => serveur.listen({ onUnhandledFrame: 'error' }))
afterEach(() => serveur.resetHandlers())
afterAll(() => serveur.close())

const URL_MOI = 'http://localhost:3000/api/v1/me'
const MOI = { id: 'p1', email: 'lea@exemple.fr', display_name: 'Léa', household: null }
const PROBLEME = { 'Content-Type': 'application/problem+json' }

function Prenom() {
  return <p>Bonjour {useMoi().data.display_name}</p>
}

class Frontiere extends Component<{ children: ReactNode }, { statut?: number }> {
  override state: { statut?: number } = {}
  static getDerivedStateFromError(erreur: { status?: number }) {
    return { statut: erreur.status }
  }
  override render() {
    return this.state.statut === undefined ? this.props.children : <p>Échec {this.state.statut}</p>
  }
}

function monte(queryClient = creeQueryClient()) {
  render(
    <QueryClientProvider client={queryClient}>
      <Frontiere>
        <Suspense fallback={<p>Chargement</p>}>
          <Prenom />
        </Suspense>
      </Frontiere>
    </QueryClientProvider>,
  )
  return queryClient
}

describe('la ressource « moi »', () => {
  it('a une clé précise, [“moi”], qu’aucune autre ressource ne partage', () => {
    expect(moiOptions.queryKey).toEqual(['moi'])
  })

  it('rend la personne connectée, après le chargement', async () => {
    serveur.use(http.get(URL_MOI, () => HttpResponse.json(MOI)))
    const queryClient = monte()
    expect(screen.getByText('Chargement')).toBeInTheDocument()
    expect(await screen.findByText('Bonjour Léa')).toBeInTheDocument()
    expect(queryClient.getQueryData(['moi'])).toMatchObject({ id: 'p1' })
  })

  it('lève l’erreur typée de l’API, que la frontière de la route attrape (ici une 401, sans reprise)', async () => {
    let appels = 0
    serveur.use(
      http.get(URL_MOI, () => {
        appels += 1
        return HttpResponse.json({ title: 'x' }, { status: 401, headers: PROBLEME })
      }),
    )
    monte()
    expect(await screen.findByText('Échec 401')).toBeInTheDocument()
    expect(appels).toBe(1)
  })

  it('passe le signal d’annulation à la requête : une lecture annulée ne part pas', async () => {
    const controle = new AbortController()
    controle.abort()
    serveur.use(http.get(URL_MOI, () => HttpResponse.json(MOI)))
    const lecture = (moiOptions.queryFn as (contexte: { signal: AbortSignal }) => Promise<unknown>)({ signal: controle.signal })
    await expect(lecture).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('la tient pour fraîche une minute', () => {
    expect(moiOptions.staleTime).toBe(60_000)
  })
})
