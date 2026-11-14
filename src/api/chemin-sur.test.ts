import { describe, expect, it } from 'vitest'
import { cheminSur } from './chemin-sur'

describe('cheminSur : ce qui est un chemin de cette origine', () => {
  it.each(['/budget', '/', '/accueil?mois=11', '/a/b/c?x=1&y=2#ancre', '/a/../b', '/a/./b', '/accueil?next=/.//x', '/frigo/pâtes', '/a:b', `/${'a'.repeat(199)}`])(
    'accepte %s tel quel',
    (valeur) => {
      expect(cheminSur(valeur)).toBe(valeur)
    },
  )

  it.each([
    ['deux barres (adresse sans schéma)', '//evil.fr'],
    ['barre puis contre-barre', '/\\evil.fr'],
    ['contre-barre plus loin', '/a\\b'],
    ['adresse absolue', 'https://evil.fr'],
    ['adresse absolue sans schéma', 'evil.fr/x'],
    ['schéma javascript', 'javascript:alert(1)'],
    ['schéma data', 'data:text/html,x'],
    ['chemin relatif', 'budget'],
    ['deux barres encodées', '/%2F%2Fevil.fr'],
    ['deux barres encodées en minuscules', '/%2f%2fevil.fr'],
    ['barre puis contre-barre encodée', '/%5Cevil.fr'],
    ['segment point qui se normalise en //', '/.//evil.fr'],
    ['segment point-point qui se normalise en //', '/..//evil.fr'],
    ['segments qui se normalisent en //', '/a/..//evil.fr'],
    ['point encodé qui se normalise en //', '/%2e//evil.fr'],
    ['segments encodés qui se normalisent en //', '/%2E/%2Fevil.fr'],
    ['saut de ligne', '/a\nb'],
    ['tabulation (le navigateur la retire : « /\\t/x » deviendrait « //x »)', '/\t/evil.fr'],
    ['retour chariot encodé', '/a%0Db'],
    ['caractère nul', '/a\u0000b'],
    ['suppression (DEL)', '/a\u007Fb'],
    ['pourcentage mal formé', '/a%E0%A4%A'],
    ['espace en tête', ' /budget'],
    ['201 caractères', `/${'a'.repeat(200)}`],
    ['chaîne vide', ''],
  ])('refuse %s', (_cas, valeur) => {
    expect(cheminSur(valeur)).toBeUndefined()
  })

  it.each([[undefined], [null], [42], [{ toString: () => '/budget' }], [['/budget']], [true]])('refuse ce qui n’est pas une chaîne : %o', (valeur) => {
    expect(cheminSur(valeur)).toBeUndefined()
  })
})
