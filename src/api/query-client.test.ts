import { MutationObserver, onlineManager } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { lit } from './appel'
import { client } from './client'
import { nouvelleCle } from './idempotence'
import { creeQueryClient } from './query-client'
import { optionsEcriture } from './reprises'

const serveur = setupServer()
beforeAll(() => serveur.listen({ onUnhandledFrame: 'error' }))
beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }))
afterEach(() => {
  vi.useRealTimers()
  serveur.resetHandlers()
})
afterAll(() => serveur.close())

const URL_MOI = 'http://localhost:3000/api/v1/me'
const URL_INVITATIONS = 'http://localhost:3000/api/v1/me/invitations'
const MOI = { id: 'p1', email: 'lea@exemple.fr', display_name: 'Léa', household: null }
const PROBLEME = { 'Content-Type': 'application/problem+json' }

const lisMoi = (queryClient: ReturnType<typeof creeQueryClient>) =>
  queryClient.fetchQuery({ queryKey: ['moi'], queryFn: ({ signal }) => lit(client.GET('/api/v1/me', { signal })) })

describe('les réglages du client de requêtes', () => {
  it('garde une lecture fraîche 30 s, relit au retour sur la fenêtre, et attend le réseau pour écrire', () => {
    const { queries, mutations } = creeQueryClient().getDefaultOptions()
    expect(queries?.staleTime).toBe(30_000)
    expect(queries?.refetchOnWindowFocus).toBe(true)
    expect(mutations?.networkMode).toBe('online')
  })
})

describe('les reprises d’une lecture', () => {
  it('rend les données après un 503 puis un 200 : une reprise, après l’attente', async () => {
    let appels = 0
    serveur.use(
      http.get(URL_MOI, () => {
        appels += 1
        return appels === 1 ? HttpResponse.json({ title: 'x' }, { status: 503, headers: PROBLEME }) : HttpResponse.json(MOI)
      }),
    )
    const lecture = lisMoi(creeQueryClient())
    await vi.advanceTimersByTimeAsync(1_000)
    await expect(lecture).resolves.toMatchObject({ display_name: 'Léa' })
    expect(appels).toBe(2)
  })

  it('honore le Retry-After : rien ne repart avant, tout part après', async () => {
    let appels = 0
    serveur.use(
      http.get(URL_MOI, () => {
        appels += 1
        return appels === 1 ? new HttpResponse(null, { status: 503, headers: { 'Retry-After': '4' } }) : HttpResponse.json(MOI)
      }),
    )
    const lecture = lisMoi(creeQueryClient())
    await vi.advanceTimersByTimeAsync(3_900)
    expect(appels).toBe(1)
    await vi.advanceTimersByTimeAsync(200)
    await expect(lecture).resolves.toBeDefined()
    expect(appels).toBe(2)
  })

  it('renonce après deux reprises : trois appels, puis l’erreur', async () => {
    let appels = 0
    serveur.use(
      http.get(URL_MOI, () => {
        appels += 1
        return HttpResponse.json({ title: 'x' }, { status: 503, headers: PROBLEME })
      }),
    )
    const lecture = lisMoi(creeQueryClient())
    const echec = lecture.catch((erreur: unknown) => erreur)
    await vi.advanceTimersByTimeAsync(10_000)
    expect(await echec).toMatchObject({ status: 503 })
    expect(appels).toBe(3)
  })

  it('ne réessaie pas une 404 : un seul appel', async () => {
    let appels = 0
    serveur.use(
      http.get(URL_MOI, () => {
        appels += 1
        return HttpResponse.json({ title: 'x' }, { status: 404, headers: PROBLEME })
      }),
    )
    await expect(lisMoi(creeQueryClient())).rejects.toMatchObject({ status: 404 })
    expect(appels).toBe(1)
  })
})

describe('les reprises d’une écriture', () => {
  const invite = (queryClient: ReturnType<typeof creeQueryClient>) =>
    new MutationObserver(
      queryClient,
      optionsEcriture((variables: { cle: string }) =>
        lit(client.POST('/api/v1/me/invitations', { params: { header: { 'Idempotency-Key': variables.cle } } })),
      ),
    )

  it('rejoue la MÊME clé après une coupure du réseau, puis après un 502', async () => {
    const cles: (string | null)[] = []
    serveur.use(
      http.post(URL_INVITATIONS, ({ request }) => {
        cles.push(request.headers.get('Idempotency-Key'))
        if (cles.length === 1) return HttpResponse.error()
        if (cles.length === 2) return new HttpResponse(null, { status: 502 })
        return HttpResponse.json({ id: 'i1' }, { status: 201 })
      }),
    )
    const cle = nouvelleCle()
    const envoi = invite(creeQueryClient()).mutate({ cle })
    await vi.advanceTimersByTimeAsync(5_000)
    await envoi
    expect(cles).toEqual([cle, cle, cle])
  })

  it('honore le Retry-After d’une écriture : le second envoi ne part pas avant', async () => {
    let appels = 0
    serveur.use(
      http.post(URL_INVITATIONS, () => {
        appels += 1
        return appels === 1 ? new HttpResponse(null, { status: 503, headers: { 'Retry-After': '4' } }) : HttpResponse.json({ id: 'i1' }, { status: 201 })
      }),
    )
    const envoi = invite(creeQueryClient()).mutate({ cle: nouvelleCle() })
    await vi.advanceTimersByTimeAsync(3_900)
    expect(appels).toBe(1)
    await vi.advanceTimersByTimeAsync(200)
    await envoi
    expect(appels).toBe(2)
  })

  it('hors ligne, attend le retour du réseau, puis envoie UNE fois avec la clé d’origine', async () => {
    const cles: (string | null)[] = []
    serveur.use(
      http.post(URL_INVITATIONS, ({ request }) => {
        cles.push(request.headers.get('Idempotency-Key'))
        return HttpResponse.json({ id: 'i1' }, { status: 201 })
      }),
    )
    const cle = nouvelleCle()
    // `QueryClientProvider` monte le client, qui reprend les écritures en pause au retour du réseau : ici, à la main.
    const queryClient = creeQueryClient()
    queryClient.mount()
    onlineManager.setOnline(false)
    try {
      const envoi = invite(queryClient).mutate({ cle })
      await vi.advanceTimersByTimeAsync(5_000)
      expect(cles).toEqual([])
      onlineManager.setOnline(true)
      await vi.advanceTimersByTimeAsync(100)
      await envoi
      expect(cles).toEqual([cle])
    } finally {
      onlineManager.setOnline(true)
      queryClient.unmount()
    }
  })

  it('ne réessaie pas une 422 : un seul envoi', async () => {
    let appels = 0
    serveur.use(
      http.post(URL_INVITATIONS, () => {
        appels += 1
        return HttpResponse.json({ title: 'x' }, { status: 422, headers: PROBLEME })
      }),
    )
    await expect(invite(creeQueryClient()).mutate({ cle: nouvelleCle() })).rejects.toMatchObject({ status: 422 })
    expect(appels).toBe(1)
  })

  it('une écriture sans les réglages de reprise n’est jamais rejouée', async () => {
    let appels = 0
    serveur.use(
      http.post(URL_INVITATIONS, () => {
        appels += 1
        return new HttpResponse(null, { status: 503 })
      }),
    )
    const sansReprise = new MutationObserver(creeQueryClient(), {
      mutationFn: (cle: string) => lit(client.POST('/api/v1/me/invitations', { params: { header: { 'Idempotency-Key': cle } } })),
    })
    await expect(sansReprise.mutate(nouvelleCle())).rejects.toMatchObject({ status: 503 })
    expect(appels).toBe(1)
  })
})
