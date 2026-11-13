// Garde du build (CSP `script-src 'self'; style-src 'self'; font-src 'self'`, spec § 7.3) : refuse un `dist/`
// qui ne tiendrait pas sous la politique de sécurité, AVANT le déploiement. Un script ou un style en
// ligne, une police en `data:` ou une URL vers un autre hôte ne se verraient sinon qu'en production.
//
// Usage : node scripts/verifie-build.mjs <dist> [--banc]   (rend 1 au moindre problème)
//   --banc : le build du banc, qui contient `banc.html` ; sans, `banc.html` est refusé.
//
// L'analyse se fait par de vrais analyseurs (parse5 pour le HTML, postcss pour le CSS, acorn pour le JavaScript),
// non par des expressions régulières : ce qu'un navigateur interprète (`<script/type=module>`, `&#58;`, `\68ttps:`,
// une tabulation dans un schéma) est ce qu'on lit. Elle porte sur TOUT le CSS (une classe jamais rendue est livrée
// quand même). Ce que couvre le contrôle : les chargements (balises, `url()`, `@import`, `import`, `fetch`, `Worker`,
// `importScripts`, `sendBeacon`, `new URL(...)` …) dont l'URL est une chaîne écrite telle quelle.
//
// LIMITES ASSUMÉES : cette garde attrape les erreurs, pas l'obfuscation, et n'est pas une frontière de sécurité :
// c'est la CSP en `enforce` (`connect-src`, `script-src`, `style-src`, `font-src` à `'self'`) qui l'est. Ne se voient
// pas : une URL construite à l'exécution (`new URL(a, b)` avec une base distante, `setAttribute("src", …)`, un appel
// dont l'argument n'est pas une chaîne littérale), un nom de règle CSS échappé (`@im\70ort`), un manifeste de
// précache de service worker (F22 le vérifiera : `precacheAndRoute` ne doit contenir que des URL de même origine).
import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync } from 'node:fs'
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parse as parseJs } from 'acorn'
import { parse as parseHtml } from 'parse5'
import postcss from 'postcss'
import valueParser from 'postcss-value-parser'

const TAILLE_MAX_PAR_DEFAUT = 5 * 1024 * 1024
const POLICE_EN_DATA = /data:\s*(?:font|application\/(?:x-)?font)/i
const EXTENSIONS_TEXTE = new Set(['.html', '.htm', '.css', '.js', '.mjs', '.cjs', '.webmanifest', '.json'])

/** L'URL telle que la lit un navigateur : tabulations et retours supprimés, bords nettoyés, `\` pris pour `/`. */
// oxlint-disable-next-line no-control-regex -- les caractères de contrôle sont le sujet : un navigateur les retire d'une URL
const normalise = (valeur) => valeur.replace(/[\t\n\r]/g, '').replace(/^[\u0000-\u0020]+|[\u0000-\u0020]+$/g, '').replaceAll('\\', '/')

// Les seules images admises en `data:` : un type d'image réel. `data:image/woff2` n'en est pas une.
const IMAGE_EN_DATA = /^data:image\/(?:png|jpe?g|gif|webp|avif|svg\+xml|x-icon|vnd\.microsoft\.icon|bmp)[;,]/i

/** Sort du site (un schéma ou `//hôte`), sauf une image `data:` d'un type d'image connu. */
function estExterne(valeur) {
  const url = normalise(valeur)
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(url) && !IMAGE_EN_DATA.test(url)
}

/** Les échappements CSS décodés : continuation de ligne, `\68 ` (hexadécimal, espace de fin facultatif), `\"`, `\:`… */
function decodeCss(css) {
  // Un seul passage : un antislash produit par `\5c ` ne doit pas être décodé une seconde fois.
  return css.replace(/\\(?:\r?\n|([0-9a-fA-F]{1,6})[ \t\n\r\f]?|(.))/gs, (_, hex, caractere) => {
    if (hex === undefined) return caractere ?? ''
    const point = Number.parseInt(hex, 16)
    return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : ''
  })
}

