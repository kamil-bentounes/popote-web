import { QueryClient } from '@tanstack/react-query'
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { StrictMode } from 'react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { creeQueryClient } from './api/query-client'
import { creeRouteur } from './router'
import { Route as RouteConnectee } from './routes/_connecte'
import { Route } from './routes/entrer'
import { verifieAxe } from './test/axe'

// La garde de session, jouée sur le VRAI arbre de routes et le vrai client : seul le réseau est simulé.
const serveur = setupServer()
beforeAll(() => serveur.listen({ onUnhandledFrame: 'error' }))
afterEach(() => serveur.resetHandlers())
afterAll(() => serveur.close())

const URL_MOI = 'http://localhost:3000/api/v1/me'
const MOI = { id: 'p1', email: 'lea@exemple.fr', display_name: 'Léa', household: null }
const PROBLEME = { 'Content-Type': 'application/problem+json' }

const sansSession = () => HttpResponse.json({ title: 'x' }, { status: 401, headers: PROBLEME })
const avecSession = () => HttpResponse.json(MOI)

function monte(adresse: string, queryClient: QueryClient = creeQueryClient()) {
  const history = createMemoryHistory({ initialEntries: [adresse] })
  const routeur = creeRouteur({ queryClient, history })
  const rendu = render(
    <StrictMode>
      <RouterProvider router={routeur} />
    </StrictMode>,
  )
  return { routeur, history, ...rendu }
}

// Sans reprise, pour qu’un 503 n’attende pas : les reprises ont leurs propres tests (`query-client.test.ts`).
const sansAttente = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })

describe('la garde de session', () => {
  it('sans session, renvoie à « /entrer » en gardant la page demandée, requête comprise', async () => {
    serveur.use(http.get(URL_MOI, sansSession))
    const { routeur, history } = monte('/accueil?mois=11')
    await screen.findByRole('heading', { name: 'Popote revient bientôt' })
    expect(routeur.state.location.pathname).toBe('/entrer')
    expect(history.location.search).toBe('?retour=%2Faccueil%3Fmois%3D11')
    expect(routeur.state.location.search).toEqual({ retour: '/accueil?mois=11' })
  })

  it('sans session, ne garde pas le fragment (il ne part jamais au serveur et n’a rien à faire dans un retour)', async () => {
    serveur.use(http.get(URL_MOI, sansSession))
    const { history } = monte('/accueil#ancre')
    await screen.findByRole('heading', { name: 'Popote revient bientôt' })
    expect(history.location.search).toBe('?retour=%2Faccueil')
  })

  it('sans session, jette un retour qui contient une contre-barre encodée : « /entrer » sans `retour`', async () => {
    serveur.use(http.get(URL_MOI, sansSession))
    const { routeur } = monte('/accueil?x=%5C%5Cevil')
    await screen.findByRole('heading', { name: 'Popote revient bientôt' })
    expect(routeur.state.location.pathname).toBe('/entrer')
    expect(rechercheValidee(routeur)).not.toHaveProperty('retour', expect.anything())
  })

  it('avec `moi` déjà lue, ne rappelle pas l’API (la garde fait confiance au cache : voir « Constats de F5b-1 »)', async () => {
    let appels = 0
    serveur.use(
      http.get(URL_MOI, () => {
        appels += 1
        return avecSession()
      }),
    )
    const queryClient = creeQueryClient()
    // Vieille d'une heure : périmée, et pourtant rendue sans appel (`ensureQueryData` ; `fetchQuery` la relirait).
    queryClient.setQueryData(['moi'], MOI, { updatedAt: Date.now() - 3_600_000 })
    monte('/accueil', queryClient)
    expect(await screen.findByRole('heading', { name: 'Accueil' })).toBeInTheDocument()
    expect(appels).toBe(0)
  })

  it('ne met dans le `retour` que ce que `cheminSur` accepte, avant même la validation de « /entrer »', async () => {
    serveur.use(http.get(URL_MOI, sansSession))
    const avantChargement = RouteConnectee.options.beforeLoad as (contexte: unknown) => Promise<void>
    const lance = (searchStr: string) => avantChargement({ context: { queryClient: creeQueryClient() }, location: { pathname: '/accueil', searchStr } })
    const redirection = await lance('?x=%5C%5Cevil').catch((erreur: unknown) => erreur)
    expect(redirection).toMatchObject({ options: { to: '/entrer', search: { retour: undefined } } })
    const normale = await lance('?mois=11').catch((erreur: unknown) => erreur)
    expect(normale).toMatchObject({ options: { to: '/entrer', search: { retour: '/accueil?mois=11' } } })
  })

  it('avec une session, montre la page protégée et son titre', async () => {
    serveur.use(http.get(URL_MOI, avecSession))
    const { routeur } = monte('/accueil')
    await screen.findByRole('heading', { name: 'Accueil' })
    expect(routeur.state.location.pathname).toBe('/accueil')
    await waitFor(() => expect(document.title).toBe('Accueil · Popote'))
  })

  it('avec une session, la page protégée n’a aucune violation axe', async () => {
    serveur.use(http.get(URL_MOI, avecSession))
    const { container } = monte('/accueil')
    await screen.findByRole('heading', { name: 'Accueil' })
    expect(await verifieAxe(container)).toEqual([])
  })

  it('sur un 503, montre la frontière de la route sans rediriger et sans un mot du serveur', async () => {
    serveur.use(
      http.get(URL_MOI, () => HttpResponse.json({ title: 'secret-serveur', detail: 'secret-detail' }, { status: 503, headers: PROBLEME })),
    )
    const { routeur, container } = monte('/accueil', sansAttente())
    await screen.findByRole('button', { name: 'Réessayer' })
    expect(routeur.state.location.pathname).toBe('/accueil')
    expect(screen.getByRole('link', { name: 'Aller au contenu' })).toBeInTheDocument()
    expect(document.body).not.toHaveTextContent('secret')
    expect(await verifieAxe(container)).toEqual([])
  })

  it('sur une coupure du réseau, montre la frontière de la route sans rediriger', async () => {
    serveur.use(http.get(URL_MOI, () => HttpResponse.error()))
    const { routeur } = monte('/accueil', sansAttente())
    await screen.findByRole('button', { name: 'Réessayer' })
    expect(routeur.state.location.pathname).toBe('/accueil')
  })

  it('sur un 403, montre la frontière sans rediriger : seule une 401 dit « pas de session »', async () => {
    serveur.use(http.get(URL_MOI, () => HttpResponse.json({ title: 'x' }, { status: 403, headers: PROBLEME })))
    const { routeur } = monte('/accueil', sansAttente())
    await screen.findByRole('button', { name: 'Réessayer' })
    expect(routeur.state.location.pathname).toBe('/accueil')
  })

  it('après un 503, « Réessayer » relit la session et mène à la page', async () => {
    const user = userEvent.setup()
    let appels = 0
    serveur.use(
      http.get(URL_MOI, () => {
        appels += 1
        return appels === 1 ? new HttpResponse(null, { status: 503 }) : HttpResponse.json(MOI)
      }),
    )
    const { routeur } = monte('/accueil', sansAttente())
    await user.click(await screen.findByRole('button', { name: 'Réessayer' }))
    expect(await screen.findByRole('heading', { name: 'Accueil' })).toBeInTheDocument()
    expect(routeur.state.location.pathname).toBe('/accueil')
  })
})

