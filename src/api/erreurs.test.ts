import { describe, expect, it } from 'vitest'
import { erreurs as textes } from '../textes/erreurs'
import { depuisReponse, ErreurApi, ErreurReseau, lisRetryApres, retryApresDeLimite, TropDeDemandes } from './erreurs'

const PROBLEME = 'application/problem+json'

function reponse(status: number, entetes: Record<string, string> = {}) {
  return new Response(null, { status, headers: entetes })
}

describe('depuisReponse, corps problem+json', () => {
  it('garde les champs du contrat, dont le pointeur d’une erreur de champ (422)', () => {
    const erreur = depuisReponse(reponse(422, { 'Content-Type': PROBLEME }), {
      type: 'https://notre-popote.fr/problemes/donnees_invalides',
      title: 'Données invalides',
      status: 422,
      detail: 'Le champ est refusé.',
      instance: 'a1b2c3',
      code: 'donnees_invalides',
      errors: [{ pointer: '/email', message: 'Adresse refusée.', parameter: null }],
    })
    expect(erreur).toBeInstanceOf(ErreurApi)
    expect(erreur).not.toBeInstanceOf(TropDeDemandes)
    expect(erreur).toMatchObject({
      status: 422,
      type: 'https://notre-popote.fr/problemes/donnees_invalides',
      code: 'donnees_invalides',
      title: 'Données invalides',
      instance: 'a1b2c3',
    })
    expect(erreur.errors?.[0]?.pointer).toBe('/email')
  })

  it('prend le statut de la réponse, jamais celui d’un corps qui le contredit', () => {
    const erreur = depuisReponse(reponse(503, { 'Content-Type': PROBLEME }), { title: 'x', status: 200 })
    expect(erreur.status).toBe(503)
  })

  it('accepte le paramètre en cause d’une erreur de champ et jette les entrées qui n’ont pas de message', () => {
    const erreur = depuisReponse(reponse(422, { 'Content-Type': `${PROBLEME}; charset=utf-8` }), {
      title: 'Données invalides',
      errors: [{ parameter: { name: 'limit', in: 'query' }, message: 'Trop grand.' }, { pointer: '/x' }, 'texte', null],
    })
    expect(erreur.errors).toEqual([{ message: 'Trop grand.', pointer: null, parameter: { name: 'limit', in: 'query' } }])
  })

  it('ne retient pas un code, une référence ou un titre qui n’ont pas la forme du contrat', () => {
    const erreur = depuisReponse(reponse(500, { 'Content-Type': PROBLEME }), {
      code: '<script>alert(1)</script>',
      instance: 'une phrase avec des espaces',
      title: 'x'.repeat(500),
    })
    expect(erreur.code).toBeUndefined()
    expect(erreur.instance).toBeUndefined()
    expect(erreur.title).toBe(textes.serveur)
  })

  it('accepte le pointeur de la racine (chaîne vide, RFC 6901) : l’erreur porte sur tout le corps', () => {
    const erreur = depuisReponse(reponse(422, { 'Content-Type': PROBLEME }), { errors: [{ pointer: '', message: 'Corps refusé.' }] })
    expect(erreur.errors).toEqual([{ message: 'Corps refusé.', pointer: '', parameter: null }])
  })

  it('reconnaît le type de contenu sans tenir compte de la casse, et borne à 100 les erreurs de champ', () => {
    const errors = Array.from({ length: 150 }, (_, i) => ({ pointer: `/c${i}`, message: 'Refusé.' }))
    const erreur = depuisReponse(reponse(422, { 'Content-Type': 'Application/Problem+JSON' }), { title: 'Données invalides', errors })
    expect(erreur.title).toBe('Données invalides')
    expect(erreur.errors).toHaveLength(100)
  })

  it('reprend X-Request-Id quand le problem+json n’a pas d’instance', () => {
    expect(depuisReponse(reponse(500, { 'Content-Type': PROBLEME, 'X-Request-Id': 'abc123' }), { title: 'x' }).instance).toBe('abc123')
  })

  it.each([['une phrase'], [null], [[1, 2]], [42]])('un corps problem+json qui n’est pas un objet (%j) donne l’erreur générique', (corps) => {
    expect(depuisReponse(reponse(500, { 'Content-Type': PROBLEME }), corps).title).toBe(textes.serveur)
  })
})

