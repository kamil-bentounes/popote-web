import { delay, http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { lit, litVide } from './appel'
import { creeClient } from './client'
import { ErreurApi, ErreurReseau, TropDeDemandes } from './erreurs'
import { creeEmetteur, type Evenements } from './evenements'
import { nouvelleCle } from './idempotence'
import { erreurs as textes } from '../textes/erreurs'

// L'adresse par défaut du client est l'origine de la page : sous happy-dom, `http://localhost:3000`.
const serveur = setupServer()
beforeAll(() => serveur.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  serveur.resetHandlers()
  vi.restoreAllMocks()
})
afterAll(() => serveur.close())

const MOI = { id: 'p1', email: 'lea@exemple.fr', display_name: 'Léa', household: null }
const URL_MOI = 'http://localhost:3000/api/v1/me'
const PROBLEME = { 'Content-Type': 'application/problem+json' }

function creeEssai(options: Parameters<typeof creeClient>[0] = {}) {
  const emetteur = creeEmetteur()
  const vus: { nom: keyof Evenements; donnees: Evenements[keyof Evenements] }[] = []
  for (const nom of ['requete:debut', 'requete:fin', 'limite', 'non-authentifie', 'reseau:erreur'] as const) {
    emetteur.sur(nom, (donnees) => vus.push({ nom, donnees }))
  }
  return { client: creeClient({ ...options, emetteur }), vus, noms: () => vus.map((v) => v.nom) }
}

describe('en-têtes et réglages de toute requête', () => {
  it('porte X-Popote-Client: web, credentials same-origin et cache no-store, même pour une écriture', async () => {
    // happy-dom ne rend ni `cache` ni `credentials` sur une `Request` : on lit ce que le client lui donne à construire.
    const construites: { entetes: Headers; credentials?: string; cache?: string }[] = []
    const reconstruites: (keyof RequestInit)[][] = []
    class RequeteEspion extends Request {
      constructor(entree: RequestInfo | URL, init?: RequestInit) {
        super(entree, init)
        if (typeof entree === 'string') construites.push({ entetes: new Headers(init?.headers), credentials: init?.credentials, cache: init?.cache })
        else reconstruites.push(Object.keys(init ?? {}) as (keyof RequestInit)[])
      }
    }
    vi.stubGlobal('Request', RequeteEspion)
    try {
      const { client } = creeEssai({ fetch: () => Promise.resolve(Response.json(MOI)) })
      await client.GET('/api/v1/me')
      await client.DELETE('/api/v1/me/sessions', { params: { query: { scope: 'others' } } })
    } finally {
      vi.unstubAllGlobals()
    }
    expect(construites).toHaveLength(2)
    // Le délai ne refait pas la requête d'openapi-fetch : il lui ajoute un signal, rien d'autre (corps, cache, credentials hérités).
    expect(reconstruites).toEqual([['signal'], ['signal']])
    for (const requete of construites) {
      expect(requete.entetes.get('X-Popote-Client')).toBe('web')
      expect(requete.credentials).toBe('same-origin')
      expect(requete.cache).toBe('no-store')
    }
  })

  it('le corps JSON d’une écriture arrive intact', async () => {
    let recu: unknown
    serveur.use(
      http.post('http://localhost:3000/api/v1/login-codes', async ({ request }) => {
        recu = await request.json()
        return HttpResponse.json({ expires_in: 600 }, { status: 202 })
      }),
    )
    const { client } = creeEssai()
    await client.POST('/api/v1/login-codes', { body: { email: 'lea@exemple.fr' } })
    expect(recu).toEqual({ email: 'lea@exemple.fr' })
  })

  it('n’emploie pas AbortSignal.any, absent des navigateurs plus anciens que Chrome 116 et Safari 17.4', async () => {
    vi.spyOn(AbortSignal, 'any').mockImplementation(() => {
      throw new TypeError('AbortSignal.any is not a function')
    })
    serveur.use(http.get(URL_MOI, () => HttpResponse.json(MOI)))
    expect(await lit(creeEssai().client.GET('/api/v1/me'))).toEqual(MOI)
  })

  it('envoie l’Idempotency-Key entre guillemets, et ne compile pas sans elle', async () => {
    let recue: string | null = null
    serveur.use(
      http.post('http://localhost:3000/api/v1/me/invitations', ({ request }) => {
        recue = request.headers.get('Idempotency-Key')
        return recue
          ? HttpResponse.json({ id: 'i1', token: null, created_at: 'x', expires_at: 'y' }, { status: 201 })
          : HttpResponse.json({ type: 't', title: 'x', status: 400, detail: 'x', instance: 'r1', code: 'cle_idempotence_manquante' }, { status: 400, headers: PROBLEME })
      }),
    )
    const { client } = creeEssai()
    const cle = nouvelleCle()
    await lit(client.POST('/api/v1/me/invitations', { params: { header: { 'Idempotency-Key': cle } } }))
    expect(recue).toBe(cle)
    expect(recue).toMatch(/^"[0-9a-f-]{36}"$/)
    // @ts-expect-error la route exige l'en-tête : l'oublier ne compile pas
    const sansCle = client.POST('/api/v1/me/invitations', { params: { header: {} } })
    await expect(lit(sansCle)).rejects.toMatchObject({ status: 400, code: 'cle_idempotence_manquante' })
  })
})

