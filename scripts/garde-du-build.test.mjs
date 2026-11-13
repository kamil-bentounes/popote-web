import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const SCRIPT = fileURLToPath(new URL('./garde-du-build.sh', import.meta.url))
const SW = 'define(["./workbox-1"],function(e){"use strict";self.skipWaiting(),e.clientsClaim(),e.precacheAndRoute([],{})});'
const PROPRE = {
  'index.html': '<!doctype html><html lang="fr"><head><meta charset="utf-8"><script type="module" src="/assets/a.js"></script></head><body></body></html>',
  'sw.js': SW,
  'assets/a.js': 'console.log("ok")',
}

let dossier
beforeEach(() => (dossier = mkdtempSync(join(tmpdir(), 'garde-'))))
afterEach(() => rmSync(dossier, { recursive: true, force: true }))

function garde(surcharges = {}) {
  for (const [chemin, contenu] of Object.entries({ ...PROPRE, ...surcharges })) {
    if (contenu === null) continue
    mkdirSync(dirname(join(dossier, chemin)), { recursive: true })
    writeFileSync(join(dossier, chemin), contenu)
  }
  return spawnSync('bash', [SCRIPT, dossier], { encoding: 'utf8', env: { PATH: process.env.PATH } })
}

describe('garde-du-build.sh', () => {
  it('réussit sur un dist propre', () => {
    const resultat = garde()
    expect(resultat.stderr).toBe('')
    expect(resultat.status).toBe(0)
  })

  it.each([
    ['index.html manque', { 'index.html': null }],
    ['sw.js manque', { 'sw.js': null }],
    ['le sw.js ne s’active pas seul', { 'sw.js': 'define([],function(e){e.precacheAndRoute([])})' }],
    ['un script en ligne (verifie-build)', { 'index.html': '<html><body><script>x()</script></body></html>' }],
    ['une trace de l’ancien front', { 'assets/a.js': 'var u="https://x.supabase.co"' }],
    ['axe-core dans dist (outil de test, MPL-2.0)', { 'assets/a.js': 'var a="axe-core"' }],
  ])('échoue quand %s', (_nom, surcharges) => {
    expect(garde(surcharges).status).toBe(1)
  })
})