describe('depuisReponse, tout autre corps', () => {
  it('une 502 en HTML donne un titre français sans un mot du corps reçu', () => {
    const html = '<html><body><h1>502 Bad Gateway</h1>nginx/1.25 upstream timed out</body></html>'
    const erreur = depuisReponse(reponse(502, { 'Content-Type': 'text/html' }), html)
    expect(erreur.title).toBe(textes.serveur)
    const tout = JSON.stringify({ ...erreur, message: erreur.message, pile: erreur.stack })
    for (const mot of ['nginx', 'Bad Gateway', 'upstream', 'html']) expect(tout).not.toContain(mot)
    expect(erreur).toMatchObject({ status: 502, detail: undefined, code: undefined, type: undefined })
  })

  it.each([
    ['du texte brut', 'text/plain', 'Internal error: secret-trace'],
    ['un corps vide', 'text/plain', ''],
    ['du JSON qui n’est pas du problem+json', 'application/json', { detail: 'secret-trace', code: 'x' }],
  ])('%s ne garde ni détail ni code', (_nom, type, corps) => {
    const erreur = depuisReponse(reponse(500, { 'Content-Type': type }), corps)
    expect(erreur).toMatchObject({ title: textes.serveur, detail: undefined, code: undefined })
    expect(JSON.stringify(erreur)).not.toContain('secret-trace')
  })

  it('donne un titre propre à la classe de statut : serveur, délai, inattendu', () => {
    expect(depuisReponse(reponse(503), '').title).toBe(textes.serveur)
    expect(depuisReponse(reponse(504), '').title).toBe(textes.delai)
    expect(depuisReponse(reponse(408), '').title).toBe(textes.delai)
    expect(depuisReponse(reponse(404), '').title).toBe(textes.inattendu)
  })

  it('reprend la référence de la requête de l’en-tête X-Request-Id si elle a la forme attendue', () => {
    expect(depuisReponse(reponse(502, { 'X-Request-Id': '9f8e7d6c' }), '').instance).toBe('9f8e7d6c')
    expect(depuisReponse(reponse(502, { 'X-Request-Id': '<b>x</b>' }), '').instance).toBeUndefined()
  })
})

describe('Retry-After', () => {
  const maintenant = () => Date.parse('2015-10-21T07:28:00Z')

  it.each([
    ['30', 30],
    [' 7 ', 7],
    ['0', 1],
    ['99999', 86_400],
    ['86400', 86_400],
    ['99999999999999999999', 86_400],
    ['Wed, 21 Oct 2015 07:29:30 GMT', 90],
    ['Wed, 21 Oct 2015 07:00:00 GMT', 1],
    ['Wed, 21 Oct 2115 07:28:00 GMT', 86_400],
  ])('%j se lit %j seconde(s)', (valeur, attendu) => {
    expect(lisRetryApres(valeur, maintenant)).toBe(attendu)
  })

  it('arrondit au-dessus : 89,5 s d’attente se lisent 90 s, jamais 89', () => {
    expect(lisRetryApres('Wed, 21 Oct 2015 07:29:30 GMT', () => maintenant() + 500)).toBe(90)
  })

  it.each([['-5'], ['abc'], ['1.5'], ['1e3'], [''], ['5 secondes'], ['May 5'], ['Sun Nov  6 08:49:37 1994'], [null]])('%j est absent ou illisible', (valeur) => {
    expect(lisRetryApres(valeur, maintenant)).toBeUndefined()
  })

  it('une 429 sans Retry-After lisible attend 10 s, une 429 lisible attend ce qu’on lui dit', () => {
    expect(retryApresDeLimite(reponse(429))).toBe(10)
    expect(retryApresDeLimite(reponse(429, { 'Retry-After': 'abc' }))).toBe(10)
    expect(retryApresDeLimite(reponse(429, { 'Retry-After': '30' }))).toBe(30)
  })

  it('une 429 donne TropDeDemandes, quel que soit son corps', () => {
    const erreur = depuisReponse(reponse(429, { 'Retry-After': '30', 'Content-Type': 'text/html' }), '<html>')
    expect(erreur).toBeInstanceOf(TropDeDemandes)
    expect(erreur.retryApresS).toBe(30)
  })

  it('une 503 garde son Retry-After, ou rien', () => {
    expect(depuisReponse(reponse(503, { 'Retry-After': '1' }), '').retryApresS).toBe(1)
    expect(depuisReponse(reponse(503), '').retryApresS).toBeUndefined()
  })
})

describe('ErreurApi', () => {
  it('a pour message le statut et le code s’il y en a un, jamais un texte reçu', () => {
    expect(new ErreurApi({ status: 500, title: 'x' }).message).toBe('HTTP 500')
    expect(new ErreurApi({ status: 503, title: 'x', code: 'base_indisponible' }).message).toBe('HTTP 503 base_indisponible')
  })
})

describe('ErreurReseau', () => {
  it('a une phrase propre à sa nature', () => {
    expect(new ErreurReseau('coupure', { cause: null }).message).toBe(textes.reseau)
    expect(new ErreurReseau('delai', { cause: null }).message).toBe(textes.delai)
  })

  it('garde la cause et dit si c’est une coupure ou un délai', () => {
    const cause = new TypeError('Failed to fetch')
    const erreur = new ErreurReseau('delai', { cause })
    expect(erreur.nature).toBe('delai')
    expect(erreur.cause).toBe(cause)
  })
})