describe('lit et litVide', () => {
  it('une requête sans gestionnaire échoue : le banc d’essai ne laisse rien partir vers un vrai réseau', async () => {
    await expect(lit(creeEssai().client.GET('/api/v1/me'))).rejects.toBeInstanceOf(ErreurReseau)
  })

  it('lit rend les données d’une réponse réussie', async () => {
    serveur.use(http.get(URL_MOI, () => HttpResponse.json(MOI)))
    expect(await lit(creeEssai().client.GET('/api/v1/me'))).toEqual(MOI)
  })

  it('une 422 en problem+json donne une ErreurApi avec le pointeur du champ', async () => {
    serveur.use(
      http.get(URL_MOI, () =>
        HttpResponse.json(
          { type: 'https://notre-popote.fr/problemes/donnees_invalides', title: 'Données invalides', status: 422, detail: 'Refusé.', instance: 'r1', code: 'donnees_invalides', errors: [{ pointer: '/email', message: 'Refusée.' }] },
          { status: 422, headers: PROBLEME },
        ),
      ),
    )
    const erreur = await lit(creeEssai().client.GET('/api/v1/me')).catch((e: unknown) => e)
    expect(erreur).toBeInstanceOf(ErreurApi)
    expect((erreur as ErreurApi).errors?.[0]?.pointer).toBe('/email')
  })

  it('une 429 avec Retry-After: 30 donne TropDeDemandes (30)', async () => {
    serveur.use(http.get(URL_MOI, () => HttpResponse.json({ title: 'Trop de demandes' }, { status: 429, headers: { ...PROBLEME, 'Retry-After': '30' } })))
    const erreur = await lit(creeEssai().client.GET('/api/v1/me')).catch((e: unknown) => e)
    expect(erreur).toBeInstanceOf(TropDeDemandes)
    expect((erreur as TropDeDemandes).retryApresS).toBe(30)
  })

  it('une 429 sans corps reste une TropDeDemandes, une 503 sans corps un titre du serveur', async () => {
    // `Content-Length: 0` : openapi-fetch rend alors `error: undefined`, ce que seul `response.ok` sait lire comme un échec.
    const vide = { 'Content-Length': '0' }
    serveur.use(
      http.get(URL_MOI, () => new HttpResponse(null, { status: 429, headers: vide })),
      http.get('http://localhost:3000/api/v1/me/sessions', () => new HttpResponse(null, { status: 503, headers: vide })),
    )
    const { client } = creeEssai()
    await expect(lit(client.GET('/api/v1/me'))).rejects.toMatchObject({ name: 'TropDeDemandes', retryApresS: 10 })
    await expect(lit(client.GET('/api/v1/me/sessions'))).rejects.toMatchObject({ status: 503, title: textes.serveur })
  })

  it('une 502 en HTML donne un titre français sans un mot du corps reçu', async () => {
    serveur.use(http.get(URL_MOI, () => new HttpResponse('<html>502 Bad Gateway nginx</html>', { status: 502, headers: { 'Content-Type': 'text/html' } })))
    const erreur = (await lit(creeEssai().client.GET('/api/v1/me')).catch((e: unknown) => e)) as ErreurApi
    expect(erreur.title).toBe(textes.serveur)
    expect(JSON.stringify(erreur) + erreur.message).not.toMatch(/nginx|Bad Gateway/)
  })

  it('une 204 est un succès de litVide, une 200 illisible est une erreur inattendue sans le texte reçu', async () => {
    serveur.use(
      http.delete(URL_MOI, () => new HttpResponse(null, { status: 204 })),
      http.get(URL_MOI, () => new HttpResponse('<html>SECRET-de-proxy</html>', { status: 200, headers: { 'Content-Type': 'application/json' } })),
    )
    const { client } = creeEssai()
    await expect(litVide(client.DELETE('/api/v1/me'))).resolves.toBeUndefined()
    const erreur = (await lit(client.GET('/api/v1/me')).catch((e: unknown) => e)) as ErreurApi
    expect(erreur).toBeInstanceOf(ErreurApi)
    expect(erreur).toMatchObject({ status: 0, title: textes.inattendu })
    // La cause garde sa nature, mais pas le message de `JSON.parse`, qui cite le début du corps (« Unexpected token '<', "<html>SECR… »).
    expect(erreur.cause).toBeInstanceOf(SyntaxError)
    expect(String((erreur.cause as Error).message) + erreur.message + JSON.stringify(erreur)).not.toMatch(/html|SECRET|proxy/)
  })

  it('lit refuse une réponse réussie sans corps, litVide refuse une erreur', async () => {
    serveur.use(
      http.get(URL_MOI, () => new HttpResponse(null, { status: 200 })),
      http.delete(URL_MOI, () => HttpResponse.json({ title: 'Interdit' }, { status: 403, headers: PROBLEME })),
    )
    const { client } = creeEssai()
    await expect(lit(client.GET('/api/v1/me'))).rejects.toBeInstanceOf(ErreurApi)
    await expect(litVide(client.DELETE('/api/v1/me'))).rejects.toMatchObject({ status: 403 })
  })
})

