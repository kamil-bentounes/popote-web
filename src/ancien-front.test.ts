import { describe, expect, it } from 'vitest'
import { nettoieAncienFront } from './ancien-front'

/** Un stockage en mémoire qui a la forme minimale que la fonction exige. */
function stockage(valeurs: Record<string, string>) {
  const donnees = new Map(Object.entries(valeurs))
  return {
    donnees,
    get length() {
      return donnees.size
    },
    key: (index: number) => [...donnees.keys()][index] ?? null,
    removeItem: (cle: string) => void donnees.delete(cle),
  }
}

describe('nettoieAncienFront', () => {
  it('efface les jetons de session que l’ancien front avait posés', () => {
    const s = stockage({
      'sb-abcd-auth-token': 'x',
      'sb-efgh-auth-token-code-verifier': 'y',
      'sb-abcd-auth-token-user': 'z',
    })
    nettoieAncienFront(s)
    expect([...s.donnees.keys()]).toEqual([])
  })

  it('ne touche à rien d’autre', () => {
    const s = stockage({ 'sb-abcd-auth-token': 'x', autre: '1', 'popote.theme': 'sombre' })
    nettoieAncienFront(s)
    expect([...s.donnees.keys()].sort()).toEqual(['autre', 'popote.theme'])
  })

  it('garde une clé qui contient « sb- » sans en avoir le préfixe', () => {
    const s = stockage({ 'mon-sb-cle': '1', 'sbx-cle': '2' })
    nettoieAncienFront(s)
    expect([...s.donnees.keys()].sort()).toEqual(['mon-sb-cle', 'sbx-cle'])
  })

  it('est idempotent', () => {
    const s = stockage({ 'sb-abcd-auth-token': 'x', autre: '1' })
    nettoieAncienFront(s)
    nettoieAncienFront(s)
    expect([...s.donnees.keys()]).toEqual(['autre'])
  })

  it('ne lève pas quand le stockage refuse la suppression', () => {
    const s = {
      length: 1,
      key: () => 'sb-abcd-auth-token',
      removeItem: () => {
        throw new DOMException('refusé', 'SecurityError')
      },
    }
    expect(() => nettoieAncienFront(s)).not.toThrow()
  })

  it('ne lève pas quand le stockage refuse la lecture', () => {
    const s = {
      get length(): number {
        throw new DOMException('refusé', 'SecurityError')
      },
      key: () => null,
      removeItem: () => undefined,
    }
    expect(() => nettoieAncienFront(s)).not.toThrow()
  })

  it('efface toutes les clés visées même si l’une d’elles résiste', () => {
    const s = stockage({ 'sb-a-auth-token': '1', 'sb-b-auth-token': '2' })
    const efface = s.removeItem
    s.removeItem = (cle: string) => {
      if (cle === 'sb-a-auth-token') throw new DOMException('refusé', 'SecurityError')
      efface(cle)
    }
    nettoieAncienFront(s)
    expect([...s.donnees.keys()]).toEqual(['sb-a-auth-token'])
  })
})