describe('la porte d’entrée « / »', () => {
  it('mène une personne connectée à « /accueil »', async () => {
    serveur.use(http.get(URL_MOI, avecSession))
    const { routeur } = monte('/')
    await screen.findByRole('heading', { name: 'Accueil' })
    expect(routeur.state.location.pathname).toBe('/accueil')
  })

  it('mène une personne sans session à « /entrer »', async () => {
    serveur.use(http.get(URL_MOI, sansSession))
    const { routeur } = monte('/')
    await screen.findByRole('heading', { name: 'Popote revient bientôt' })
    expect(routeur.state.location.pathname).toBe('/entrer')
  })
})

// Ce que la route reçoit après `validateSearch` : `location.search` garde, lui, les paramètres inconnus de l'adresse.
const rechercheValidee = (routeur: ReturnType<typeof creeRouteur>) => routeur.state.matches.at(-1)?.search

describe('« /entrer » : ce qu’elle accepte dans l’adresse', () => {
  it('est publique : elle n’appelle pas l’API', async () => {
    let appels = 0
    serveur.use(
      http.get(URL_MOI, () => {
        appels += 1
        return avecSession()
      }),
    )
    monte('/entrer')
    await screen.findByRole('heading', { name: 'Popote revient bientôt' })
    expect(appels).toBe(0)
  })

  it('garde un `retour` qui est un chemin de l’appli, et `raison=expiree`', async () => {
    const { routeur } = monte('/entrer?retour=%2Fbudget%3Fmois%3D11&raison=expiree')
    await screen.findByRole('heading', { name: 'Popote revient bientôt' })
    expect(rechercheValidee(routeur)).toEqual({ retour: '/budget?mois=11', raison: 'expiree' })
  })

  it.each([
    ['//evil.fr', '%2F%2Fevil.fr'],
    ['https://evil.fr', 'https%3A%2F%2Fevil.fr'],
    ['/\\evil.fr', '%2F%5Cevil.fr'],
    ['javascript:alert(1)', 'javascript%3Aalert(1)'],
    ['/%2F%2Fevil.fr', '%2F%252F%252Fevil.fr'],
  ])('jette un `retour` hors de l’origine : %s', async (_valeur, encode) => {
    const { routeur } = monte(`/entrer?retour=${encode}`)
    await screen.findByRole('heading', { name: 'Popote revient bientôt' })
    expect(rechercheValidee(routeur)).toEqual({})
  })

  it('jette une `raison` inconnue', async () => {
    const { routeur } = monte('/entrer?raison=autre&retour=%2Fbudget')
    await screen.findByRole('heading', { name: 'Popote revient bientôt' })
    expect(rechercheValidee(routeur)).toEqual({ retour: '/budget' })
  })

  // Le routeur recopie dans `search` les paramètres inconnus de l'adresse : ce que `validateSearch` ne rend pas n'est pas lu.
  it('ne rend que `retour` et `raison`', () => {
    const valide = Route.options.validateSearch as (recherche: Record<string, unknown>) => unknown
    expect(valide(JSON.parse('{"x":1,"retour":"/budget","raison":"expiree","__proto__":{"y":2}}'))).toEqual({ retour: '/budget', raison: 'expiree' })
  })

  it('jette un `retour` qui n’est pas une chaîne (nombre, tableau, objet)', async () => {
    const { routeur } = monte('/entrer?retour=42')
    await screen.findByRole('heading', { name: 'Popote revient bientôt' })
    expect(rechercheValidee(routeur)).toEqual({})
  })
})