describe('échecs sans réponse', () => {
  it('une coupure donne ErreurReseau, cause conservée, et l’événement reseau:erreur', async () => {
    serveur.use(http.get(URL_MOI, () => HttpResponse.error()))
    const { client, vus } = creeEssai()
    const erreur = await lit(client.GET('/api/v1/me')).catch((e: unknown) => e)
    expect(erreur).toBeInstanceOf(ErreurReseau)
    expect(erreur).toMatchObject({ nature: 'coupure' })
    expect((erreur as ErreurReseau).cause).toBeInstanceOf(Error)
    expect(vus.find((v) => v.nom === 'reseau:erreur')?.donnees).toEqual({ methode: 'GET', chemin: '/api/v1/me', nature: 'coupure' })
  })

  it('un délai dépassé donne ErreurReseau de nature délai', async () => {
    serveur.use(http.get(URL_MOI, async () => { await delay('infinite') }))
    const { client, vus } = creeEssai({ delaiMs: 30 })
    await expect(lit(client.GET('/api/v1/me'))).rejects.toMatchObject({ name: 'ErreurReseau', nature: 'delai' })
    expect(vus.find((v) => v.nom === 'requete:fin')?.donnees).toMatchObject({ issue: 'delai' })
  })

  it('un AbortSignal annule en vol : l’annulation remonte telle quelle, sans passer pour une panne du réseau', async () => {
    let arrivee = () => {}
    const arrive = new Promise<void>((resolu) => (arrivee = resolu))
    serveur.use(http.get(URL_MOI, async () => { arrivee(); await delay('infinite') }))
    const { client, vus, noms } = creeEssai()
    const controle = new AbortController()
    const appel = lit(client.GET('/api/v1/me', { signal: controle.signal })).catch((e: unknown) => e)
    await arrive
    controle.abort()
    const erreur = await appel
    expect(erreur).not.toBeInstanceOf(ErreurReseau)
    expect(erreur).toMatchObject({ name: 'AbortError' })
    expect(noms()).toEqual(['requete:debut', 'requete:fin'])
    expect(vus.find((v) => v.nom === 'requete:fin')?.donnees).toMatchObject({ issue: 'annulee' })
  })

  it('un signal déjà annulé n’envoie rien et remonte l’annulation', async () => {
    const controle = new AbortController()
    controle.abort()
    const erreur = await lit(creeEssai().client.GET('/api/v1/me', { signal: controle.signal })).catch((e: unknown) => e)
    expect(erreur).toMatchObject({ name: 'AbortError' })
  })

  describe('pendant la lecture du corps, déjà après les en-têtes', () => {
    const corpsCoupe = () => new ReadableStream({ start: (c) => { c.enqueue(new TextEncoder().encode('{"id":')); c.error(new TypeError('network error')) } })

    it('une coupure est une ErreurReseau, et la requête finit en coupure, jamais en réponse', async () => {
      const { client, vus } = creeEssai({ fetch: () => Promise.resolve(new Response(corpsCoupe(), { status: 200, headers: { 'Content-Type': 'application/json' } })) })
      const erreur = await lit(client.GET('/api/v1/me')).catch((e: unknown) => e)
      expect(erreur).toMatchObject({ name: 'ErreurReseau', nature: 'coupure' })
      expect(vus.map((v) => v.donnees).filter((d) => 'issue' in d).map((d) => 'issue' in d && d.issue)).toEqual(['coupure'])
      expect(vus.map((v) => v.nom)).toContain('reseau:erreur')
    })

    it('un corps qui n’arrive jamais est un délai dépassé', async () => {
      const lenteur = (requete: Request) =>
        Promise.resolve(new Response(new ReadableStream({ start: (c) => requete.signal.addEventListener('abort', () => c.error(requete.signal.reason)) }), { status: 200 }))
      const { client } = creeEssai({ fetch: lenteur, delaiMs: 20 })
      await expect(lit(client.GET('/api/v1/me'))).rejects.toMatchObject({ name: 'ErreurReseau', nature: 'delai' })
    })
  })

  describe('délai par défaut', () => {
    afterEach(() => vi.useRealTimers())

    it('n’abandonne pas de minuteur derrière une requête terminée', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      await lit(creeEssai({ fetch: () => Promise.resolve(Response.json(MOI)) }).client.GET('/api/v1/me'))
      expect(vi.getTimerCount()).toBe(0)
    })

    it('coupe à 35 s, pas avant', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      const sansReponse = (requete: Request) => new Promise<Response>((_, rejette) => requete.signal.addEventListener('abort', () => rejette(requete.signal.reason)))
      const appel = lit(creeEssai({ fetch: sansReponse }).client.GET('/api/v1/me')).catch((e: unknown) => e)
      let fini = false
      void appel.then(() => (fini = true))
      await vi.advanceTimersByTimeAsync(34_999)
      expect(fini).toBe(false)
      await vi.advanceTimersByTimeAsync(1)
      expect(await appel).toMatchObject({ name: 'ErreurReseau', nature: 'delai' })
    })
  })
})

