import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, it } from 'vitest'
import { remplaceLAncienServiceWorker } from './verifie-sw-remplacant.mjs'

// Les deux formes que `vite-plugin-pwa` 1.3 a rendues à la construction (rejouées le 13/11/2026),
// sans la liste de précache.
const FORME_AUTO_UPDATE =
  'define(["./workbox-9c191d2f"],function(e){"use strict";self.skipWaiting(),e.clientsClaim(),' +
  'e.precacheAndRoute([],{}),e.cleanupOutdatedCaches()});'
const FORME_PROMPT =
  'define(["./workbox-2fbc6a65"],function(e){"use strict";self.addEventListener("message",e=>' +
  '{e.data&&"SKIP_WAITING"===e.data.type&&self.skipWaiting()}),e.precacheAndRoute([],{}),' +
  'e.cleanupOutdatedCaches()});'
// `prompt` avec `clientsClaim` seul : les deux mots y sont, mais jamais côte à côte.
const FORME_PROMPT_AVEC_CLAIM =
  'define(["./workbox-1"],function(e){"use strict";self.addEventListener("message",e=>' +
  '{e.data&&"SKIP_WAITING"===e.data.type&&self.skipWaiting()}),e.clientsClaim(),e.precacheAndRoute([],{})});'

describe('remplaceLAncienServiceWorker', () => {
  it('accepte la forme autoUpdate : elle s’active seule', () => {
    expect(remplaceLAncienServiceWorker(FORME_AUTO_UPDATE)).toBe(true)
  })

  it('accepte un autre nom de variable minifiée', () => {
    expect(remplaceLAncienServiceWorker(FORME_AUTO_UPDATE.replaceAll('e.', 'x.'))).toBe(true)
  })

  it('refuse la forme prompt : skipWaiting n’y est que dans un écouteur de message', () => {
    expect(FORME_PROMPT).toContain('skipWaiting')
    expect(remplaceLAncienServiceWorker(FORME_PROMPT)).toBe(false)
  })

  it('refuse prompt avec clientsClaim seul', () => {
    expect(remplaceLAncienServiceWorker(FORME_PROMPT_AVEC_CLAIM)).toBe(false)
  })

  it('refuse un service worker qui n’a que skipWaiting', () => {
    expect(remplaceLAncienServiceWorker('self.skipWaiting(),e.precacheAndRoute([])')).toBe(false)
  })

  it('refuse un contenu vide', () => {
    expect(remplaceLAncienServiceWorker('')).toBe(false)
  })
})

const COMMANDE = fileURLToPath(new URL('./verifie-sw-remplacant.mjs', import.meta.url))

describe('la commande', () => {
  const dossier = mkdtempSync(join(tmpdir(), 'sw-'))
  afterAll(() => rmSync(dossier, { recursive: true, force: true }))
  const lance = (fichier) =>
    spawnSync(process.execPath, [COMMANDE, fichier], { encoding: 'utf8' })

  it('sort 0 sur un sw.js qui remplace l’ancien', () => {
    const fichier = join(dossier, 'auto.js')
    writeFileSync(fichier, FORME_AUTO_UPDATE)
    expect(lance(fichier).status).toBe(0)
  })

  it('sort 1 et dit pourquoi sur un sw.js en forme prompt', () => {
    const fichier = join(dossier, 'prompt.js')
    writeFileSync(fichier, FORME_PROMPT)
    const resultat = lance(fichier)
    expect(resultat.status).toBe(1)
    expect(resultat.stderr).toContain('skipWaiting')
  })

  it('sort 1 quand le fichier manque', () => {
    const resultat = lance(join(dossier, 'absent.js'))
    expect(resultat.status).toBe(1)
    expect(resultat.stderr).toContain('absent.js')
  })

  it('sort 1 sans argument', () => {
    const resultat = spawnSync(process.execPath, [COMMANDE], { encoding: 'utf8' })
    expect(resultat.status).toBe(1)
  })
})

