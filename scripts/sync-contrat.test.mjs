import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { normalise, synchronise, verifie } from './sync-contrat.mjs'

const SHA = 'a'.repeat(40)
const AUTRE_SHA = 'b'.repeat(40)
const CONTRAT = JSON.stringify({ openapi: '3.1.0', info: { title: 'Popote', version: '1' }, paths: {} }, null, 2) + '\n'

/** Une fausse récupération : `routes` associe un début d'URL à une réponse (ou à une suite de réponses). */
function faussePile(routes) {
  const appels = []
  const inits = []
  const restes = new Map(Object.entries(routes).map(([url, r]) => [url, Array.isArray(r) ? [...r] : [r]]))
  const fetch = async (url, init) => {
    appels.push(String(url))
    inits.push(init)
    const cle = [...restes.keys()].find((debut) => String(url).startsWith(debut))
    if (!cle) return new Response('introuvable', { status: 404 })
    const file = restes.get(cle)
    const reponse = file.length > 1 ? file.shift() : file[0]
    return new Response(reponse.corps, { status: reponse.statut ?? 200 })
  }
  return { fetch, appels, inits }
}

const RAW = (sha) => `https://raw.githubusercontent.com/kamil-bentounes/popote-api/${sha}/openapi.json`
const COMPARE = (sha) => `https://api.github.com/repos/kamil-bentounes/popote-api/compare/${sha}...main`
const ancetre = (statut) => ({ corps: JSON.stringify({ status: statut }) })

let racine
beforeEach(() => {
  racine = mkdtempSync(join(tmpdir(), 'contrat-'))
  mkdirSync(join(racine, 'contrat'))
})
afterEach(() => rmSync(racine, { recursive: true, force: true }))

const options = (fetch, plus = {}) => ({ racine, fetch, pauseMs: 0, resoudreMain: async () => SHA, ...plus })
const lis = (chemin) => readFileSync(join(racine, chemin), 'utf8')