describe('événements', () => {
  it('émet requete:debut puis requete:fin, avec le chemin du contrat et le même identifiant, réussite ou erreur', async () => {
    serveur.use(
      http.delete('http://localhost:3000/api/v1/me/invitations/:id', () => HttpResponse.json({ title: 'x' }, { status: 409, headers: PROBLEME })),
      http.get(URL_MOI, () => HttpResponse.json(MOI)),
    )
    const { client, vus } = creeEssai()
    await client.GET('/api/v1/me')
    await client.DELETE('/api/v1/me/invitations/{id}', { params: { path: { id: '7' } } })
    const [d1, f1, d2, f2] = vus.map((v) => v.donnees as Record<string, unknown>)
    expect(vus.map((v) => v.nom)).toEqual(['requete:debut', 'requete:fin', 'requete:debut', 'requete:fin'])
    expect(d1).toMatchObject({ methode: 'GET', chemin: '/api/v1/me' })
    expect(f1).toMatchObject({ id: d1?.id, issue: 'reponse', statut: 200 })
    expect(d2).toMatchObject({ methode: 'DELETE', chemin: '/api/v1/me/invitations/{id}' })
    expect(f2).toMatchObject({ id: d2?.id, issue: 'reponse', statut: 409 })
    expect(d1?.id).not.toBe(d2?.id)
  })

  it.each([500, 503])('une réponse %i ferme aussi la requête (sinon F18 la compterait en cours pour toujours)', async (statut) => {
    serveur.use(http.get(URL_MOI, () => new HttpResponse(null, { status: statut })))
    const { client, noms, vus } = creeEssai()
    await client.GET('/api/v1/me')
    expect(noms()).toEqual(['requete:debut', 'requete:fin'])
    expect(vus[1]?.donnees).toMatchObject({ issue: 'reponse', statut })
  })

  it('émet limite avec le Retry-After lu, 10 s à défaut', async () => {
    serveur.use(http.get(URL_MOI, () => new HttpResponse(null, { status: 429, headers: { 'Retry-After': '30' } })))
    const { client, vus } = creeEssai()
    await client.GET('/api/v1/me')
    expect(vus.find((v) => v.nom === 'limite')?.donnees).toMatchObject({ retryApresS: 30 })
  })

  it('émet limite (avec le temps d’attente) sur une 429 et non-authentifie sur une 401', async () => {
    serveur.use(
      http.get(URL_MOI, () => new HttpResponse(null, { status: 429 })),
      http.get('http://localhost:3000/api/v1/me/sessions', () => new HttpResponse(null, { status: 401 })),
    )
    const { client, vus } = creeEssai()
    await client.GET('/api/v1/me')
    await client.GET('/api/v1/me/sessions')
    const donnees = (nom: string) => vus.find((v) => v.nom === nom)?.donnees
    expect(donnees('limite')).toEqual({ methode: 'GET', chemin: '/api/v1/me', retryApresS: 10 })
    expect(donnees('non-authentifie')).toEqual({ methode: 'GET', chemin: '/api/v1/me/sessions' })
  })
})
