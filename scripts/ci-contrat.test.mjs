// Garde de la structure de la CI : le déploiement de l'essai ne doit jamais partir sur un contrôle rouge.
// Lecture textuelle du YAML (pas de dépendance de plus) : on isole chaque job par son nom, et on JOUE le
// script de `resultat` tel qu'il est écrit dans le fichier.
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const lis = (nom) => readFileSync(new URL(`../.github/workflows/${nom}`, import.meta.url), 'utf8')
const ci = lis('ci.yml')
const amont = lis('contrat-amont.yml')
const quotidien = lis('contrat-quotidien.yml')

function job(nom, source = ci) {
  const debut = source.search(new RegExp(`^  ${nom}:$`, 'm'))
  expect(debut, `le job « ${nom} » existe`).toBeGreaterThanOrEqual(0)
  const suite = source.slice(debut + 1).search(/^  [a-z][a-z-]*:$/m)
  return suite < 0 ? source.slice(debut) : source.slice(debut, debut + 1 + suite)
}

const needs = (texte) => /^ {4}needs: \[([^\]]*)\]$/m.exec(texte)?.[1].split(',').map((n) => n.trim())

describe('la structure de ci.yml', () => {
  it('fait dépendre le déploiement de l’essai du seul job agrégé « resultat », et seulement après un envoi sur main', () => {
    const deploie = job('deploie-essai')
    expect(needs(deploie)).toEqual(['resultat'])
    expect(deploie).toContain("if: github.event_name == 'push' && github.ref == 'refs/heads/main'")
  })

  it('compte front, secrets et contrat dans « resultat », qui s’exécute même si l’un d’eux échoue', () => {
    const resultat = job('resultat')
    expect(needs(resultat)?.sort()).toEqual(['contrat', 'front', 'secrets'])
    expect(resultat).toMatch(/^ {4}if: always\(\)$/m)
  })

  it('exige dans « contrat » le client à jour ET la copie conforme à AMONT', () => {
    const contrat = job('contrat')
    expect(contrat).toContain('run: npm run contrat:verifie')
    expect(contrat).toContain('run: node scripts/sync-contrat.mjs --verifie')
  })

  it('laisse « contrat-amont » hors de « resultat », mais strict hors demande de fusion', () => {
    expect(needs(job('resultat'))).not.toContain('contrat-amont')
    expect(job('contrat-amont')).toContain("strict: ${{ github.event_name != 'pull_request' }}")
  })
})

describe('le workflow contrat-amont.yml', () => {
  it('ne rend l’étape d’amont tolérante que si le mode n’est pas strict', () => {
    expect(amont).toContain('continue-on-error: ${{ !inputs.strict }}')
  })

  it('vérifie la somme d’oasdiff avant d’extraire l’archive', () => {
    expect(amont.indexOf('sha256sum --check --strict')).toBeGreaterThan(0)
    expect(amont.indexOf('sha256sum --check --strict')).toBeLessThan(amont.indexOf('tar -xzf'))
  })
})

describe('le contrôle quotidien', () => {
  it('se déclenche chaque jour, à la main aussi, en mode strict', () => {
    expect(quotidien).toMatch(/schedule:\s*\n\s*- cron: "\d+ \d+ \* \* \*"/)
    expect(quotidien).toContain('workflow_dispatch:')
    expect(quotidien).toContain('strict: true')
  })
})

describe('le script du job « resultat », joué tel qu’il est écrit', () => {
  const script = /name: Tous les contrôles ont réussi\n(?:.*\n)*? {8}run: \|\n((?: {10}.*\n)+)/.exec(job('resultat'))?.[1]
    .split('\n')
    .map((ligne) => ligne.slice(10))
    .join('\n')

  const joue = (resultats) => spawnSync('bash', ['-e', '-c', script ?? 'exit 99'], { env: { PATH: process.env.PATH, RESULTATS: resultats }, encoding: 'utf8' })

  it('existe', () => {
    expect(script).toContain('RESULTATS')
  })

  it('réussit quand tout a réussi', () => {
    expect(joue('success success success').status).toBe(0)
  })

  it.each(['success failure success', 'success skipped success', 'cancelled success success'])(
    'échoue sur « %s » : un échec, un saut ou une annulation n’est pas un succès',
    (resultats) => {
      expect(joue(resultats).status).toBe(1)
    },
  )
})