describe('synchronise', () => {
  it('copie le contrat du SHA demandé et écrit le SHA dans contrat/AMONT', async () => {
    const { fetch, appels } = faussePile({ [RAW(SHA)]: { corps: CONTRAT } })
    await synchronise(SHA, options(fetch))
    expect(lis('contrat/openapi.json')).toBe(CONTRAT)
    expect(lis('contrat/AMONT')).toBe(`${SHA}\n`)
    expect(appels).toEqual([RAW(SHA)])
  })

  it('résout « main » par l’injection prévue, sans jeton', async () => {
    const { fetch } = faussePile({ [RAW(SHA)]: { corps: CONTRAT } })
    await synchronise('main', options(fetch))
    expect(lis('contrat/AMONT')).toBe(`${SHA}\n`)
  })

  it.each(['zzz', 'A'.repeat(40), 'a'.repeat(39), 'a'.repeat(41), `${SHA}/../x`, '', 'refs/heads/main'])(
    'refuse le SHA malformé « %s » sans rien télécharger',
    async (mauvais) => {
      const { fetch, appels } = faussePile({})
      await expect(synchronise(mauvais, options(fetch))).rejects.toThrow(/SHA/)
      expect(appels).toEqual([])
    },
  )

  it('refuse un résultat de résolution de « main » qui n’est pas un SHA', async () => {
    const { fetch } = faussePile({})
    await expect(synchronise('main', options(fetch, { resoudreMain: async () => 'pas-un-sha' }))).rejects.toThrow(/SHA/)
  })

  it('refuse un corps qui n’est pas du JSON', async () => {
    const { fetch } = faussePile({ [RAW(SHA)]: { corps: '<html>erreur</html>' } })
    await expect(synchronise(SHA, options(fetch))).rejects.toThrow(/JSON/)
  })

  it.each([
    ['openapi 2.0', { swagger: '2.0' }],
    ['openapi 3.0', { openapi: '3.0.3', paths: {} }],
    ['sans champ openapi', { paths: {} }],
    ['un tableau', []],
  ])('refuse %s', async (_nom, contenu) => {
    const { fetch } = faussePile({ [RAW(SHA)]: { corps: JSON.stringify(contenu) } })
    await expect(synchronise(SHA, options(fetch))).rejects.toThrow(/3\.1/)
  })

  it('n’écrit rien quand le contrat est refusé', async () => {
    const { fetch } = faussePile({ [RAW(SHA)]: { corps: '{' } })
    await expect(synchronise(SHA, options(fetch))).rejects.toThrow(/JSON/)
    expect(() => lis('contrat/AMONT')).toThrow(/ENOENT/)
    expect(() => lis('contrat/openapi.json')).toThrow(/ENOENT/)
  })

  it('écrit des fins de ligne LF et un saut de ligne final, même si la source a des CRLF et n’en a pas', async () => {
    const source = CONTRAT.trimEnd().replaceAll('\n', '\r\n')
    const { fetch } = faussePile({ [RAW(SHA)]: { corps: source } })
    await synchronise(SHA, options(fetch))
    const ecrit = lis('contrat/openapi.json')
    expect(ecrit).not.toContain('\r')
    expect(ecrit.endsWith('}\n')).toBe(true)
    expect(ecrit.endsWith('\n\n')).toBe(false)
  })

  it('refuse de suivre une redirection : l’hôte reste celui de la liste', async () => {
    const { fetch, inits } = faussePile({ [RAW(SHA)]: { corps: CONTRAT } })
    await synchronise(SHA, options(fetch))
    expect(inits[0]).toMatchObject({ redirect: 'error' })
  })

  it('refuse un contrat de plus d’1 Mio, même valide', async () => {
    const gros = JSON.stringify({ openapi: '3.1.0', paths: {}, 'x-remplissage': 'a'.repeat(1024 * 1024) })
    const { fetch } = faussePile({ [RAW(SHA)]: { corps: gros } })
    await expect(synchronise(SHA, options(fetch))).rejects.toThrow(/1 Mio/)
  })

  it.each(['3.1.', '3.1.foo', '3.10.0', '3.1.0-rc'])('refuse la version « %s » comme n’étant pas une 3.1.x', async (version) => {
    const { fetch } = faussePile({ [RAW(SHA)]: { corps: JSON.stringify({ openapi: version, paths: {} }) } })
    await expect(synchronise(SHA, options(fetch))).rejects.toThrow(/3\.1/)
  })

  it('refuse d’écrire à travers un lien symbolique et laisse sa cible intacte', async () => {
    const cible = join(racine, 'cible.txt')
    writeFileSync(cible, 'intact')
    symlinkSync(cible, join(racine, 'contrat/openapi.json'))
    const { fetch } = faussePile({ [RAW(SHA)]: { corps: CONTRAT } })
    await expect(synchronise(SHA, options(fetch))).rejects.toThrow(/lien symbolique/)
    expect(readFileSync(cible, 'utf8')).toBe('intact')
  })

  it('reprend après une erreur serveur, puis abandonne après trois essais', async () => {
    const reprise = faussePile({ [RAW(SHA)]: [{ statut: 503, corps: '' }, { statut: 502, corps: '' }, { corps: CONTRAT }] })
    await synchronise(SHA, options(reprise.fetch))
    expect(reprise.appels).toHaveLength(3)

    const panne = faussePile({ [RAW(SHA)]: { statut: 503, corps: '' } })
    await expect(synchronise(SHA, options(panne.fetch))).rejects.toThrow(/injoignable/)
    expect(panne.appels).toHaveLength(3)
  })

  it('ne reprend pas sur une erreur 404 (le SHA n’existe pas)', async () => {
    const { fetch, appels } = faussePile({ [RAW(SHA)]: { statut: 404, corps: 'Not Found' } })
    await expect(synchronise(SHA, options(fetch))).rejects.toThrow(/404/)
    expect(appels).toHaveLength(1)
  })
})

