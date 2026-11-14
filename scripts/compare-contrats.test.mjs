import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { compare } from './compare-contrats.mjs'

const session = [{ session: [] }]
const op = (plus = {}) => ({ responses: { 200: { description: 'ok' } }, ...plus })
const contrat = (paths, plus = {}) => ({ openapi: '3.1.0', paths, ...plus })

describe('compare : ce qu’oasdiff laisse passer et que le front ne peut pas laisser passer', () => {
  it('ne signale rien quand les contrats ont les mêmes opérations et la même protection', () => {
    const c = contrat({ '/a': { get: op({ security: session }) }, '/b': { post: op() } })
    expect(compare(c, structuredClone(c))).toEqual({ retirees: [], protectionChangee: [] })
  })

  it('ne signale pas un ajout', () => {
    const base = contrat({ '/a': { get: op() } })
    const amont = contrat({ '/a': { get: op() }, '/b': { get: op() } })
    expect(compare(base, amont).retirees).toEqual([])
  })

  it('signale une opération retirée', () => {
    const base = contrat({ '/a': { get: op() }, '/b': { get: op() } })
    expect(compare(base, contrat({ '/a': { get: op() } })).retirees).toEqual(['GET /b'])
  })

  it('signale une méthode retirée alors que le chemin reste', () => {
    const base = contrat({ '/a': { get: op(), delete: op() } })
    expect(compare(base, contrat({ '/a': { get: op() } })).retirees).toEqual(['DELETE /a'])
  })

  it('signale une opération retirée même si elle était dépréciée, avec ou sans date de fin (oasdiff l’admet)', () => {
    const base = contrat({
      '/a': { get: op({ deprecated: true }) },
      '/b': { get: op({ deprecated: true, 'x-sunset': '2020-01-01' }) },
      '/c': { get: op() },
    })
    expect(compare(base, contrat({ '/c': { get: op() } })).retirees).toEqual(['GET /a', 'GET /b'])
  })

  it('signale une route qui devient publique et une route qui devient protégée (la liste des routes protégées serait périmée)', () => {
    const base = contrat({ '/a': { get: op({ security: session }) }, '/b': { get: op() } })
    const amont = contrat({ '/a': { get: op() }, '/b': { get: op({ security: session }) } })
    expect(compare(base, amont).protectionChangee).toEqual(['GET /a', 'GET /b'])
  })

  it('ne compte pas comme changement de protection une opération retirée ou ajoutée', () => {
    const base = contrat({ '/a': { get: op({ security: session }) } })
    const amont = contrat({ '/b': { get: op({ security: session }) } })
    expect(compare(base, amont)).toEqual({ retirees: ['GET /a'], protectionChangee: [] })
  })
})

describe('la commande', () => {
  let dossier
  beforeEach(() => (dossier = mkdtempSync(join(tmpdir(), 'compare-'))))
  afterEach(() => rmSync(dossier, { recursive: true, force: true }))
  const SCRIPT = fileURLToPath(new URL('./compare-contrats.mjs', import.meta.url))

  function lance(base, amont) {
    writeFileSync(join(dossier, 'base.json'), JSON.stringify(base))
    writeFileSync(join(dossier, 'amont.json'), JSON.stringify(amont))
    return spawnSync(process.execPath, [SCRIPT, join(dossier, 'base.json'), join(dossier, 'amont.json')], { encoding: 'utf8' })
  }

  it('rend 0 quand rien n’a été retiré ni changé de protection', () => {
    const c = contrat({ '/a': { get: op() } })
    expect(lance(c, c).status).toBe(0)
  })

  it('rend 1 et nomme l’opération retirée', () => {
    const resultat = lance(contrat({ '/a': { get: op({ deprecated: true }) } }), contrat({}))
    expect(resultat.status).toBe(1)
    expect(resultat.stdout + resultat.stderr).toContain('GET /a')
  })

  it('rend 1 sur un fichier illisible ou sans argument', () => {
    expect(spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8' }).status).toBe(1)
    expect(spawnSync(process.execPath, [SCRIPT, '/nulle/part.json', '/nulle/part.json'], { encoding: 'utf8' }).status).toBe(1)
  })
})
