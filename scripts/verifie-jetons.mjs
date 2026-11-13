// Les jetons du style « Jeu » ont UNE source : `.design/systeme/jetons.css`. `src/styles/jetons.css` en est
// le portage pour Tailwind (remises à zéro des défauts, `@theme static`, ombres en `inline`) : aucune
// valeur ne change, aucun jeton ne s'ajoute. Ce contrôle compare les paires `--nom: valeur`, vérifie les
// remises à zéro, et que les polices et leurs licences sont celles du système.
//
// Il compare aussi `jetons.css` du système à `jetons-racine.css`, la copie faite à la main pour que la
// page de référence marche sans Tailwind (revue de la PR #38, point 14).
//
// Usage : node scripts/verifie-jetons.mjs   (rend 1 au moindre écart)
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

/** Les espaces du thème par défaut de Tailwind que notre `jetons.css` ferme (le test de Tailwind les relit). */
export const REMISES_ATTENDUES = [
  '--color-*', '--text-*', '--radius-*', '--shadow-*', '--inset-shadow-*', '--drop-shadow-*', '--font-*', '--ease-*', '--animate-*',
  '--text-shadow-*', '--blur-*', '--perspective-*', '--leading-*', '--tracking-*',
]

const sansCommentaires = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * Découpe `texte` aux `separateur` du niveau 0 : hors chaîne, hors parenthèses, hors accolades. Une valeur
 * peut donc contenir `;` ou `{}` dans `url(...)` ou une chaîne. Rend aussi les accolades non appariées.
 */
function decoupe(texte, separateur) {
  const morceaux = []
  let courant = ''
  let chaine = null
  let parentheses = 0
  let accolades = 0
  for (let i = 0; i < texte.length; i += 1) {
    const c = texte[i]
    if (chaine) {
      courant += c
      if (c === '\\') courant += texte[++i] ?? ''
      else if (c === chaine) chaine = null
      continue
    }
    if (c === '"' || c === "'") chaine = c
    else if (c === '(') parentheses += 1
    else if (c === ')') parentheses = Math.max(0, parentheses - 1)
    else if (c === '{') accolades += 1
    else if (c === '}') accolades -= 1
    if (c === separateur && parentheses === 0 && accolades === 0) {
      morceaux.push(courant)
      courant = ''
    } else courant += c
  }
  morceaux.push(courant)
  return morceaux
}

/** Vrai si `texte` ouvre un bloc `{` hors chaîne et hors parenthèses (un `{}` dans `url("...")` n'en est pas un). */
function ouvreUnBloc(texte) {
  let chaine = null
  let parentheses = 0
  for (let i = 0; i < texte.length; i += 1) {
    const c = texte[i]
    if (chaine) {
      if (c === '\\') i += 1
      else if (c === chaine) chaine = null
    } else if (c === '"' || c === "'") chaine = c
    else if (c === '(') parentheses += 1
    else if (c === ')') parentheses = Math.max(0, parentheses - 1)
    else if (c === '{' && parentheses === 0) return true
  }
  return false
}

/** Les noms des propriétés personnalisées déclarées dans un texte CSS (hors commentaires), où que ce soit. */
function proprietesPersonnalisees(css) {
  return [...sansCommentaires(css).matchAll(/(?:^|[;{}\s])(--[\p{L}\p{N}-]+)\s*:/gu)].map(([, nom]) => nom)
}

/** Tous les `.css` d'un dossier, récursivement. */
function fichiersCss(dossier) {
  if (!existsSync(dossier)) return []
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = join(dossier, nom)
    return statSync(chemin).isDirectory() ? fichiersCss(chemin) : nom.endsWith('.css') ? [chemin] : []
  })
}

/** Les règles de niveau 0 : `{ prelude, corps }`. */
function blocs(css) {
  const resultat = []
  let reste = css.trim()
  while (reste.length > 0) {
    const ouvre = reste.indexOf('{')
    if (ouvre < 0) break
    let profondeur = 0
    let chaine = null
    let parentheses = 0
    let ferme = -1
    for (let i = ouvre; i < reste.length; i += 1) {
      const c = reste[i]
      if (chaine) {
        if (c === '\\') i += 1
        else if (c === chaine) chaine = null
        continue
      }
      if (c === '"' || c === "'") chaine = c
      else if (c === '(') parentheses += 1
      else if (c === ')') parentheses = Math.max(0, parentheses - 1)
      else if (parentheses === 0 && c === '{') profondeur += 1
      else if (parentheses === 0 && c === '}') {
        profondeur -= 1
        if (profondeur === 0) {
          ferme = i
          break
        }
      }
    }
    if (ferme < 0) break
    resultat.push({ prelude: reste.slice(0, ouvre).trim(), corps: reste.slice(ouvre + 1, ferme) })
    reste = reste.slice(ferme + 1).trim()
  }
  return resultat
}

