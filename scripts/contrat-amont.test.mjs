// Ces essais jouent le vrai binaire `oasdiff` (figé en CI, version et somme dans `contrat-amont.yml`).
// Hors de ce job ils sont ignorés : `OASDIFF=/chemin/vers/oasdiff npx vitest run scripts/contrat-amont`.
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const SCRIPT = fileURLToPath(new URL('./contrat-amont.sh', import.meta.url))
const OASDIFF = process.env.OASDIFF

const route = (summary = 'x') => ({ get: { summary, responses: { 200: { description: 'ok' } } } })
const contrat = (chemins) => JSON.stringify({ openapi: '3.1.0', info: { title: 'Popote', version: '1' }, paths: chemins }, null, 2) + '\n'

describe.skipIf(!OASDIFF)('contrat-amont.sh (oasdiff)', () => {
  let dossier
  beforeEach(() => {
    dossier = mkdtempSync(join(tmpdir(), 'amont-'))
    mkdirSync(join(dossier, 'contrat'))
    writeFileSync(join(dossier, 'contrat/openapi.json'), contrat({ '/api/a': route(), '/api/b': route() }))
  })
  afterEach(() => rmSync(dossier, { recursive: true, force: true }))

  function lance(amont, plus = {}) {
    const fichier = join(dossier, 'amont.json')
    if (amont !== undefined) writeFileSync(fichier, amont)
    const resume = join(dossier, 'resume.md')
    const resultat = spawnSync('bash', [SCRIPT], {
      cwd: dossier,
      encoding: 'utf8',
      env: { PATH: process.env.PATH, OASDIFF, CONTRAT_AMONT_FICHIER: fichier, GITHUB_STEP_SUMMARY: resume, ...plus },
    })
    let texteResume = ''
    try {
      texteResume = readFileSync(resume, 'utf8')
    } catch {
      // pas de résumé écrit
    }
    return { ...resultat, resume: texteResume }
  }

  it('échoue quand l’amont a retiré une route que le front connaît', () => {
    const resultat = lance(contrat({ '/api/a': route() }))
    expect(resultat.status).toBe(1)
    expect(resultat.stdout + resultat.stderr).toContain('/api/b')
  })

  it('réussit quand l’amont a ajouté une route, et la dit dans le résumé du job', () => {
    const resultat = lance(contrat({ '/api/a': route(), '/api/b': route(), '/api/c': route() }))
    expect(resultat.status).toBe(0)
    expect(resultat.resume).toContain('/api/c')
  })

  it('réussit quand l’amont est identique', () => {
    expect(lance(contrat({ '/api/a': route(), '/api/b': route() })).status).toBe(0)
  })

  it('échoue quand l’amont a retiré une route DÉPRÉCIÉE : oasdiff l’admet, le front non', () => {
    writeFileSync(
      join(dossier, 'contrat/openapi.json'),
      contrat({ '/api/a': route(), '/api/b': { get: { ...route().get, deprecated: true } } }),
    )
    const resultat = lance(contrat({ '/api/a': route() }))
    expect(resultat.status).toBe(1)
    expect(resultat.stdout + resultat.stderr).toContain('GET /api/b')
  })

  it('échoue quand l’amont change la protection d’une route', () => {
    const protegee = { get: { ...route().get, security: [{ session: [] }] } }
    writeFileSync(join(dossier, 'contrat/openapi.json'), contrat({ '/api/a': protegee }))
    const resultat = lance(contrat({ '/api/a': route() }))
    expect(resultat.status).toBe(1)
    expect(resultat.stdout + resultat.stderr).toContain('GET /api/a')
  })

  it('rend 2, et non 1, quand le fichier d’amont est absent : rien n’a pu être comparé, jamais vert par défaut', () => {
    const resultat = lance(undefined, { CONTRAT_AMONT_FICHIER: join(dossier, 'absent.json') })
    expect(resultat.status).toBe(2)
    expect(resultat.stderr).toMatch(/amont/)
  })

  it('rend 2 quand le binaire oasdiff est introuvable', () => {
    const resultat = lance(contrat({}), { OASDIFF: join(dossier, 'inexistant') })
    expect(resultat.status).toBe(2)
  })
})
