import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { analyse, compareJetons, REMISES_ATTENDUES, verifie } from './verifie-jetons.mjs'

const SYSTEME = `/* commentaire avec --faux: 1; dedans */
@theme {
  --color-encre: #2A1A4A;   /* texte */
  --color-menthe: #2FD6A3;
  --shadow-dur: 0 7px 0 var(--color-encre);
  --trait: 3.5px;
}
`
const REMISES = REMISES_ATTENDUES.map((nom) => `  ${nom}: initial;\n`).join('')
// Notre fichier : les mêmes paires, plus les remises à zéro et les ombres dans un bloc `static inline`.
const NOTRE = `@theme static {
${REMISES}  --color-encre: #2A1A4A;
  --color-menthe: #2FD6A3;
  --trait: 3.5px;
}
@theme static inline {
  --shadow-dur: 0 7px 0 var(--color-encre);
}
`
const RACINE = SYSTEME.replace('@theme {', ':root {')

describe('analyse', () => {
  it('lit les paires de tout bloc @theme, dans l’ordre, sans les commentaires ni les remises à zéro', () => {
    const { jetons, remises, erreurs } = analyse(NOTRE)
    expect([...jetons]).toEqual([
      ['--color-encre', '#2A1A4A'],
      ['--color-menthe', '#2FD6A3'],
      ['--trait', '3.5px'],
      ['--shadow-dur', '0 7px 0 var(--color-encre)'],
    ])
    expect([...remises].sort()).toEqual([...REMISES_ATTENDUES].sort())
    expect(erreurs).toEqual([])
  })

  it('ignore une paire écrite dans un commentaire', () => {
    expect(analyse(SYSTEME).jetons.has('--faux')).toBe(false)
  })

  it('ne tient pas compte des espaces et retours à la ligne dans une valeur', () => {
    expect(analyse('@theme {\n  --a:   0   7px\n   0 red;\n}').jetons.get('--a')).toBe('0 7px 0 red')
  })

  it('lit la dernière déclaration d’un bloc même sans « ; » final', () => {
    expect(analyse('@theme { --a: 1px; --b: 2px }').jetons.get('--b')).toBe('2px')
  })

  it('lit en entier une valeur qui contient « ; » et des accolades dans une parenthèse ou une chaîne', () => {
    const { jetons } = analyse('@theme { --img: url("data:image/svg+xml;utf8,<svg>{}</svg>"); --b: 1px; }')
    expect(jetons.get('--img')).toBe('url("data:image/svg+xml;utf8,<svg>{}</svg>")')
    expect(jetons.get('--b')).toBe('1px')
  })

  it('ne lit pas un jeton déclaré hors d’un bloc @theme', () => {
    expect(analyse('.x { --color-jaune: #FFC62E; }').jetons.has('--color-jaune')).toBe(false)
  })

  it('lit aussi :root quand on le demande (la copie du système pour la page de référence)', () => {
    expect(analyse(RACINE, { racine: true }).jetons.get('--trait')).toBe('3.5px')
    expect(analyse(RACINE).jetons.has('--trait')).toBe(false)
  })

  it('signale une déclaration qui n’est pas un jeton, un bloc imbriqué et un jeton déclaré deux fois', () => {
    const { erreurs } = analyse('@theme { font-size: 99px; --a: 1px; --a: 2px; @keyframes x { from { top: 0 } } }')
    expect(erreurs.join('\n')).toMatch(/font-size/)
    expect(erreurs.join('\n')).toMatch(/--a.*deux fois/)
    expect(erreurs.join('\n')).toMatch(/imbriqué/)
  })
})

describe('compareJetons', () => {
  const a = analyse(SYSTEME).jetons
  it('ne trouve rien quand les jetons sont les mêmes', () => {
    expect(compareJetons(a, analyse(NOTRE).jetons)).toEqual({ manquants: [], differents: [], enPlus: [] })
  })
  it('signale un jeton modifié, un jeton manquant et un jeton en trop', () => {
    const copie = analyse(NOTRE.replace('#2FD6A3', '#2FD6A4').replace('  --trait: 3.5px;\n', '').replace('}\n@theme static inline', '  --inventé: 1px;\n}\n@theme static inline')).jetons
    const r = compareJetons(a, copie)
    expect(r.differents).toEqual(['--color-menthe'])
    expect(r.manquants).toEqual(['--trait'])
    expect(r.enPlus).toEqual(['--inventé'])
  })
})

