// @vitest-environment node
/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// `main.tsx` démarre l'appli au chargement du module : on ne peut pas l'importer. L'ordre de ses lignes est ce qui compte, on lit le texte.
// Sans ses commentaires : un `reveil.demarre()` cité dans un commentaire ne démarre rien.
const source = readFileSync(resolve(process.cwd(), 'src/main.tsx'), 'utf8').replace(/\/\/.*$/gm, '')
const rang = (motif: string) => source.indexOf(motif)

describe('main.tsx', () => {
  it('démarre la machine du réveil avant de créer le routeur et avant le premier rendu', () => {
    const demarrage = rang('reveil.demarre()')
    expect(demarrage).toBeGreaterThan(-1)
    // La garde de session lance sa requête dans `router.load()`, avant que React ne monte un effet : une machine démarrée
    // plus tard (dans un `useEffect`, par exemple) la manquerait, et l'écran ne s'ouvrirait jamais sur la première requête.
    expect(demarrage).toBeLessThan(rang('creeRouteur('))
    expect(demarrage).toBeLessThan(rang('createRoot('))
  })
})
