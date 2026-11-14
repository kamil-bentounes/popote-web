import { describe, expect, it } from 'vitest'
import { nouvelleCle } from './idempotence'

describe('nouvelleCle', () => {
  it('rend une chaîne RFC 9651 : l’identifiant entre guillemets', () => {
    expect(nouvelleCle(() => 'abc')).toBe('"abc"')
  })

  it('rend une clé neuve à chaque appel, de la forme que le contrat accepte (3 à 512 caractères)', () => {
    const [a, b] = [nouvelleCle(), nouvelleCle()]
    expect(a).not.toBe(b)
    expect(a).toMatch(/^"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"$/)
  })
})