describe('verifie (les fichiers)', () => {
  let racine
  const ecris = (chemin, contenu) => {
    mkdirSync(join(racine, chemin, '..'), { recursive: true })
    writeFileSync(join(racine, chemin), contenu)
  }
  const FACE = (fichier, plage = 'U+0000-00FF') => `@font-face { font-family: "Fredoka"; src: url("./polices/${fichier}") format("woff2"); font-weight: 300 700; font-display: swap; unicode-range: ${plage}; }\n`
  beforeEach(() => {
    racine = mkdtempSync(join(tmpdir(), 'jetons-'))
    ecris('.design/systeme/jetons.css', SYSTEME)
    ecris('.design/systeme/jetons-racine.css', RACINE)
    ecris('src/styles/jetons.css', NOTRE)
    ecris('.design/systeme/composants.css', FACE('a.woff2') + '.bouton { color: red; }\n')
    ecris('src/styles/polices.css', FACE('a.woff2'))
    ecris('.design/systeme/polices/a.woff2', 'wOF2-contenu')
    ecris('src/styles/polices/a.woff2', 'wOF2-contenu')
    ecris('.design/systeme/polices/LICENCE-a-OFL.txt', 'licence')
    ecris('public/licences/LICENCE-a-OFL.txt', 'licence')
  })
  afterEach(() => rmSync(racine, { recursive: true, force: true }))

  it('réussit quand tout est identique', () => {
    expect(verifie({ racine })).toEqual([])
  })

  it('échoue quand un jeton de src/ diffère du système', () => {
    ecris('src/styles/jetons.css', NOTRE.replace('#2A1A4A', '#2A1A4B'))
    expect(verifie({ racine }).join('\n')).toContain('--color-encre')
  })

  it('échoue quand un jeton du système manque dans src/', () => {
    ecris('src/styles/jetons.css', NOTRE.replace('  --trait: 3.5px;\n', ''))
    expect(verifie({ racine }).join('\n')).toMatch(/manque.*--trait/)
  })

  it('échoue quand un jeton du système est déplacé hors de @theme (l’utilitaire disparaîtrait)', () => {
    ecris('src/styles/jetons.css', NOTRE.replace('  --color-menthe: #2FD6A3;\n', '') + '.x { --color-menthe: #2FD6A3; }\n')
    expect(verifie({ racine }).join('\n')).toMatch(/manque.*--color-menthe/)
  })

  it('échoue quand src/ a un jeton que le système n’a pas (tout passe par le système)', () => {
    ecris('src/styles/jetons.css', NOTRE.replace('--trait: 3.5px;', '--trait: 3.5px;\n  --color-rouge: #f00;'))
    expect(verifie({ racine }).join('\n')).toMatch(/--color-rouge est en plus/)
  })

  it('échoue quand une remise à zéro des défauts de Tailwind manque', () => {
    ecris('src/styles/jetons.css', NOTRE.replace('  --blur-*: initial;\n', ''))
    expect(verifie({ racine }).join('\n')).toMatch(/--blur-\*: initial/)
  })

  it('échoue sur une déclaration qui n’est pas un jeton dans @theme', () => {
    ecris('src/styles/jetons.css', NOTRE.replace('--trait: 3.5px;', '--trait: 3.5px;\n  font-size: 99px;'))
    expect(verifie({ racine }).join('\n')).toMatch(/font-size/)
  })

  it('signale la dérive de jetons-racine.css, copie faite à la main', () => {
    ecris('.design/systeme/jetons-racine.css', RACINE.replace('#2FD6A3', '#000000'))
    expect(verifie({ racine }).join('\n')).toMatch(/jetons-racine.*--color-menthe/)
  })

  it('échoue quand un fichier manque', () => {
    rmSync(join(racine, 'src/styles/jetons.css'))
    expect(verifie({ racine }).join('\n')).toMatch(/src\/styles\/jetons.css/)
  })

  it('échoue quand un woff2 diffère de celui du système', () => {
    ecris('src/styles/polices/a.woff2', 'autre contenu')
    expect(verifie({ racine }).join('\n')).toMatch(/a\.woff2/)
  })

  it('échoue quand un woff2 du système manque dans src/', () => {
    rmSync(join(racine, 'src/styles/polices/a.woff2'))
    expect(verifie({ racine }).join('\n')).toMatch(/a\.woff2/)
  })

  it('échoue quand une licence OFL diffère ou manque dans public/', () => {
    ecris('public/licences/LICENCE-a-OFL.txt', 'licence modifiée')
    expect(verifie({ racine }).join('\n')).toMatch(/LICENCE-a-OFL/)
    rmSync(join(racine, 'public/licences/LICENCE-a-OFL.txt'))
    expect(verifie({ racine }).join('\n')).toMatch(/LICENCE-a-OFL/)
  })

  it('échoue quand un @font-face de polices.css s’écarte de celui de composants.css (plage, graisse, fichier)', () => {
    ecris('src/styles/polices.css', FACE('a.woff2', 'U+0000-007F'))
    expect(verifie({ racine }).join('\n')).toMatch(/@font-face/)
    ecris('src/styles/polices.css', FACE('a.woff2') + FACE('b.woff2'))
    expect(verifie({ racine }).join('\n')).toMatch(/@font-face/)
  })
})