/**
 * Analyse un fichier de jetons : les paires `--nom: valeur` des blocs `@theme` (et de `:root` si `racine`), les
 * remises à zéro (`--ns-*: initial`) et les erreurs (déclaration qui n'est pas un jeton, bloc imbriqué, jeton déclaré
 * deux fois). Un jeton hors de ces blocs n'est pas lu : l'utilitaire Tailwind n'existerait pas.
 */
export function analyse(css, { racine = false } = {}) {
  const jetons = new Map()
  const remises = new Set()
  const erreurs = []
  const horsBloc = new Set()
  for (const { prelude, corps } of blocs(sansCommentaires(css))) {
    if (!/^@theme\b/.test(prelude) && !(racine && prelude === ':root')) {
      // Un jeton redéfini ailleurs (`:root { --color-encre: #000 }` après le @theme) gagnerait dans la cascade.
      for (const nom of proprietesPersonnalisees(corps)) horsBloc.add(nom)
      continue
    }
    for (const instruction of decoupe(corps, ';')) {
      const texte = instruction.trim()
      if (texte === '') continue
      if (ouvreUnBloc(texte)) {
        erreurs.push(`bloc imbriqué inattendu dans ${prelude} : ${texte.slice(0, 40)}`)
        continue
      }
      const paire = /^(--(?:\*|[\p{L}\p{N}-]+?(?:-\*)?))\s*:\s*([\s\S]+)$/u.exec(texte)
      if (!paire) {
        erreurs.push(`déclaration qui n'est pas un jeton dans ${prelude} : ${texte.slice(0, 60)}`)
        continue
      }
      const [, nom, brute] = paire
      const valeur = brute.replace(/\s+/g, ' ').trim()
      if (nom.endsWith('*')) {
        if (valeur === 'initial') remises.add(nom)
        else erreurs.push(`${nom} n'est pas une remise à zéro (« ${valeur} »)`)
      } else if (jetons.has(nom)) erreurs.push(`${nom} est déclaré deux fois`)
      else jetons.set(nom, valeur)
    }
  }
  return { jetons, remises, erreurs, horsBloc }
}

/** Écarts de `notre` par rapport à `systeme`. */
export function compareJetons(systeme, notre) {
  return {
    manquants: [...systeme.keys()].filter((nom) => !notre.has(nom)),
    differents: [...systeme.keys()].filter((nom) => notre.has(nom) && notre.get(nom) !== systeme.get(nom)),
    enPlus: [...notre.keys()].filter((nom) => !systeme.has(nom)),
  }
}

function lis(racine, chemin, options) {
  try {
    return analyse(readFileSync(join(racine, chemin), 'utf8'), options)
  } catch {
    return { erreur: `${chemin} est illisible ou absent` }
  }
}

/** Les `@font-face` d'un CSS, normalisés (le fichier de `src` réduit à son nom) pour être comparés. */
function faces(css) {
  return [...sansCommentaires(css).matchAll(/@font-face\s*\{([^}]*)\}/g)].map(([, corps]) =>
    decoupe(corps, ';')
      .map((instruction) => instruction.trim())
      .filter(Boolean)
      .map((instruction) => {
        const [propriete, ...valeur] = instruction.split(':')
        const texte = valeur.join(':').replace(/\s+/g, ' ').trim()
        return `${propriete.trim()}: ${propriete.trim() === 'src' ? texte.replace(/url\(\s*["']?[^"')]*\/([^/"')]+)["']?\s*\)/g, 'url($1)') : texte}`
      })
      .sort()
      .join('; '),
  )
}

