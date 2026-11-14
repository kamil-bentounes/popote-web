// @vitest-environment node
/// <reference types="node" />
// Structure du CSS porté : ce que la couche, la base et le mouvement réduit doivent garantir, lu avec un vrai
// analyseur (postcss). Vitest ne traite pas le CSS : on lit les fichiers.
import { compile } from '@tailwindcss/node'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import postcss, { type AtRule, type Root } from 'postcss'
import { describe, expect, it } from 'vitest'

const lis = (nom: string) => readFileSync(resolve(process.cwd(), 'src/styles', nom), 'utf8')
// Les expressions régulières lisent le CSS SANS ses commentaires : une règle laissée dans un commentaire n'en est pas une.
const lisSansCommentaires = (nom: string) => lis(nom).replace(/\/\*[\s\S]*?\*\//g, '')
const composants = postcss.parse(lis('composants.css'))
const base = postcss.parse(lis('base.css'))

const estCouche = (noeud: { type: string }, nom: string): noeud is AtRule => noeud.type === 'atrule' && (noeud as AtRule).name === 'layer' && (noeud as AtRule).params === nom
const estKeyframes = (noeud: { type: string }): boolean => noeud.type === 'atrule' && (noeud as AtRule).name === 'keyframes'
const regles = (racine: Root) => {
  const selecteurs: string[] = []
  racine.walkRules((regle) => void selecteurs.push(regle.selector))
  return selecteurs
}

describe('composants.css', () => {
  it('ne garde aucun sélecteur `.jeu *` (le preflight de Tailwind pose déjà box-sizing)', () => {
    expect(regles(composants).filter((s) => s.includes('.jeu'))).toEqual([])
  })

  it('met toutes les règles dans `@layer components` : hors couche, seuls les @keyframes (et les commentaires) restent', () => {
    const horsCouche = composants.nodes.filter((n) => n.type !== 'comment' && !estCouche(n, 'components') && !estKeyframes(n))
    expect(horsCouche.map((n) => n.toString().slice(0, 60))).toEqual([])
  })

  it('garde ses @keyframes hors de la couche (une animation se nomme au niveau 0)', () => {
    const couche = composants.nodes.find((n): n is AtRule => estCouche(n, 'components'))
    let dedans = 0
    couche?.walkAtRules('keyframes', () => void (dedans += 1))
    let dehors = 0
    for (const n of composants.nodes) if (estKeyframes(n)) dehors += 1
    expect({ dedans, dehors: dehors > 0 }).toEqual({ dedans: 0, dehors: true })
  })

  it('ne redéclare aucun @font-face : ils sont dans polices.css', () => {
    let faces = 0
    composants.walkAtRules('font-face', () => void (faces += 1))
    expect(faces).toBe(0)
  })

  it('n’écrit aucune couleur en dur : tout vient des jetons', () => {
    const enDur: string[] = []
    composants.walkDecls((decl) => {
      if (/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/.test(decl.value)) enDur.push(`${decl.prop}: ${decl.value}`)
    })
    expect(enDur).toEqual([])
  })

  const ECHAPPE = (texte: string) => texte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const AVEC_ANNEAU = ['.bouton:focus-visible', '.champ input:focus-visible', '.lien:focus-visible', '.cases:focus-within', '.avatar:focus-visible']

  it.each(AVEC_ANNEAU)('donne l’anneau d’encre de 4 px à %s (le même que partout : 3:1 sur tous nos fonds)', (selecteur) => {
    const trouvees: string[] = []
    composants.walkRules((r) => {
      if (r.selectors.includes(selecteur)) trouvees.push(r.toString())
    })
    expect(trouvees.join('\n')).toMatch(/outline:\s*4px solid var\(--color-encre\)/)
  })

  it.each(AVEC_ANNEAU)('cerne %s de jaune : une ombre de 11 px', (selecteur) => {
    expect(lis('composants.css')).toMatch(new RegExp(`${ECHAPPE(selecteur)}\\s*\\{[^}]*0 0 0 11px var\\(--color-jaune\\)`))
  })

  it('garde le halo jaune du bouton en pause : sa règle (0,3,0) bat celle du focus (0,2,0), qui le lui poserait', () => {
    const selecteur = '.bouton[aria-disabled="true"]:not([aria-busy="true"]):focus-visible'
    expect(lis('composants.css')).toMatch(new RegExp(`${ECHAPPE(selecteur)}\\s*\\{[^}]*0 0 0 11px var\\(--color-jaune\\)`))
  })

  it('coupe, sous prefers-reduced-motion, chaque mouvement continu : soleil, jauge, tremblement des cases, marmite', () => {
    const coupes: string[] = []
    composants.walkAtRules('media', (media) => {
      if (/prefers-reduced-motion:\s*reduce/.test(media.params)) media.walkRules((r) => void coupes.push(...r.selectors))
    })
    const attendus = ['.soleil', '.jauge > i', '.cases[data-etat="faux"]', '.marmite svg', '.marmite .yeux', '.feuille']
    expect(attendus.filter((attendu) => !coupes.includes(attendu))).toEqual([])
  })

  it('les sept états de la marmite existent', () => {
    const texte = lis('composants.css')
    for (const etat of ['sommeil', 'ecoute', 'reflexion', 'parole', 'joie', 'inquiet']) expect(texte).toContain(`[data-etat="${etat}"]`)
  })
})

// Le portage est le CSS du système, aux écarts près. On aplatit les deux fichiers (couche transparente, commentaires ignorés) en
// une liste de règles normalisées, et on compare règle à règle, dans l'ordre : une règle perdue, modifiée ou déplacée échoue.
function aplatis(racine: Root): string[] {
  const lignes: string[] = []
  const normalise = (texte: string) => texte.replace(/\s+/g, ' ').trim()
  const declarations = (noeud: { nodes?: Array<{ type: string; prop?: string; value?: string; important?: boolean }> }) =>
    (noeud.nodes ?? []).flatMap((n) => (n.type === 'decl' ? [`${n.prop}: ${normalise(n.value ?? '')}${n.important ? ' !important' : ''}`] : [])).join('; ')
  const visite = (noeud: Root | AtRule, contexte: string) => {
    for (const enfant of noeud.nodes ?? []) {
      if (enfant.type === 'rule') lignes.push(`${contexte}${normalise(enfant.selector)} { ${declarations(enfant)} }`)
      else if (enfant.type === 'atrule') {
        const nom = enfant.name
        if (nom === 'layer') visite(enfant, contexte)
        else if (nom === 'media') visite(enfant, `${contexte}@media ${normalise(enfant.params)} :: `)
        else if (nom === 'keyframes') lignes.push(`@keyframes ${enfant.params} { ${(enfant.nodes ?? []).map((k) => (k.type === 'rule' ? `${normalise(k.selector)} { ${declarations(k)} }` : '')).join(' ')} }`)
        else if (nom === 'font-face') lignes.push(`@font-face { ${declarations(enfant)} }`)
      }
    }
  }
  visite(racine, '')
  return lignes
}

describe('composants.css est le CSS du système, aux écarts près', () => {
  const systeme = aplatis(postcss.parse(readFileSync(resolve(process.cwd(), '.design/systeme/composants.css'), 'utf8')))
  const notre = aplatis(composants)

  // Les écarts, tous marqués « écart au système » dans composants.css. Chacun est exact : un écart périmé échoue.
  const RETRAITS = [
    ...systeme.filter((l) => l.startsWith('@font-face')), // dans polices.css
    '.jeu { background: var(--color-creme); color: var(--color-encre); font-family: var(--font-texte); font-weight: 700; font-size: var(--text-texte); line-height: 1.35 }', // devient html et body (base.css) : la taille sur body, pas sur html, pour que `rem` reste 16 px
    '.jeu *, .jeu *::before, .jeu *::after { box-sizing: border-box }', // doublon du preflight
    // L'entrée d'écran passe par Motion (`Enter`, `mouvement.ts`) : la règle CSS et ses images clés n'existent plus (D11 : pas d'animation en double).
    '.entre { animation: entre var(--duree-entree) var(--ease-rebond) both; animation-delay: calc(var(--rang, 0) * var(--decalage-entree)) }',
    '@keyframes entre { from { opacity: 0; transform: translateY(36px) scale(0.92) } to { opacity: 1; transform: none } }',
    // L'arrivée du tampon passe par Motion aussi (`Stamp`, `variantesTampon`) : ses images clés n'existent plus.
    '@keyframes tampon { from { transform: rotate(-40deg) scale(0) } to { transform: rotate(8deg) scale(1) } }',
  ]
  const AJOUTS = [
    '.cases:focus-within, .avatar:focus-visible { outline: 4px solid var(--color-encre); outline-offset: 3px }',
    '.cases:focus-within { border-radius: var(--radius-champ); box-shadow: 0 0 0 11px var(--color-jaune) }',
    '.avatar:focus-visible { box-shadow: var(--shadow-dur-petit), 0 0 0 11px var(--color-jaune) }',
    '.avatar--libre:focus-visible { box-shadow: 0 0 0 11px var(--color-jaune) }',
    // `pause` (F9, le compte à rebours de F20) : le système n'a que `:disabled`, qui retire le bouton du clavier. Un bouton
    // `aria-disabled` reste focalisable et prend l'aspect du désactivé ; occupé (`aria-busy`) garde le sien, avec son rond.
    '.bouton[aria-disabled="true"]:not([aria-busy="true"]) { background: var(--color-lilas-pale); color: var(--color-gris); box-shadow: var(--shadow-enfonce); transform: translateY(var(--enfoncement)); cursor: not-allowed }',
    '.bouton[aria-disabled="true"]:not([aria-busy="true"]):focus-visible { box-shadow: var(--shadow-enfonce), 0 0 0 11px var(--color-jaune) }', // la règle précédente (0,3,0) battrait l'anneau de `.bouton:focus-visible`
    // La marmite (F17) : le système colore son SVG par `style="…"`, que la CSP refuse ; le dessin pose des classes qui lisent les mêmes jetons.
    '.marmite .m-trait-encre { stroke: var(--color-encre) }',
    '.marmite .m-trait-gris { stroke: var(--color-gris) }',
    '.marmite .m-trait-papier { stroke: var(--color-papier) }',
    '.marmite .m-fond-encre { fill: var(--color-encre) }',
    '.marmite .m-fond-tomate { fill: var(--color-tomate) }',
    '.marmite .m-fond-papier { fill: var(--color-papier) }',
    '.marmite .m-fond-rose { fill: var(--color-rose) }',
    '.marmite .m-fond-jaune { fill: var(--color-jaune) }',
    '.marmite .m-fond-ciel { fill: var(--color-ciel) }',
    '.marmite .zzz { font-family: var(--font-titre) }',
  ]
  // [avant, après] : lignes du système modifiées. `pulse` se nomme `pulse-ondes` : Tailwind a son propre @keyframes `pulse`, qui
  // écrase le nôtre au build ; la transition de la marmite et des boutons est coupée `!important` pour qu'un utilitaire ne la rende pas.
  const MODIFICATIONS: Array<[string, string]> = [
    ['@keyframes pulse { from { opacity: 0.45 } to { opacity: 1 } }', '@keyframes pulse-ondes { from { opacity: 0.45 } to { opacity: 1 } }'],
    ['.marmite[data-etat="ecoute"] .ondes { opacity: 1; animation: pulse 0.7s ease-in-out infinite alternate }', '.marmite[data-etat="ecoute"] .ondes { opacity: 1; animation: pulse-ondes 0.7s ease-in-out infinite alternate }'],
    // Le libellé du champ est un vrai `<label for>` (F9) : le `<label>` n'enveloppe plus le champ ni son aide : le nom du champ est son libellé seul (revue 11).
    ['.champ > span { display: block; margin: 0 0 6px 4px; font-size: var(--text-libelle) }', '.champ > label { display: block; margin: 0 0 6px 4px; font-size: var(--text-libelle) }'],
    // `.tampon` n'a plus d'animation CSS (voir RETRAITS) : son mouvement réduit est celui de `variantesTampon`. Son inclinaison de repos (8 degrés) reste.
    ['.tampon { display: inline-block; padding: 5px 12px; border: var(--trait) solid var(--color-encre); border-radius: var(--radius-tampon); background: var(--color-tomate); color: var(--color-encre); font-family: var(--font-titre); font-size: var(--text-tampon); transform: rotate(8deg); animation: tampon var(--duree-entree) var(--ease-rebond) both }', '.tampon { display: inline-block; padding: 5px 12px; border: var(--trait) solid var(--color-encre); border-radius: var(--radius-tampon); background: var(--color-tomate); color: var(--color-encre); font-family: var(--font-titre); font-size: var(--text-tampon); transform: rotate(8deg) }'],
    // `.entre` n'existe plus, ni l'animation de `.tampon` (voir RETRAITS) : le mouvement réduit de l'entrée et du tampon est la politique de `mouvement.ts`.
    ['@media (prefers-reduced-motion: reduce) :: .entre, .tampon, .feuille, .suivi div[data-fait] i::after { animation-duration: 1ms !important; animation-delay: 0ms !important }', '@media (prefers-reduced-motion: reduce) :: .feuille, .suivi div[data-fait] i::after { animation-duration: 1ms !important; animation-delay: 0ms !important }'],
    ['@media (prefers-reduced-motion: reduce) :: .bouton, .jauge > i { transition: none }', '@media (prefers-reduced-motion: reduce) :: .bouton, .jauge > i { transition: none !important }'],
  ]

  const estAnimation = (ligne: string) => ligne.startsWith('@keyframes ')
  const transforme = (lignes: string[]) => lignes.filter((l) => !RETRAITS.includes(l)).map((l) => MODIFICATIONS.find(([avant]) => avant === l)?.[1] ?? l)

  it('garde les règles du système, dans le même ordre, aux écarts nommés près', () => {
    const attendu = transforme(systeme).filter((l) => !estAnimation(l))
    const sansAjouts = notre.filter((l) => !AJOUTS.includes(l) && !estAnimation(l))
    expect(sansAjouts).toEqual(attendu)
  })

  it('garde les @keyframes du système, au contenu près : ils sortent de la couche, donc d’ordre libre', () => {
    const attendu = transforme(systeme).filter(estAnimation).sort()
    expect(notre.filter(estAnimation).sort()).toEqual(attendu)
  })

  it('chaque écart de la liste existe vraiment (aucun écart périmé)', () => {
    for (const retrait of RETRAITS) expect(systeme).toContain(retrait)
    for (const [avant, apres] of MODIFICATIONS) {
      expect(systeme).toContain(avant)
      expect(notre).toContain(apres)
    }
    for (const ajout of AJOUTS) expect(notre).toContain(ajout)
  })
})

describe('les @keyframes du build', () => {
  it('sont uniques et ceux de composants.css : aucun nom de Tailwind (`pulse`, `spin`, `ping`, `bounce`) n’en écrase un', async () => {
    const base = resolve(process.cwd(), 'src/styles')
    const compilateur = await compile(lis('index.css'), { base, onDependency: () => undefined })
    const compile_ = postcss.parse(compilateur.build([]))
    const vus = new Map<string, string[]>()
    compile_.walkAtRules('keyframes', (k) => {
      const corps = (k.nodes ?? []).map((n) => n.toString().replace(/\s+/g, ' ')).join(' ')
      vus.set(k.params, [...(vus.get(k.params) ?? []), corps])
    })
    const doublons = [...vus].filter(([, versions]) => versions.length > 1).map(([nom]) => nom)
    expect(doublons).toEqual([])
    const nos: string[] = []
    composants.walkAtRules('keyframes', (k) => void nos.push(k.params))
    expect(nos.filter((nom) => !vus.has(nom))).toEqual([])
    for (const nom of ['pulse', 'spin', 'ping', 'bounce']) expect(nos).not.toContain(nom)
  })

  it('le preflight de Tailwind ferme `[hidden]` malgré le `display` des composants', async () => {
    const base = resolve(process.cwd(), 'src/styles')
    const compilateur = await compile(lis('index.css'), { base, onDependency: () => undefined })
    expect(compilateur.build([])).toMatch(/\[hidden\]:where\(:not\(\[hidden="?until-found"?\]\)\)\s*\{\s*display:\s*none\s*!important/)
  })
})

describe('base.css', () => {
  it('range toutes ses règles dans `@layer base`', () => {
    const hors = base.nodes.filter((n) => n.type !== 'comment' && !estCouche(n, 'base'))
    expect(hors.map((n) => n.toString().slice(0, 60))).toEqual([])
  })

  it('pose sur html le fond crème, l’encre et la police du texte, et sur body la taille du texte (ce qu’était `.jeu`)', () => {
    const texte = lisSansCommentaires('base.css')
    expect(texte).toMatch(/html\s*\{[^}]*background:\s*var\(--color-creme\)/)
    expect(texte).toMatch(/html\s*\{[^}]*color-scheme:\s*light/)
    expect(texte).toMatch(/html\s*\{[^}]*-webkit-text-size-adjust:\s*100%/)
    expect(texte).toMatch(/html\s*\{[^}]*font-family:\s*var\(--font-texte\)/)
    expect(texte).toMatch(/(?:^|\n)\s*body\s*\{[^}]*font-size:\s*var\(--text-texte\)/)
  })

  it('ne donne aucune taille de police à la racine : `rem` reste 16 px, comme dans le système, où `.jeu` n’est pas `html`', () => {
    const racines: string[] = []
    for (const nom of ['base.css', 'composants.css', 'jetons.css', 'polices.css', 'index.css']) {
      postcss.parse(lis(nom)).walkRules((regle) => {
        const vise = regle.selectors.some((s) => /^(?:html|:root)(?![\w-])/.test(s.trim()))
        if (!vise) return
        regle.walkDecls(/^font(?:-size)?$/, (decl) => void racines.push(`${nom} ${regle.selector} { ${decl.prop}: ${decl.value} }`))
      })
    }
    expect(racines).toEqual([])
  })

  it('pose sur body la hauteur et la zone sûre des téléphones', () => {
    const texte = lisSansCommentaires('base.css')
    expect(texte).toMatch(/body\s*\{[^}]*min-height:\s*100dvh/)
    for (const cote of ['top', 'right', 'bottom', 'left']) expect(texte).toContain(`env(safe-area-inset-${cote})`)
  })

  it('offre `.sr-seul`, qui masque sans retirer du lecteur d’écran', () => {
    const texte = lisSansCommentaires('base.css')
    expect(texte).toMatch(/\.sr-seul\s*\{[^}]*position:\s*absolute[^}]*width:\s*1px[^}]*overflow:\s*hidden/)
  })

  it('ne redouble pas `[hidden]` : le preflight de Tailwind le pose déjà (et respecte `hidden=until-found`)', () => {
    expect(lisSansCommentaires('base.css')).not.toContain('[hidden]')
  })

  it('met le lien d’évitement au-dessus de tout élément positionné (un soleil de 700 px le cacherait), sans rogner son halo', () => {
    const texte = lisSansCommentaires('base.css')
    expect(texte).toMatch(/\.evitement\s*\{[^}]*z-index:\s*(?:[1-9]\d{2,})/)
    expect(texte).toMatch(/\.evitement:focus-visible\s*\{[^}]*top:\s*1rem/)
    expect(texte).toMatch(/\.evitement:focus-visible\s*\{[^}]*outline:\s*4px solid var\(--color-encre\)/)
  })

  it('ôte l’anneau d’un conteneur focalisé par programme : un conteneur n’est pas un contrôle', () => {
    expect(lisSansCommentaires('base.css')).toMatch(/main\[tabindex="-1"\]:focus\s*\{\s*outline:\s*none/)
  })

  it('ne redouble pas le mouvement réduit du système', () => {
    expect(lis('base.css')).not.toContain('prefers-reduced-motion')
  })
})

describe('index.css compilé par Tailwind', () => {
  const base = resolve(process.cwd(), 'src/styles')
  it('range les composants SOUS les utilitaires : `bouton p-2` laisse `p-2` ajuster le bouton', async () => {
    const compilateur = await compile(lis('index.css'), { base, onDependency: () => undefined })
    const css = compilateur.build(['p-2'])
    // C'est la déclaration d'ordre des couches qui décide, pas l'ordre des blocs dans le fichier.
    expect(css).toMatch(/@layer theme,\s*base,\s*components,\s*utilities;/)
    // Le contenu du bloc `@layer nom { ... }`, accolades appariées.
    const couche = (nom: string) => {
      const debut = css.indexOf(`@layer ${nom} {`)
      if (debut < 0) return ''
      let profondeur = 0
      for (let i = css.indexOf('{', debut); i < css.length; i += 1) {
        if (css[i] === '{') profondeur += 1
        else if (css[i] === '}' && (profondeur -= 1) === 0) return css.slice(debut, i + 1)
      }
      return ''
    }
    expect(couche('components')).toContain('.bouton')
    expect(couche('components')).not.toContain('.p-2')
    expect(couche('utilities')).toContain('.p-2')
    expect(couche('utilities')).not.toContain('.bouton')
  })
})
