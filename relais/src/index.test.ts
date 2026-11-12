import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import relais, { type Env } from './index'

const SECRET = 'secret-de-test-pas-un-vrai'
const ORIGINE = 'https://api.exemple.test'

function environnement(surcharge: Partial<Env> = {}) {
  const assets = vi.fn(async () => new Response('<html></html>', { headers: { 'Content-Type': 'text/html' } }))
  const env = {
    ASSETS: { fetch: assets } as unknown as Fetcher,
    API_ORIGIN: ORIGINE,
    RELAY_SECRET: SECRET,
    ENVIRONNEMENT: 'essai',
    CSP_MODE: 'report-only',
    CSP: "default-src 'self'",
    ...surcharge,
  } satisfies Env
  return { env, assets }
}

function appelle(env: Env, chemin: string, init?: RequestInit) {
  return relais.fetch(new Request(`https://essai.notre-popote.fr${chemin}`, init), env)
}

describe('relais — les fichiers du front', () => {
  it('pose les en-têtes de sécurité sur un fichier', async () => {
    const { env } = environnement()

    const r = await appelle(env, '/')

    expect(r.status).toBe(200)
    expect(r.headers.get('Strict-Transport-Security')).toBe('max-age=63072000; includeSubDomains')
    expect(r.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(r.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(r.headers.get('Permissions-Policy')).toContain('microphone=()')
    expect(r.headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin')
  })

  it('pose preload sur la prod seulement', async () => {
    const { env } = environnement({ ENVIRONNEMENT: 'prod' })

    const r = await appelle(env, '/')

    expect(r.headers.get('Strict-Transport-Security')).toBe('max-age=63072000; includeSubDomains; preload')
  })

  it.each([
    ['essai', 'essai'],
    ['absent', undefined],
    ['inconnu', 'Prod'],
  ])('ne pose pas preload quand l’environnement est %s (échec fermé)', async (_cas, valeur) => {
    const { env } = environnement({ ENVIRONNEMENT: valeur as Env['ENVIRONNEMENT'] })

    const r = await appelle(env, '/')

    expect(r.headers.get('Strict-Transport-Security')).not.toContain('preload')
  })

  it('envoie la CSP en rapport seul tant que le mode est report-only', async () => {
    const { env } = environnement({ CSP_MODE: 'report-only' })

    const r = await appelle(env, '/')

    expect(r.headers.get('Content-Security-Policy-Report-Only')).toBe("default-src 'self'")
    expect(r.headers.has('Content-Security-Policy')).toBe(false)
  })

  it('applique la CSP en mode enforce, sans la version en rapport', async () => {
    const { env } = environnement({ CSP_MODE: 'enforce' })

    const r = await appelle(env, '/')

    expect(r.headers.get('Content-Security-Policy')).toBe("default-src 'self'")
    expect(r.headers.has('Content-Security-Policy-Report-Only')).toBe(false)
  })

  it('garde les en-têtes de sécurité même quand le fichier est introuvable', async () => {
    const { env, assets } = environnement()
    assets.mockResolvedValueOnce(new Response('absent', { status: 404 }))

    const r = await appelle(env, '/inconnu.js')

    expect(r.status).toBe(404)
    expect(r.headers.get('Strict-Transport-Security')).toContain('max-age=')
  })
})

describe('relais — /api/*', () => {
  const amont = vi.fn()

  beforeEach(() => {
    amont.mockReset()
    amont.mockResolvedValue(new Response('{"status":"ok"}', { headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', amont)
  })
  afterEach(() => vi.unstubAllGlobals())

  function requeteAmont(): { cible: URL, entetes: Headers, init: RequestInit } {
    const [cible, init] = amont.mock.calls[0] as [URL, RequestInit]
    return { cible, entetes: init.headers as Headers, init }
  }

  it('relaie vers l’origine configurée avec le chemin et la requête, sans passer par les fichiers', async () => {
    const { env, assets } = environnement()

    const r = await appelle(env, '/api/healthz?verbeux=1')

    expect(r.status).toBe(200)
    expect(await r.json()).toEqual({ status: 'ok' })
    expect(requeteAmont().cible.href).toBe(`${ORIGINE}/api/healthz?verbeux=1`)
    expect(assets).not.toHaveBeenCalled()
  })

  it('pose le secret et l’IP vue par Cloudflare', async () => {
    const { env } = environnement()

    await appelle(env, '/api/healthz', { headers: { 'CF-Connecting-IP': '203.0.113.7' } })

    const { entetes } = requeteAmont()
    expect(entetes.get('X-Popote-Relais')).toBe(SECRET)
    expect(entetes.get('X-Popote-IP')).toBe('203.0.113.7')
  })

  it('écrase le secret et l’IP envoyés par le client', async () => {
    const { env } = environnement()

    await appelle(env, '/api/healthz', {
      headers: {
        'CF-Connecting-IP': '203.0.113.7',
        'X-Popote-Relais': 'secret-forge-par-le-client',
        'X-Popote-IP': '10.0.0.1',
      },
    })

    const { entetes } = requeteAmont()
    expect(entetes.get('X-Popote-Relais')).toBe(SECRET)
    expect(entetes.get('X-Popote-IP')).toBe('203.0.113.7')
  })

  it('n’accorde pas une IP forgée par le client quand Cloudflare n’en donne aucune', async () => {
    const { env } = environnement()

    await appelle(env, '/api/healthz', { headers: { 'X-Popote-IP': '10.0.0.1' } })

    expect(requeteAmont().entetes.get('X-Popote-IP')).toBe('')
  })

  it('transmet la méthode, le corps et les cookies, sans l’hôte d’origine', async () => {
    const { env } = environnement()

    await appelle(env, '/api/recettes', {
      method: 'POST',
      body: '{"nom":"soupe"}',
      headers: { 'Content-Type': 'application/json', Cookie: 'a=1' },
    })

    const { entetes, init } = requeteAmont()
    expect(init.method).toBe('POST')
    expect(init.redirect).toBe('manual')
    expect(await new Response(init.body as BodyInit).text()).toBe('{"nom":"soupe"}')
    expect(entetes.get('Cookie')).toBe('a=1')
    expect(entetes.has('host')).toBe(false)
  })

  it('n’envoie pas de corps pour un GET', async () => {
    const { env } = environnement()

    await appelle(env, '/api/healthz')

    expect(requeteAmont().init.body).toBeUndefined()
  })

  it.each([
    ['/api', 'le préfixe seul'],
    ['/apis/x', 'un préfixe voisin'],
    ['/API/healthz', 'une autre casse'],
    ['/api/../index.html', 'un chemin qui remonte hors de /api/'],
    ['/api/%2e%2e/index.html', 'un point encodé qui remonte hors de /api/'],
    ['/connexion', 'une route du front'],
  ])('ne relaie pas %s (%s) : le front le sert', async (chemin) => {
    const { env, assets } = environnement()

    const r = await appelle(env, chemin)

    expect(amont).not.toHaveBeenCalled()
    expect(assets).toHaveBeenCalledOnce()
    expect(r.headers.get('Strict-Transport-Security')).toContain('max-age=')
  })

  it('pose Cache-Control: no-store quand l’amont ne dit rien', async () => {
    const { env } = environnement()

    const r = await appelle(env, '/api/healthz')

    expect(r.headers.get('Cache-Control')).toBe('no-store')
  })

  it('interdit le cache de Cloudflare pour le sous-appel, quel que soit le statut', async () => {
    const { env } = environnement()

    await appelle(env, '/api/photos/x.png')

    const init = requeteAmont().init as RequestInit & { cf?: { cacheTtlByStatus?: Record<string, number> } }
    expect(init.cache).toBe('no-store')
    expect(init.cf?.cacheTtlByStatus).toEqual({ '100-599': -1 })
  })

  it('pose les en-têtes de sécurité d’une réponse JSON', async () => {
    const { env } = environnement()

    const r = await appelle(env, '/api/healthz')

    expect(r.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(r.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(r.headers.get('Strict-Transport-Security')).toBe('max-age=63072000; includeSubDomains')
    expect(r.headers.get('Cache-Control')).toBe('no-store')
  })

  it('pose preload sur les réponses de l’API en prod seulement', async () => {
    const { env } = environnement({ ENVIRONNEMENT: 'prod' })

    const r = await appelle(env, '/api/healthz')

    expect(r.headers.get('Strict-Transport-Security')).toContain('preload')
  })

  it('n’écrase pas les en-têtes de sécurité posés par l’API', async () => {
    amont.mockResolvedValue(new Response('{}', {
      headers: {
        'X-Content-Type-Options': 'nosniff, autre',
        'Referrer-Policy': 'no-referrer',
        'Strict-Transport-Security': 'max-age=1',
        'Cache-Control': 'private, no-cache',
      },
    }))
    const { env } = environnement()

    const r = await appelle(env, '/api/semaine')

    expect(r.headers.get('X-Content-Type-Options')).toBe('nosniff, autre')
    expect(r.headers.get('Referrer-Policy')).toBe('no-referrer')
    expect(r.headers.get('Strict-Transport-Security')).toBe('max-age=1')
    expect(r.headers.get('Cache-Control')).toBe('private, no-cache')
  })

  it('respecte le Cache-Control de l’amont', async () => {
    amont.mockResolvedValue(new Response('{}', { headers: { 'Cache-Control': 'private, max-age=60' } }))
    const { env } = environnement()

    const r = await appelle(env, '/api/semaine')

    expect(r.headers.get('Cache-Control')).toBe('private, max-age=60')
  })

  it('rend tel quel le statut et le Set-Cookie de l’amont', async () => {
    const reponse = new Response('{}', { status: 409 })
    reponse.headers.append('Set-Cookie', '__Host-session=x; HttpOnly; Secure; Path=/')
    amont.mockResolvedValue(reponse)
    const { env } = environnement()

    const r = await appelle(env, '/api/session', { method: 'POST' })

    expect(r.status).toBe(409)
    expect(r.headers.get('Set-Cookie')).toBe('__Host-session=x; HttpOnly; Secure; Path=/')
  })

  it('ne suit pas une redirection de l’amont : le client la reçoit', async () => {
    amont.mockResolvedValue(new Response(null, { status: 302, headers: { Location: '/api/ailleurs' } }))
    const { env } = environnement()

    const r = await appelle(env, '/api/ancien')

    expect(r.status).toBe(302)
    expect(r.headers.get('Location')).toBe('/api/ailleurs')
  })
})

describe('relais — l’amont est en panne', () => {
  const amont = vi.fn()

  beforeEach(() => {
    amont.mockReset()
    vi.stubGlobal('fetch', amont)
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it.each([
    ['la connexion échoue', new TypeError('fetch failed: connect ECONNREFUSED 10.1.2.3:443')],
    ['le délai est dépassé', new DOMException('The operation timed out', 'TimeoutError')],
  ])('rend une 502 problem+json quand %s', async (_cas, erreur) => {
    amont.mockRejectedValue(erreur)
    const { env } = environnement()

    const r = await appelle(env, '/api/healthz')

    expect(r.status).toBe(502)
    expect(r.headers.get('Content-Type')).toBe('application/problem+json')
    expect(r.headers.get('Cache-Control')).toBe('no-store')
    const corps = await r.json() as Record<string, unknown>
    expect(corps).toMatchObject({ status: 502, code: 'api_indisponible' })
    expect(corps.title).toEqual(expect.stringContaining('Réessaie'))
  })

  it.each([520, 522, 526, 530])(
    'remplace la page d’erreur Cloudflare %i, qui nomme l’hôte, par la 502 problem+json', async (statut) => {
      amont.mockResolvedValue(new Response(`<title>Origin DNS error | api.exemple.test</title>`, {
        status: statut, headers: { 'Content-Type': 'text/html' },
      }))
      const { env } = environnement()

      const r = await appelle(env, '/api/healthz')

      expect(r.status).toBe(502)
      expect(r.headers.get('Content-Type')).toBe('application/problem+json')
      expect(r.headers.get('Cache-Control')).toBe('no-store')
      expect(await r.text()).not.toContain('api.exemple.test')
    })

  it.each([500, 502, 503, 504])('laisse passer l’erreur %i émise par l’API elle-même', async (statut) => {
    amont.mockResolvedValue(new Response('{"code":"autre"}', { status: statut }))
    const { env } = environnement()

    const r = await appelle(env, '/api/healthz')

    expect(r.status).toBe(statut)
    expect(await r.json()).toEqual({ code: 'autre' })
  })

  it('ne laisse filtrer ni le secret, ni l’origine, ni le message de l’erreur', async () => {
    amont.mockRejectedValue(new TypeError(`fetch failed: ${ORIGINE} ${SECRET} ECONNREFUSED`))
    const { env } = environnement()

    const r = await appelle(env, '/api/healthz')

    const texte = await r.text()
    expect(texte).not.toContain(SECRET)
    expect(texte).not.toContain('api.exemple.test')
    expect(texte).not.toContain('ECONNREFUSED')
    expect(Object.keys(JSON.parse(texte)).sort()).toEqual(['code', 'status', 'title', 'type'])
  })

  it('n’écrit pas le secret dans les journaux', async () => {
    amont.mockRejectedValue(new TypeError(`fetch failed ${SECRET}`))
    const { env } = environnement()

    await appelle(env, '/api/healthz')

    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(SECRET)
  })

  it('borne l’appel à l’amont par un délai', async () => {
    amont.mockResolvedValue(new Response('{}'))
    const { env } = environnement()

    await appelle(env, '/api/healthz')

    const init = amont.mock.calls[0]![1] as RequestInit
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it.each(['', undefined as unknown as string])('refuse de relayer sans secret configuré (%s)', async (secret) => {
    const { env } = environnement({ RELAY_SECRET: secret })

    const r = await appelle(env, '/api/healthz')

    expect(amont).not.toHaveBeenCalled()
    expect(r.status).toBe(502)
    expect(await r.json()).toMatchObject({ code: 'api_indisponible' })
  })
})
