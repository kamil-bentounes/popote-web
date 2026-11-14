import { onlineManager } from '@tanstack/react-query'
import { renderHook, act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { creeClient } from '../api/client'
import { lit } from '../api/appel'
import { creeQueryClient } from '../api/query-client'
import { creeEmetteur, type Evenements } from '../api/evenements'
import { AFFICHAGE_MIN_MS, creeReveil, INACTIVITE_MS, PALIERS_MS, PRET_MS, SEUIL_MS, useReveil, type EtatReveil } from './reveil'

beforeEach(() => vi.useFakeTimers({ now: new Date('2026-11-14T10:00:00Z') }))
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

type Fin = Evenements['requete:fin']

/** Une machine branchée sur son propre émetteur, qui note chaque état qu'elle prend (jamais deux fois le même d'affilée). */
function creeEssai({ enLigne = () => true }: { enLigne?: () => boolean } = {}) {
  const emetteur = creeEmetteur()
  const reveil = creeReveil({ emetteur, enLigne })
  const arrete = reveil.demarre()
  const vus: EtatReveil[] = [reveil.lis()]
  reveil.abonne(() => vus.push(reveil.lis()))
  const phases = () => vus.map((etat) => (etat.phase === 'reveil' ? `reveil${etat.palier}` : etat.phase))
  return {
    reveil,
    arrete,
    vus,
    phases,
    debut: (id: string) => emetteur.emet('requete:debut', { id, methode: 'GET', chemin: '/api/v1/me' }),
    fin: (id: string, reste: Partial<Fin> = { issue: 'reponse', statut: 200 }) =>
      emetteur.emet('requete:fin', { id, methode: 'GET', chemin: '/api/v1/me', issue: 'reponse', ...reste }),
    avance: (ms: number) => vi.advanceTimersByTime(ms),
  }
}

describe('l’entrée en veille', () => {
  it('une réponse à 1 900 ms ne montre jamais l’écran', () => {
    const essai = creeEssai()
    essai.debut('a')
    essai.avance(SEUIL_MS - 100)
    essai.fin('a')
    essai.avance(10_000)
    expect(essai.phases()).toEqual(['repos'])
  })

  it('une requête sans réponse à 2 000 ms, la première depuis le chargement de la page, ouvre l’écran', () => {
    const essai = creeEssai()
    essai.debut('a')
    essai.avance(SEUIL_MS - 1)
    expect(essai.reveil.lis().phase).toBe('repos')
    essai.avance(1)
    expect(essai.reveil.lis()).toEqual({ phase: 'reveil', palier: 0 })
  })

  it('une réponse arrivée une minute plus tôt prouve que l’API est éveillée : pas d’écran, même au-delà de 2 s', () => {
    const essai = creeEssai()
    essai.debut('a')
    essai.fin('a')
    essai.avance(60_000)
    essai.debut('b')
    essai.avance(SEUIL_MS + 100)
    essai.fin('b')
    expect(essai.phases()).toEqual(['repos'])
  })

  it('la limite d’inactivité est de 5 minutes : à 4 min 59 s pas d’écran, à 5 min pile oui', () => {
    const court = creeEssai()
    court.debut('a')
    court.fin('a')
    // La requête suivante part tôt : c'est l'instant où le seuil de 2 s sonne qui compte, pas celui de son départ.
    court.avance(INACTIVITE_MS - SEUIL_MS - 1000)
    court.debut('b')
    court.avance(SEUIL_MS)
    expect(court.reveil.lis().phase).toBe('repos')

    const pile = creeEssai()
    pile.debut('a')
    pile.fin('a')
    pile.avance(INACTIVITE_MS - SEUIL_MS)
    pile.debut('b')
    pile.avance(SEUIL_MS)
    expect(pile.reveil.lis().phase).toBe('reveil')
  })

  it('trois requêtes simultanées ouvrent un seul écran, et une seule fin', () => {
    const essai = creeEssai()
    for (const id of ['a', 'b', 'c']) essai.debut(id)
    essai.avance(SEUIL_MS + 500)
    for (const id of ['a', 'b', 'c']) essai.fin(id)
    essai.avance(10_000)
    expect(essai.phases()).toEqual(['repos', 'reveil0', 'pret', 'repos'])
  })

  it('hors ligne, une requête lente n’est pas une veille de l’API', () => {
    const essai = creeEssai({ enLigne: () => false })
    essai.debut('a')
    essai.avance(SEUIL_MS * 5)
    expect(essai.phases()).toEqual(['repos'])
  })

  it('une requête annulée avant 2 s n’ouvre rien et ne prouve pas que l’API est éveillée', () => {
    const essai = creeEssai()
    essai.debut('a')
    essai.avance(SEUIL_MS - 100)
    essai.fin('a', { issue: 'annulee' })
    essai.avance(10_000)
    expect(essai.phases()).toEqual(['repos'])
    essai.debut('b')
    essai.avance(SEUIL_MS)
    expect(essai.reveil.lis().phase).toBe('reveil')
  })
})

describe('l’écran tant que l’API dort : les paliers de la phrase', () => {
  it('passe aux paliers à 0, 3, 6 et 12 s après l’ouverture de l’écran, non après le départ de la requête', () => {
    const essai = creeEssai()
    essai.debut('a')
    essai.avance(SEUIL_MS)
    expect(PALIERS_MS).toEqual([0, 3_000, 6_000, 12_000])
    expect(essai.reveil.lis()).toEqual({ phase: 'reveil', palier: 0 })
    essai.avance(2_999)
    expect(essai.reveil.lis()).toEqual({ phase: 'reveil', palier: 0 })
    essai.avance(1)
    expect(essai.reveil.lis()).toEqual({ phase: 'reveil', palier: 1 })
    essai.avance(2_999)
    expect(essai.reveil.lis()).toEqual({ phase: 'reveil', palier: 1 })
    essai.avance(1)
    expect(essai.reveil.lis()).toEqual({ phase: 'reveil', palier: 2 })
    essai.avance(5_999)
    expect(essai.reveil.lis()).toEqual({ phase: 'reveil', palier: 2 })
    essai.avance(1)
    expect(essai.reveil.lis()).toEqual({ phase: 'reveil', palier: 3 })
  })

  it('ne repart pas de zéro pour une requête de plus : une seule veille', () => {
    const essai = creeEssai()
    essai.debut('a')
    essai.avance(SEUIL_MS + 2_000)
    essai.debut('b')
    essai.avance(SEUIL_MS + 2_000)
    // 2 000 + 2 000 + 2 000 + 2 000 ms après le départ : 6 s après l'ouverture, palier 2.
    expect(essai.phases()).toEqual(['repos', 'reveil0', 'reveil1', 'reveil2'])
  })
})

describe('la sortie', () => {
  it('une réponse annonce « prêt », puis l’écran part : jamais avant 1 200 ms d’affichage', () => {
    const essai = creeEssai()
    essai.debut('a')
    essai.avance(SEUIL_MS + 100)
    essai.fin('a')
    expect(essai.reveil.lis().phase).toBe('pret')
    // Ouvert à 2 000 ms : sortie à 2 000 + 1 200, la marque « prêt » (100 + 700) n'y suffirait pas.
    essai.avance(AFFICHAGE_MIN_MS - 100 - 1)
    expect(essai.reveil.lis().phase).toBe('pret')
    essai.avance(1)
    expect(essai.reveil.lis().phase).toBe('repos')
  })

  it('une réponse tardive laisse « prêt » au moins 700 ms', () => {
    const essai = creeEssai()
    essai.debut('a')
    essai.avance(6_500)
    essai.fin('a')
    essai.avance(PRET_MS - 1)
    expect(essai.reveil.lis().phase).toBe('pret')
    essai.avance(1)
    expect(essai.reveil.lis().phase).toBe('repos')
    expect(essai.phases()).toEqual(['repos', 'reveil0', 'reveil1', 'pret', 'repos'])
  })

  it.each([200, 204, 400, 401, 404, 422, 429])('une réponse %i est une réponse de l’API : « prêt »', (statut) => {
    const essai = creeEssai()
    essai.debut('a')
    essai.avance(SEUIL_MS)
    essai.fin('a', { issue: 'reponse', statut })
    expect(essai.reveil.lis().phase).toBe('pret')
  })

  it.each([
    ['un 500', { issue: 'reponse', statut: 500 }],
    ['un 502', { issue: 'reponse', statut: 502 }],
    ['un 503', { issue: 'reponse', statut: 503 }],
    ['un 504', { issue: 'reponse', statut: 504 }],
    ['une coupure', { issue: 'coupure' }],
    ['un délai dépassé', { issue: 'delai' }],
  ] satisfies [string, Partial<Fin>][])('%s termine la veille sans « prêt » : la frontière d’erreur parle', (_nom, fin) => {
    const essai = creeEssai()
    essai.debut('a')
    essai.avance(SEUIL_MS + 100)
    essai.fin('a', fin)
    // L'écran reste le temps de son minimum, il ne ment pas en annonçant « prêt ».
    essai.avance(AFFICHAGE_MIN_MS)
    expect(essai.phases()).toEqual(['repos', 'reveil0', 'repos'])
  })

  it('un échec rapide, avant l’écran, n’ouvre rien', () => {
    const essai = creeEssai()
    essai.debut('a')
    essai.avance(300)
    essai.fin('a', { issue: 'reponse', statut: 503 })
    essai.avance(10_000)
    expect(essai.phases()).toEqual(['repos'])
  })

  it('un échec laisse l’écran tant que son minimum n’est pas écoulé', () => {
    const essai = creeEssai()
    essai.debut('a')
    essai.avance(SEUIL_MS)
    essai.fin('a', { issue: 'coupure' })
    essai.avance(AFFICHAGE_MIN_MS - 1)
    expect(essai.reveil.lis().phase).toBe('reveil')
    essai.avance(1)
    expect(essai.reveil.lis().phase).toBe('repos')
  })

  it('la première réponse suffit : les requêtes encore en vol ne retiennent pas l’écran', () => {
    const essai = creeEssai()
    for (const id of ['a', 'b']) essai.debut(id)
    essai.avance(SEUIL_MS)
    essai.fin('a')
    essai.avance(10_000)
    expect(essai.phases()).toEqual(['repos', 'reveil0', 'pret', 'repos'])
  })

  it('une annulation ferme l’écran quand elle était la seule requête, sans « prêt »', () => {
    const essai = creeEssai()
    essai.debut('a')
    essai.avance(SEUIL_MS)
    essai.fin('a', { issue: 'annulee' })
    essai.avance(AFFICHAGE_MIN_MS)
    expect(essai.phases()).toEqual(['repos', 'reveil0', 'repos'])
  })

  it('une annulation ne ferme pas l’écran tant qu’une autre requête attend', () => {
    const essai = creeEssai()
    for (const id of ['a', 'b']) essai.debut(id)
    essai.avance(SEUIL_MS)
    essai.fin('a', { issue: 'annulee' })
    essai.avance(AFFICHAGE_MIN_MS * 5)
    expect(essai.reveil.lis().phase).toBe('reveil')
    essai.fin('b')
    expect(essai.reveil.lis().phase).toBe('pret')
  })

  it('une réponse prouve l’éveil de l’API : la requête lente qui suit n’ouvre pas de nouvel écran', () => {
    const essai = creeEssai()
    essai.debut('a')
    essai.avance(SEUIL_MS)
    essai.fin('a')
    essai.avance(10_000)
    essai.debut('b')
    essai.avance(SEUIL_MS * 3)
    expect(essai.phases()).toEqual(['repos', 'reveil0', 'pret', 'repos'])
  })

  it('un 502, 503 ou 504 ne prouve pas l’éveil (le relais répond à la place de l’API) ; un 500 oui', () => {
    for (const [statut, ouvre] of [[502, true], [503, true], [504, true], [500, false]] as const) {
      const essai = creeEssai()
      essai.debut('a')
      essai.fin('a', { issue: 'reponse', statut })
      essai.avance(100)
      essai.debut('b')
      essai.avance(SEUIL_MS)
      expect(essai.reveil.lis().phase, `après un ${statut}`).toBe(ouvre ? 'reveil' : 'repos')
    }
  })

  it('une coupure ne prouve pas non plus l’éveil', () => {
    const essai = creeEssai()
    essai.debut('a')
    essai.fin('a', { issue: 'coupure' })
    essai.debut('b')
    essai.avance(SEUIL_MS)
    expect(essai.reveil.lis().phase).toBe('reveil')
  })

  it('une réponse pendant l’attente de la sortie d’un échec passe l’écran à « prêt »', () => {
    const essai = creeEssai()
    for (const id of ['a', 'b']) essai.debut(id)
    essai.avance(SEUIL_MS)
    essai.fin('a', { issue: 'reponse', statut: 503 })
    essai.fin('b')
    expect(essai.phases()).toEqual(['repos', 'reveil0', 'pret'])
  })

  it('un échec puis une réponse : « prêt » dure ses 700 ms, la sortie de l’échec ne le ferme pas plus tôt', () => {
    const essai = creeEssai()
    for (const id of ['a', 'b']) essai.debut(id)
    essai.avance(SEUIL_MS)
    essai.fin('a', { issue: 'coupure' })
    essai.avance(1_000)
    essai.fin('b')
    // Sans la réponse, l'écran serait parti à 2 000 + 1 200 ; il reste jusqu'à 3 000 + 700.
    essai.avance(PRET_MS - 1)
    expect(essai.reveil.lis().phase).toBe('pret')
    essai.avance(1)
    expect(essai.reveil.lis().phase).toBe('repos')
  })

  it('une requête déjà en vol quand l’écran se ferme sur un échec le rouvre si l’API dort encore', () => {
    const essai = creeEssai()
    essai.debut('a')
    essai.avance(100)
    essai.debut('b')
    essai.avance(SEUIL_MS - 100)
    essai.fin('a', { issue: 'coupure' })
    essai.avance(AFFICHAGE_MIN_MS)
    expect(essai.reveil.lis().phase).toBe('repos')
    essai.avance(SEUIL_MS)
    expect(essai.reveil.lis().phase).toBe('reveil')
    essai.fin('b')
    expect(essai.phases()).toEqual(['repos', 'reveil0', 'repos', 'reveil0', 'pret'])
  })

  it('aucun minuteur ne reste après une sortie complète, ni après la fin d’une requête avant son seuil', () => {
    const essai = creeEssai()
    essai.debut('a')
    essai.fin('a')
    expect(vi.getTimerCount()).toBe(0)
    essai.debut('b')
    essai.avance(SEUIL_MS * 10)
    essai.fin('b')
    essai.avance(10_000)
    expect(essai.reveil.lis().phase).toBe('repos')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('une fin d’une requête inconnue, ou répétée, ne casse rien', () => {
    const essai = creeEssai()
    essai.fin('fantome')
    essai.debut('a')
    essai.debut('a')
    essai.fin('a')
    essai.fin('a')
    essai.avance(10_000)
    expect(essai.phases()).toEqual(['repos'])
  })
})

describe('l’arrêt', () => {
  it('ne laisse aucun minuteur, remet au repos et n’entend plus rien', () => {
    const essai = creeEssai()
    essai.debut('a')
    essai.avance(SEUIL_MS + 500)
    expect(essai.reveil.lis().phase).toBe('reveil')
    essai.arrete()
    expect(vi.getTimerCount()).toBe(0)
    expect(essai.reveil.lis()).toEqual({ phase: 'repos' })
    essai.debut('b')
    essai.avance(SEUIL_MS * 3)
    expect(essai.reveil.lis().phase).toBe('repos')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('arrêter pendant « prêt » annule la sortie programmée', () => {
    const essai = creeEssai()
    essai.debut('a')
    essai.avance(SEUIL_MS)
    essai.fin('a')
    essai.arrete()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('arrêter puis redémarrer (StrictMode) remet la machine à neuf : une réponse d’avant ne compte plus', () => {
    const emetteur = creeEmetteur()
    const reveil = creeReveil({ emetteur })
    const arrete = reveil.demarre()
    emetteur.emet('requete:debut', { id: 'a', methode: 'GET', chemin: '/api/v1/me' })
    emetteur.emet('requete:fin', { id: 'a', methode: 'GET', chemin: '/api/v1/me', issue: 'reponse', statut: 200 })
    emetteur.emet('requete:debut', { id: 'en-vol', methode: 'GET', chemin: '/api/v1/me' })
    arrete()
    reveil.demarre()
    emetteur.emet('requete:debut', { id: 'b', methode: 'GET', chemin: '/api/v1/me' })
    vi.advanceTimersByTime(SEUIL_MS)
    expect(reveil.lis()).toEqual({ phase: 'reveil', palier: 0 })
    emetteur.emet('requete:fin', { id: 'b', methode: 'GET', chemin: '/api/v1/me', issue: 'reponse', statut: 200 })
    vi.advanceTimersByTime(10_000)
    expect(reveil.lis()).toEqual({ phase: 'repos' })
    expect(vi.getTimerCount()).toBe(0)
  })

  it('redémarrer ne double pas les abonnements', () => {
    const emetteur = creeEmetteur()
    const reveil = creeReveil({ emetteur })
    reveil.demarre()
    reveil.demarre()
    emetteur.emet('requete:debut', { id: 'a', methode: 'GET', chemin: '/api/v1/me' })
    expect(vi.getTimerCount()).toBe(1)
  })
})

describe('le magasin', () => {
  it('rend la même référence tant que rien ne change (condition de useSyncExternalStore)', () => {
    const essai = creeEssai()
    expect(essai.reveil.lis()).toBe(essai.reveil.lis())
    essai.debut('a')
    essai.avance(SEUIL_MS)
    const ouvert = essai.reveil.lis()
    expect(essai.reveil.lis()).toBe(ouvert)
  })

  it('cesse d’avertir un abonné après son désabonnement', () => {
    const essai = creeEssai()
    const ecouteur = vi.fn<() => void>()
    const retire = essai.reveil.abonne(ecouteur)
    retire()
    essai.debut('a')
    essai.avance(SEUIL_MS)
    expect(ecouteur).not.toHaveBeenCalled()
  })

  it('un abonné qui lève n’empêche ni la sortie de « prêt » ni les paliers ; l’erreur est relancée hors de l’appel', () => {
    const relances: unknown[] = []
    vi.spyOn(globalThis, 'queueMicrotask').mockImplementation((tache) => {
      try {
        tache()
      } catch (erreur) {
        relances.push(erreur)
      }
    })
    const essai = creeEssai()
    essai.reveil.abonne(() => {
      throw new Error('abonné défaillant')
    })
    essai.debut('a')
    essai.avance(SEUIL_MS)
    essai.avance(PALIERS_MS[1])
    expect(essai.reveil.lis()).toEqual({ phase: 'reveil', palier: 1 })
    essai.fin('a')
    essai.avance(10_000)
    expect(essai.reveil.lis()).toEqual({ phase: 'repos' })
    expect(relances.length).toBeGreaterThan(0)
  })

  it('useReveil rend à un composant l’état courant et le suit', () => {
    const emetteur = creeEmetteur()
    const reveil = creeReveil({ emetteur })
    reveil.demarre()
    const { result } = renderHook(() => useReveil(reveil))
    expect(result.current).toEqual({ phase: 'repos' })
    act(() => {
      emetteur.emet('requete:debut', { id: 'a', methode: 'GET', chemin: '/api/v1/me' })
      vi.advanceTimersByTime(SEUIL_MS)
    })
    expect(result.current).toEqual({ phase: 'reveil', palier: 0 })
    act(() => emetteur.emet('requete:fin', { id: 'a', methode: 'GET', chemin: '/api/v1/me', issue: 'reponse', statut: 200 }))
    expect(result.current).toEqual({ phase: 'pret' })
  })
})

describe('avec le vrai client de l’API', () => {
  it('une requête qui met 5 s à répondre ouvre la veille puis la clôt par « prêt » (le contrat des événements tient)', async () => {
    const emetteur = creeEmetteur()
    const reveil = creeReveil({ emetteur })
    reveil.demarre()
    const reponse = () => new Promise<Response>((resolve) => setTimeout(() => resolve(Response.json({})), 5_000))
    const client = creeClient({ fetch: reponse, emetteur })
    const appel = client.GET('/api/v1/me')
    await vi.advanceTimersByTimeAsync(SEUIL_MS)
    expect(reveil.lis().phase).toBe('reveil')
    await vi.advanceTimersByTimeAsync(5_000 - SEUIL_MS)
    await appel
    expect(reveil.lis().phase).toBe('pret')
  })

  it('une coupure du réseau pendant l’attente clôt la veille sans « prêt »', async () => {
    const emetteur = creeEmetteur()
    const reveil = creeReveil({ emetteur })
    reveil.demarre()
    const coupure = () => new Promise<Response>((_, rejette) => setTimeout(() => rejette(new TypeError('Failed to fetch')), 3_000))
    const client = creeClient({ fetch: coupure, emetteur })
    // Le rejet est attendu : on l'attrape tout de suite, avant que l'horloge simulée ne le produise.
    const appel = client.GET('/api/v1/me').catch(() => undefined)
    await vi.advanceTimersByTimeAsync(SEUIL_MS)
    expect(reveil.lis().phase).toBe('reveil')
    await vi.advanceTimersByTimeAsync(1_000)
    await appel
    await vi.advanceTimersByTimeAsync(AFFICHAGE_MIN_MS)
    expect(reveil.lis().phase).toBe('repos')
  })

  it('démarrée hors ligne, la garde de session n’envoie rien : pas de veille, c’est F21a qui en parle', async () => {
    const emetteur = creeEmetteur()
    const reveil = creeReveil({ emetteur })
    reveil.demarre()
    const envoyees = vi.fn<() => Promise<Response>>(() => Promise.resolve(Response.json({})))
    const client = creeClient({ fetch: envoyees, emetteur })
    const queryClient = creeQueryClient()
    queryClient.mount()
    onlineManager.setOnline(false)
    try {
      // Vider le cache à la fin annule cette requête en pause : son rejet est attendu.
      void queryClient.ensureQueryData({ queryKey: ['moi'], queryFn: ({ signal }) => lit(client.GET('/api/v1/me', { signal })) }).catch(() => undefined)
      await vi.advanceTimersByTimeAsync(SEUIL_MS * 5)
      expect(envoyees).not.toHaveBeenCalled()
      expect(reveil.lis()).toEqual({ phase: 'repos' })
    } finally {
      onlineManager.setOnline(true)
      queryClient.clear()
    }
  })
})
