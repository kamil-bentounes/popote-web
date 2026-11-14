import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { genere, operations, rendu, routesProtegees } from './genere-routes-protegees.mjs'

const session = [{ session: [] }]

describe('routesProtegees', () => {
  it('liste les opérations qui portent `security`, au format « MÉTHODE chemin »', () => {
    const contrat = {
      paths: {
        '/api/v1/me': { get: { security: session }, delete: { security: session } },
        '/api/v1/sessions': { post: {} },
        '/api/healthz': { get: {} },
      },
    }
    expect(routesProtegees(contrat)).toEqual(['DELETE /api/v1/me', 'GET /api/v1/me'])
  })

  it('applique la sécurité de la racine, sauf à une opération qui la retire par `security: []`', () => {
    const contrat = {
      security: session,
      paths: {
        '/a': { get: {} },
        '/b': { get: { security: [] } },
      },
    }
    expect(routesProtegees(contrat)).toEqual(['GET /a'])
  })

  it('ne tient pas pour protégée une opération où l’anonyme reste admis (`{}` parmi les exigences)', () => {
    const contrat = { paths: { '/a': { get: { security: [{}, { session: [] }] } } } }
    expect(routesProtegees(contrat)).toEqual([])
  })

  it('ignore ce qui n’est pas une méthode HTTP dans un chemin (parameters, summary…)', () => {
    const contrat = { paths: { '/a/{id}': { parameters: [{ name: 'id' }], summary: 'x', get: { security: session } } } }
    expect(routesProtegees(contrat)).toEqual(['GET /a/{id}'])
  })

  it('trie le résultat, quel que soit l’ordre du contrat', () => {
    const contrat = { paths: { '/z': { get: { security: session } }, '/a': { post: { security: session }, get: { security: session } } } }
    expect(routesProtegees(contrat)).toEqual(['GET /a', 'GET /z', 'POST /a'])
  })

  it('un contrat sans chemins ne donne aucune route', () => {
    expect(routesProtegees({})).toEqual([])
  })

  it('refuse un chemin décrit par `$ref` plutôt que de laisser disparaître ses opérations protégées', () => {
    const contrat = { paths: { '/a': { $ref: '#/components/pathItems/a' } } }
    expect(() => routesProtegees(contrat)).toThrow(/\$ref/)
    expect(() => operations(contrat)).toThrow(/\$ref/)
  })
})

describe('operations', () => {
  it('liste toutes les opérations, protégées ou non, triées', () => {
    const contrat = { paths: { '/z': { get: {} }, '/a': { post: { security: session }, get: {} } } }
    expect(operations(contrat)).toEqual(['GET /a', 'GET /z', 'POST /a'])
  })
})

describe('le contrat réellement copié', () => {
  const contrat = JSON.parse(readFileSync(new URL('../contrat/openapi.json', import.meta.url), 'utf8'))
  const routes = routesProtegees(contrat)

  it('protège GET /api/v1/me', () => {
    expect(routes).toContain('GET /api/v1/me')
  })

  it.each(['POST /api/v1/sessions', 'GET /api/healthz', 'GET /api/readyz', 'POST /api/v1/login-codes'])(
    'ne protège pas %s',
    (route) => {
      expect(routes).not.toContain(route)
    },
  )
})

describe('genere', () => {
  let racine
  beforeEach(() => {
    racine = mkdtempSync(join(tmpdir(), 'routes-'))
    mkdirSync(join(racine, 'contrat'))
    mkdirSync(join(racine, 'src/api'), { recursive: true })
    writeFileSync(join(racine, 'contrat/openapi.json'), JSON.stringify({ paths: { '/a': { get: { security: session } } } }))
  })
  afterEach(() => rmSync(racine, { recursive: true, force: true }))
  const sortie = () => readFileSync(join(racine, 'src/api/routes-protegees.ts'), 'utf8')

  it('écrit le fichier TypeScript des routes protégées', () => {
    expect(genere({ racine, verifie: false })).toBe(0)
    expect(sortie()).toBe(rendu(['GET /a']))
    expect(sortie()).toContain("'GET /a'")
  })

  it('--check rend 0 quand le fichier est à jour', () => {
    genere({ racine, verifie: false })
    expect(genere({ racine, verifie: true })).toBe(0)
  })

  it('--check rend 1 quand le fichier a une route de moins, de plus ou un caractère de plus', () => {
    genere({ racine, verifie: false })
    const original = sortie()
    for (const altere of [original.replace("  'GET /a',\n", ''), original.replace("  'GET /a',\n", "  'GET /a',\n  'GET /b',\n"), original + ' ']) {
      writeFileSync(join(racine, 'src/api/routes-protegees.ts'), altere)
      expect(genere({ racine, verifie: true })).toBe(1)
    }
  })

  it('--check rend 1 quand le fichier est absent', () => {
    expect(genere({ racine, verifie: true })).toBe(1)
  })
})