function verifiePolices(racine) {
  const problemes = []
  const comparent = (dossierSysteme, dossierNotre, motif, etiquette) => {
    const dir = join(racine, dossierSysteme)
    if (!existsSync(dir)) return problemes.push(`${dossierSysteme} est absent`)
    for (const fichier of readdirSync(dir).filter((nom) => motif.test(nom))) {
      const notre = join(racine, dossierNotre, fichier)
      if (!existsSync(notre)) problemes.push(`${etiquette} : ${dossierNotre}/${fichier} manque (présent dans le système)`)
      else if (!readFileSync(notre).equals(readFileSync(join(dir, fichier)))) problemes.push(`${etiquette} : ${dossierNotre}/${fichier} diffère de celui du système`)
    }
  }
  comparent('.design/systeme/polices', 'src/styles/polices', /\.woff2$/, 'police')
  comparent('.design/systeme/polices', 'public/licences', /^LICENCE-.*\.txt$/, 'licence OFL (elle doit accompagner la police)')
  try {
    const systeme = faces(readFileSync(join(racine, '.design/systeme/composants.css'), 'utf8'))
    const notre = faces(readFileSync(join(racine, 'src/styles/polices.css'), 'utf8'))
    if (JSON.stringify(systeme) !== JSON.stringify(notre)) problemes.push('src/styles/polices.css : les @font-face s\'écartent de ceux de .design/systeme/composants.css (famille, plage, graisse ou fichier)')
  } catch {
    problemes.push('composants.css du système ou polices.css est illisible ou absent')
  }
  return problemes
}

/** Aucun autre CSS de `src/` ne redéfinit un jeton du système (une propriété locale qui n'en est pas un reste libre). */
function verifieRedefinitions(racine, jetonsDuSysteme) {
  const problemes = []
  for (const chemin of fichiersCss(join(racine, 'src'))) {
    const relatif = chemin.slice(racine.length + 1).split('\\').join('/')
    if (relatif === 'src/styles/jetons.css') continue
    for (const nom of new Set(proprietesPersonnalisees(readFileSync(chemin, 'utf8')))) {
      if (jetonsDuSysteme.has(nom)) problemes.push(`${relatif} : redéfinit le jeton ${nom} (il ne se change que dans .design/systeme/jetons.css)`)
    }
  }
  return problemes
}

/** Rend la liste des problèmes (vide : tout est conforme). */
export function verifie({ racine = process.cwd() } = {}) {
  const systeme = lis(racine, '.design/systeme/jetons.css')
  const notre = lis(racine, 'src/styles/jetons.css')
  const copie = lis(racine, '.design/systeme/jetons-racine.css', { racine: true })
  const problemes = [systeme, notre, copie].flatMap((fichier) => (fichier.erreur ? [fichier.erreur] : []))
  if (problemes.length > 0) return problemes

  problemes.push(
    ...notre.erreurs.map((erreur) => `src/styles/jetons.css : ${erreur}`),
    ...systeme.erreurs.map((erreur) => `.design/systeme/jetons.css : ${erreur}`),
    ...copie.erreurs.map((erreur) => `.design/systeme/jetons-racine.css : ${erreur}`),
    ...[...notre.horsBloc].map((nom) => `src/styles/jetons.css : ${nom} est déclaré hors d'un bloc @theme (il redéfinirait un jeton dans la cascade)`),
    ...REMISES_ATTENDUES.filter((nom) => !notre.remises.has(nom)).map((nom) => `src/styles/jetons.css : la remise à zéro « ${nom}: initial » manque (un défaut de Tailwind contournerait le système)`),
  )
  const ecarts = compareJetons(systeme.jetons, notre.jetons)
  problemes.push(
    ...ecarts.manquants.map((nom) => `src/styles/jetons.css : il manque ${nom} (présent dans le système, ou déclaré hors d'un bloc @theme)`),
    ...ecarts.differents.map((nom) => `src/styles/jetons.css : ${nom} vaut « ${notre.jetons.get(nom)} », le système dit « ${systeme.jetons.get(nom)} »`),
    ...ecarts.enPlus.map((nom) => `src/styles/jetons.css : ${nom} est en plus (tout jeton vient du système : l'ajouter à .design/systeme/jetons.css)`),
  )
  const derive = compareJetons(systeme.jetons, copie.jetons)
  problemes.push(
    ...[...derive.manquants, ...derive.differents, ...derive.enPlus].map(
      (nom) => `.design/systeme/jetons-racine.css s'écarte de jetons.css (${nom}) : « sed 's/^@theme {/:root {/' jetons.css > jetons-racine.css »`,
    ),
    ...verifiePolices(racine),
    ...verifieRedefinitions(racine, systeme.jetons),
  )
  return problemes
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const problemes = verifie()
  for (const probleme of problemes) console.error(process.env.GITHUB_ACTIONS ? `::error::${probleme}` : probleme)
  if (problemes.length === 0) console.log('Les jetons, les polices et leurs licences de src/ sont ceux du système.')
  process.exit(problemes.length === 0 ? 0 : 1)
}