/** Contrôle l'existence d'un fichier référencé (`/assets/x.woff2` depuis la racine de `dist/`, `./x.woff2` depuis le fichier). */
function verifieExiste(depuis, reference, contexte, probleme) {
  const sansRequete = reference.replace(/[?#].*$/, '')
  const cible = resolve(sansRequete.startsWith('/') ? join(contexte.racine, sansRequete) : join(dirname(join(contexte.racine, depuis)), sansRequete))
  const dehors = relative(contexte.racineReelle, cible)
  if (dehors.startsWith('..') || isAbsolute(dehors)) probleme(depuis, `référence ${reference} : le chemin sort de dist (hors de dist, le déploiement ne l'aurait pas)`)
  else if (!existsSync(cible)) probleme(depuis, `référence ${reference}, mais le fichier manque dans dist`)
}

// ---------------------------------------------------------------------------------------------- HTML

const ATTRIBUTS_D_URL = ['src', 'href', 'xlink:href', 'action', 'formaction', 'data', 'poster', 'background', 'ping']

function* elements(noeud) {
  if (noeud.tagName) yield noeud
  for (const enfant of noeud.childNodes ?? []) yield* elements(enfant)
  if (noeud.content) yield* elements(noeud.content)
}

function verifieHtml(chemin, contenu, contexte, probleme) {
  for (const element of elements(parseHtml(contenu))) {
    const nom = element.tagName.toLowerCase()
    const attributs = new Map(element.attrs.map(({ name, value }) => [name.toLowerCase(), value]))
    if (nom === 'script' && !attributs.get('src')) probleme(chemin, "un <script> en ligne (script-src 'self')")
    if (nom === 'style') probleme(chemin, "un bloc <style> en ligne (style-src 'self')")
    if (nom === 'base') probleme(chemin, "une balise <base> (la CSP la ferme : base-uri 'none')")
    if (attributs.has('srcdoc')) probleme(chemin, `un srcdoc sur <${nom}> : un document en ligne, hors de la CSP du site`)
    for (const [attribut] of attributs) {
      if (attribut === 'style') probleme(chemin, `un attribut style= sur <${nom}> (style-src 'self')`)
      if (/^on[a-z]+$/.test(attribut)) probleme(chemin, `un gestionnaire ${attribut}= sur <${nom}> (script-src 'self')`)
    }
    // Un lien <a> est une navigation, pas un chargement : seul `javascript:` y est refusé.
    const navigation = nom === 'a' || nom === 'area'
    for (const attribut of ATTRIBUTS_D_URL) {
      const valeur = attributs.get(attribut)
      if (valeur === undefined) continue
      if (navigation ? /^javascript:/i.test(normalise(valeur)) : estExterne(valeur)) probleme(chemin, `<${nom} ${attribut}> vers un autre hôte, ou javascript: : ${valeur.slice(0, 80)}`)
    }
    for (const attribut of ['srcset', 'imagesrcset']) {
      for (const candidat of (attributs.get(attribut) ?? '').split(',')) {
        const url = candidat.trim().split(/\s+/)[0]
        if (url && estExterne(url)) probleme(chemin, `<${nom} ${attribut}> vers un autre hôte : ${url.slice(0, 80)}`)
      }
    }
    if (nom === 'meta' && attributs.get('http-equiv')?.toLowerCase() === 'refresh') {
      const cible = /url\s*=\s*['"]?([^'"]*)/i.exec(attributs.get('content') ?? '')?.[1]
      if (cible && estExterne(cible)) probleme(chemin, `un <meta refresh> vers un autre hôte : ${cible.slice(0, 80)}`)
    }
    const href = nom === 'link' ? attributs.get('href') : undefined
    if (href && /\.woff2(?:[?#]|$)/i.test(href) && !estExterne(href)) verifieExiste(chemin, href, contexte, probleme)
  }
}

// ----------------------------------------------------------------------------------------------- CSS

// Fonctions dont un argument est une URL écrite entre guillemets (hors `url()`).
const FONCTIONS_D_IMAGE = new Set(['image-set', '-webkit-image-set', 'cross-fade', '-webkit-cross-fade', 'image', 'src'])

/** Les URL d'une valeur CSS : `url(...)` et les chaînes des fonctions d'image. */
function urlsDeValeur(valeur) {
  const urls = []
  valueParser(valeur).walk((noeud) => {
    if (noeud.type !== 'function') return
    // Le nom d'une fonction peut être échappé (`u\72l(`) : LightningCSS et les navigateurs le décodent.
    const nom = decodeCss(noeud.value).toLowerCase()
    if (nom === 'url') {
      // `URL(...)` en majuscules n'est pas reconnu comme `url()` par l'analyseur de valeurs : on relit tout l'argument.
      const [premier] = noeud.nodes
      urls.push(noeud.nodes.length === 1 && premier?.type === 'string' ? premier.value : valueParser.stringify(noeud.nodes).trim())
    } else if (FONCTIONS_D_IMAGE.has(nom)) {
      for (const enfant of noeud.nodes) if (enfant.type === 'string') urls.push(enfant.value)
    }
  })
  return urls
}

function verifieCss(chemin, contenu, contexte, probleme) {
  if (POLICE_EN_DATA.test(contenu) || POLICE_EN_DATA.test(decodeCss(contenu))) {
    probleme(chemin, "une police incorporée en data: (data:font : la CSP la refuse en silence, font-src 'self')")
  }
  let racine
  try {
    racine = postcss.parse(contenu)
  } catch (erreur) {
    probleme(chemin, `css illisible, analyse impossible : ${erreur.reason ?? erreur.message}`)
    return
  }
  const urls = []
  racine.walk((noeud) => {
    if (noeud.type === 'decl') {
      // Dans un @font-face, aucun data: n'est admis, quel que soit le type annoncé (font-src 'self').
      const dansFontFace = noeud.parent?.type === 'atrule' && noeud.parent.name.toLowerCase() === 'font-face'
      urls.push(...urlsDeValeur(noeud.value).map((url) => ({ url, dansFontFace })))
    } else if (noeud.type === 'atrule' && noeud.name.toLowerCase() === 'import') {
      const dansImport = [...urlsDeValeur(noeud.params), ...valueParser(noeud.params).nodes.filter((n) => n.type === 'string').map((n) => n.value)]
      urls.push(...dansImport.map((url) => ({ url, dansFontFace: false })))
    }
  })
  const vus = new Set()
  for (const { url: brute, dansFontFace } of urls) {
    const url = decodeCss(brute)
    if (vus.has(`${dansFontFace}|${url}`)) continue
    vus.add(`${dansFontFace}|${url}`)
    if (dansFontFace && /^data:/i.test(normalise(url))) probleme(chemin, `un data: dans un @font-face (font-src 'self') : ${url.slice(0, 60)}`)
    else if (estExterne(url)) probleme(chemin, `une URL qui sort du site, ou un data: qui n'est pas une image connue : ${url.slice(0, 80)}`)
    else if (/\.woff2(?:[?#]|$)/i.test(url)) verifieExiste(chemin, url, contexte, probleme)
  }
}

// ------------------------------------------------------------------------------------------------ JS

const APPELS_DE_CHARGEMENT = new Set(['fetch', 'importScripts', 'sendBeacon', 'open'])
const CONSTRUCTEURS_DE_CHARGEMENT = new Set(['URL', 'Worker', 'SharedWorker', 'EventSource', 'WebSocket', 'Request'])
const PROPRIETES_D_URL = new Set(['src', 'href', 'action', 'data', 'srcset'])

/** Une chaîne écrite telle quelle : un littéral, ou un gabarit sans expression. */
function chaineStatique(noeud) {
  if (!noeud) return undefined
  if (noeud.type === 'Literal' && typeof noeud.value === 'string') return noeud.value
  if (noeud.type === 'TemplateLiteral' && noeud.expressions.length === 0) return noeud.quasis[0]?.value.cooked ?? undefined
  return undefined
}

function analyseJs(code) {
  for (const sourceType of ['module', 'script']) {
    try {
      return parseJs(code, { ecmaVersion: 'latest', sourceType, allowHashBang: true })
    } catch {
      // essai suivant
    }
  }
  return null
}

function* noeuds(racine) {
  const pile = [racine]
  while (pile.length > 0) {
    const noeud = pile.pop()
    if (noeud && typeof noeud.type === 'string') yield noeud
    for (const valeur of Object.values(noeud ?? {})) {
      if (Array.isArray(valeur)) pile.push(...valeur)
      else if (valeur && typeof valeur === 'object') pile.push(valeur)
    }
  }
}

function nomDeLAppel(callee) {
  if (callee.type === 'Identifier') return callee.name
  if (callee.type === 'MemberExpression' && !callee.computed && callee.property.type === 'Identifier') return callee.property.name
  return undefined
}

function verifieJs(chemin, contenu, probleme) {
  if (POLICE_EN_DATA.test(contenu)) probleme(chemin, 'une police incorporée en data: (data:font)')
  if (/fonts\.(?:googleapis|gstatic)\.com/i.test(contenu)) probleme(chemin, 'une référence à Google Fonts (les polices sont servies par notre domaine)')
  const arbre = analyseJs(contenu)
  if (!arbre) {
    probleme(chemin, 'js illisible, analyse impossible : on ne le laisse pas passer sans le lire')
    return
  }
  const signale = (quoi, valeur) => probleme(chemin, `${quoi} vers un autre hôte : ${String(valeur).slice(0, 80)}`)
  for (const noeud of noeuds(arbre)) {
    if (noeud.type === 'ImportExpression' || noeud.type === 'ImportDeclaration' || noeud.type === 'ExportAllDeclaration' || noeud.type === 'ExportNamedDeclaration') {
      const source = chaineStatique(noeud.source)
      if (source !== undefined && estExterne(source)) signale('un import', source)
    } else if (noeud.type === 'CallExpression' || noeud.type === 'NewExpression') {
      const nom = nomDeLAppel(noeud.callee)
      const charge = noeud.type === 'CallExpression' ? APPELS_DE_CHARGEMENT.has(nom) : CONSTRUCTEURS_DE_CHARGEMENT.has(nom)
      if (!charge) continue
      // `xhr.open(méthode, url)` : l'URL est le deuxième argument ; ailleurs, le premier.
      for (const argument of nom === 'open' ? noeud.arguments : noeud.arguments.slice(0, 1)) {
        const url = chaineStatique(argument)
        if (url !== undefined && estExterne(url)) signale(`${nom}(...)`, url)
      }
    } else if (noeud.type === 'AssignmentExpression' && noeud.left.type === 'MemberExpression' && !noeud.left.computed && noeud.left.property.type === 'Identifier' && PROPRIETES_D_URL.has(noeud.left.property.name)) {
      const url = chaineStatique(noeud.right)
      if (url !== undefined && estExterne(url)) signale(`une affectation de .${noeud.left.property.name}`, url)
    }
  }
}

// ------------------------------------------------------------------------------------------ MANIFESTE

function verifieManifeste(chemin, contenu, probleme) {
  let json
  try {
    json = JSON.parse(contenu)
  } catch {
    probleme(chemin, 'json illisible, analyse impossible')
    return
  }
  const pile = [json]
  while (pile.length > 0) {
    const valeur = pile.pop()
    if (typeof valeur === 'string') {
      if (estExterne(valeur)) probleme(chemin, `une URL vers un autre hôte : ${valeur.slice(0, 80)}`)
    } else if (valeur && typeof valeur === 'object') pile.push(...Object.values(valeur))
  }
}

// ------------------------------------------------------------------------------------------- PARCOURS

function* fichiers(dossier, racine, probleme) {
  for (const entree of readdirSync(dossier, { withFileTypes: true })) {
    const chemin = join(dossier, entree.name)
    const relatif = relative(racine, chemin).split('\\').join('/')
    if (lstatSync(chemin).isSymbolicLink()) probleme(relatif, "un lien symbolique : dist n'en contient jamais, et il sortirait des fichiers analysés")
    else if (entree.isDirectory()) yield* fichiers(chemin, racine, probleme)
    else yield { chemin, relatif }
  }
}

/** Rend la liste des problèmes de `dist` (vide : conforme). */
export function verifieBuild(dist, { banc = false, tailleMax = TAILLE_MAX_PAR_DEFAUT } = {}) {
  const problemes = []
  const probleme = (ou, quoi) => problemes.push(`${ou} : ${quoi}`)
  const racine = resolve(dist)
  const contexte = { racine, racineReelle: realpathSync(racine) }
  for (const { chemin, relatif } of fichiers(racine, racine, probleme)) {
    const extension = extname(relatif).toLowerCase()
    if (basename(relatif).toLowerCase() === 'banc.html' && !banc) probleme(relatif, "banc.html n'a rien à faire dans un build normal (le banc ne part pas en production)")
    if (!EXTENSIONS_TEXTE.has(extension)) continue
    if (lstatSync(chemin).size > tailleMax) {
      probleme(relatif, `fichier trop gros pour être analysé (plus de ${tailleMax} octets) : refusé plutôt que laissé passer sans être lu`)
      continue
    }
    const contenu = readFileSync(chemin, 'utf8')
    if (extension === '.html' || extension === '.htm') verifieHtml(relatif, contenu, contexte, probleme)
    else if (extension === '.css') verifieCss(relatif, contenu, contexte, probleme)
    else if (extension === '.webmanifest' || extension === '.json') verifieManifeste(relatif, contenu, probleme)
    else verifieJs(relatif, contenu, probleme)
  }
  return problemes
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [dist, ...options] = process.argv.slice(2)
  if (!dist || !existsSync(dist)) {
    console.error('Usage : node scripts/verifie-build.mjs <dist> [--banc] (dossier absent ou non donné)')
    process.exit(1)
  }
  const problemes = verifieBuild(dist, { banc: options.includes('--banc') })
  for (const probleme of problemes) console.error(process.env.GITHUB_ACTIONS ? `::error::${probleme}` : probleme)
  if (problemes.length === 0) console.log(`${dist} : aucun script ni style en ligne, aucune police en data:, aucun chargement écrit vers un autre hôte.`)
  process.exit(problemes.length === 0 ? 0 : 1)
}