describe('verifie', () => {
  async function prepare(contenu = CONTRAT) {
    writeFileSync(join(racine, 'contrat/openapi.json'), contenu)
    writeFileSync(join(racine, 'contrat/AMONT'), `${SHA}\n`)
  }
  const pile = (plus = {}) => faussePile({ [COMPARE(SHA)]: ancetre('ahead'), [RAW(SHA)]: { corps: CONTRAT }, ...plus })

  it('rend ok quand la copie est celle de l’amont et que le SHA est sur main', async () => {
    await prepare()
    const resultat = await verifie(options(pile().fetch, { token: 'jeton-de-test' }))
    expect(resultat).toEqual({ ok: true })
  })

  it('accepte « identical » (le SHA est la tête de main)', async () => {
    await prepare()
    const resultat = await verifie(options(pile({ [COMPARE(SHA)]: ancetre('identical') }).fetch))
    expect(resultat.ok).toBe(true)
  })

  it.each(['behind', 'diverged'])('refuse un SHA qui n’est pas un ancêtre de main (%s)', async (statut) => {
    await prepare()
    const resultat = await verifie(options(pile({ [COMPARE(SHA)]: ancetre(statut) }).fetch))
    expect(resultat.ok).toBe(false)
    expect(resultat.raison).toMatch(/ancêtre|main/)
  })

  it('refuse un SHA que GitHub ne connaît pas (404 à la comparaison) en le disant', async () => {
    await prepare()
    const resultat = await verifie(options(pile({ [COMPARE(SHA)]: { statut: 404, corps: '{}' } }).fetch))
    expect(resultat.ok).toBe(false)
    expect(resultat.raison).toMatch(/pas connu/)
  })

  it('distingue un jeton refusé (401) d’un SHA inconnu', async () => {
    await prepare()
    const resultat = await verifie(options(pile({ [COMPARE(SHA)]: { statut: 401, corps: '{}' } }).fetch))
    expect(resultat.ok).toBe(false)
    expect(resultat.raison).toMatch(/jeton/)
  })

  it('réessaie sur une limite de débit (403, 429) puis réussit', async () => {
    await prepare()
    const reprise = pile({ [COMPARE(SHA)]: [{ statut: 429, corps: '{}' }, { statut: 403, corps: '{}' }, ancetre('ahead')] })
    expect((await verifie(options(reprise.fetch))).ok).toBe(true)
  })

  it('refuse, en nommant la limite, quand elle dure trois essais', async () => {
    await prepare()
    const resultat = await verifie(options(pile({ [COMPARE(SHA)]: { statut: 403, corps: '{}' } }).fetch))
    expect(resultat.ok).toBe(false)
    expect(resultat.raison).toMatch(/limite|refus/)
  })

  it('demande une réponse légère à l’API de comparaison (per_page=1)', async () => {
    await prepare()
    const { fetch, appels } = pile()
    await verifie(options(fetch))
    expect(appels.find((url) => url.includes('/compare/'))).toContain('per_page=1')
  })

  it('refuse quand l’API de comparaison est injoignable : jamais vert par défaut', async () => {
    await prepare()
    const resultat = await verifie(options(pile({ [COMPARE(SHA)]: { statut: 503, corps: '' } }).fetch))
    expect(resultat.ok).toBe(false)
    expect(resultat.raison).toMatch(/injoignable/)
  })

  it('refuse quand un seul octet de la copie change', async () => {
    await prepare(CONTRAT.replace('"1"', '"2"'))
    const resultat = await verifie(options(pile().fetch))
    expect(resultat.ok).toBe(false)
    expect(resultat.raison).toMatch(/copie/)
  })

  it('refuse quand la copie ne diffère que par des espaces ou des fins de ligne', async () => {
    await prepare(CONTRAT.replace('"openapi": "3.1.0"', '"openapi":  "3.1.0"'))
    expect((await verifie(options(pile().fetch))).ok).toBe(false)
    await prepare(CONTRAT.replaceAll('\n', '\r\n'))
    expect((await verifie(options(pile().fetch))).ok).toBe(false)
    await prepare(CONTRAT + '\n')
    expect((await verifie(options(pile().fetch))).ok).toBe(false)
  })

  it('refuse un AMONT malformé ou absent', async () => {
    await prepare()
    writeFileSync(join(racine, 'contrat/AMONT'), 'pas-un-sha\n')
    expect((await verifie(options(pile().fetch))).ok).toBe(false)
    rmSync(join(racine, 'contrat/AMONT'))
    expect((await verifie(options(pile().fetch))).ok).toBe(false)
  })

  it('compare à l’amont du SHA de AMONT, pas à celui de main', async () => {
    await prepare()
    writeFileSync(join(racine, 'contrat/AMONT'), `${AUTRE_SHA}\n`)
    const { fetch, appels } = faussePile({ [COMPARE(AUTRE_SHA)]: ancetre('ahead'), [RAW(AUTRE_SHA)]: { corps: CONTRAT } })
    expect((await verifie(options(fetch))).ok).toBe(true)
    expect(appels.every((url) => url.includes(AUTRE_SHA))).toBe(true)
  })

  it('envoie le jeton fourni à l’API de comparaison, jamais au téléchargement du contrat', async () => {
    await prepare()
    const entetes = []
    const base = pile()
    const fetch = async (url, init) => {
      entetes.push([String(url), init?.headers?.Authorization])
      return base.fetch(url, init)
    }
    await verifie(options(fetch, { token: 'jeton-de-test' }))
    expect(entetes.find(([url]) => url.includes('/compare/'))?.[1]).toBe('Bearer jeton-de-test')
    expect(entetes.find(([url]) => url.includes('raw.githubusercontent.com'))?.[1]).toBeUndefined()
  })
})

describe('normalise', () => {
  it('rend LF et un seul saut de ligne final', () => {
    expect(normalise('a\r\nb')).toBe('a\nb\n')
    expect(normalise('a\nb\n')).toBe('a\nb\n')
  })
})
