// @vitest-environment node
/// <reference types="node" />
// La garde d'architecture (§ 8.3 de la spec) : ce que le code livré du front n'a pas le droit de contenir. Elle lit le texte des
// fichiers de `src/`, sans analyseur : une règle franchie dans un commentaire échoue aussi (reformuler le commentaire). Les
// tests (`*.test.*`) et `src/test/` ne sont pas livrés : ils sont hors de la garde. Chaque règle a son leurre plus bas : sans
// lui, une règle dont l'expression ne détecte plus rien resterait verte.
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

type Regle = {
  nom: string
  motif: RegExp
  /** Vrai : la règle ne vaut pas dans `src/api/`, la seule couche qui parle au réseau. */
  horsDeLApi: boolean
}

// Les règles du réseau n'ont pas cours dans `src/api/` (`client.ts` est le seul fichier qui appelle `fetch` et importe
// `openapi-fetch`) ; toutes les autres valent partout, `src/api/` compris.
const REGLES: readonly Regle[] = [
  { nom: 'fetch', motif: /\bfetch\s*\(|\b(?:window|globalThis|self)\s*\.\s*fetch\b/, horsDeLApi: true },
  { nom: 'XMLHttpRequest', motif: /XMLHttpRequest/, horsDeLApi: true },
  { nom: 'WebSocket', motif: /\bnew\s+WebSocket\b/, horsDeLApi: true },
  { nom: 'EventSource', motif: /\bnew\s+EventSource\b/, horsDeLApi: true },
  { nom: 'sendBeacon', motif: /\bsendBeacon\b/, horsDeLApi: true },
  { nom: 'openapi-fetch', motif: /['"]openapi-fetch['"]/, horsDeLApi: true },
  { nom: 'VITE_', motif: /\bVITE_/, horsDeLApi: false },
  { nom: 'supabase', motif: /supabase/i, horsDeLApi: false },
  { nom: 'dangerouslySetInnerHTML', motif: /dangerouslySetInnerHTML/, horsDeLApi: false },
  { nom: 'innerHTML', motif: /\b(?:innerHTML|outerHTML|insertAdjacentHTML)\b/, horsDeLApi: false },
  { nom: 'eval', motif: /\beval\s*\(/, horsDeLApi: false },
  { nom: 'new Function', motif: /\bnew\s+Function\b/, horsDeLApi: false },
  // `AnimatePresence mode="popLayout"` : `PopChild` de Motion crée un `<style>` à l'exécution, refusé par `style-src 'self'`
  // (lu dans `framer-motion/dist/es/components/AnimatePresence/PopChild.mjs`, 14.12.0).
  { nom: 'popLayout', motif: /popLayout/, horsDeLApi: false },
]

const EXTENSIONS = /\.(?:ts|tsx|js|jsx|mjs|cjs)$/
// Fichiers qui ne sont pas du code livré écrit à la main : tests, aides de test, schéma généré du contrat (il cite le fournisseur
// d'authentification dans ses descriptions).
const estHorsGarde = (chemin: string): boolean => /\.test\.[cm]?[jt]sx?$/.test(chemin) || chemin.startsWith('test/') || chemin === 'api/schema.d.ts'

function fichiersDe(dossier: string): string[] {
  return readdirSync(dossier, { withFileTypes: true }).flatMap((entree) =>
    entree.isDirectory() ? fichiersDe(join(dossier, entree.name)) : [join(dossier, entree.name)],
  )
}

/** Les infractions sous `src` (un dossier de la forme du dépôt), au format `chemin : règle`. */
function infractionsDe(src: string): string[] {
  const trouvees: string[] = []
  for (const fichier of fichiersDe(src)) {
    const chemin = relative(src, fichier).split('\\').join('/')
    if (!EXTENSIONS.test(chemin) || estHorsGarde(chemin)) continue
    const dansApi = chemin.startsWith('api/')
    const contenu = readFileSync(fichier, 'utf8')
    for (const regle of REGLES) {
      if (dansApi && regle.horsDeLApi) continue
      if (regle.motif.test(contenu)) trouvees.push(`${chemin} : ${regle.nom}`)
    }
  }
  return trouvees
}

const DEPENDANCES = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'] as const

/** Ce que `package.json` ne doit pas contenir : un paquet du fournisseur de l'ancien front, `VITE_` dans un script. */
function infractionsDuPaquet(paquet: unknown): string[] {
  const trouvees: string[] = []
  const objet = (valeur: unknown): Record<string, unknown> =>
    typeof valeur === 'object' && valeur !== null ? (valeur as Record<string, unknown>) : {}
  const racine = objet(paquet)
  for (const section of DEPENDANCES) {
    for (const nom of Object.keys(objet(racine[section]))) {
      if (/supabase/i.test(nom)) trouvees.push(`${section} : ${nom}`)
    }
  }
  for (const [nom, commande] of Object.entries(objet(racine['scripts']))) {
    if (typeof commande === 'string' && /\bVITE_/.test(commande)) trouvees.push(`scripts : ${nom}`)
  }
  return trouvees
}

// --- Le code livré, tel qu'il est ------------------------------------------------------------------------------------------

const SRC = resolve(process.cwd(), 'src')

describe('architecture du code livré', () => {
  it('lit bien le code (la garde ne passe pas au vert faute de fichiers)', () => {
    const lus = fichiersDe(SRC)
      .map((f) => relative(SRC, f).split('\\').join('/'))
      .filter((c) => EXTENSIONS.test(c) && !estHorsGarde(c))
    expect(lus).toEqual(expect.arrayContaining(['main.tsx', 'api/client.ts', 'ui/Button.tsx', 'routes/__root.tsx']))
  })

  it('ne trouve aucune infraction dans src/', () => {
    expect(infractionsDe(SRC)).toEqual([])
  })

  it('ne trouve aucune infraction dans package.json', () => {
    const paquet: unknown = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'))
    expect(infractionsDuPaquet(paquet)).toEqual([])
  })
})

// --- Les leurres : chaque règle prouve qu'elle détecte ----------------------------------------------------------------------

const racine = mkdtempSync(join(tmpdir(), 'popote-architecture-'))
afterAll(() => rmSync(racine, { recursive: true, force: true }))

let compteur = 0
/** Un `src` temporaire qui ne contient que les fichiers donnés (chemin relatif à `src`, contenu). */
function faussesSources(fichiers: Record<string, string>): string {
  const src = join(racine, `essai-${compteur++}`, 'src')
  mkdirSync(src, { recursive: true })
  for (const [chemin, contenu] of Object.entries(fichiers)) {
    mkdirSync(dirname(join(src, chemin)), { recursive: true })
    writeFileSync(join(src, chemin), contenu)
  }
  return src
}

const LEURRES: ReadonlyArray<readonly [regle: string, code: string]> = [
  ['fetch', "const r = await fetch('/x')"],
  ['fetch', 'const r = await window.fetch(url)'],
  ['fetch', 'const appeler = globalThis.fetch'],
  ['XMLHttpRequest', 'const requete = new XMLHttpRequest()'],
  ['WebSocket', "const socket = new WebSocket('wss://exemple.fr')"],
  ['EventSource', "const flux = new EventSource('/flux')"],
  ['sendBeacon', "navigator.sendBeacon('/mesure', corps)"],
  ['openapi-fetch', "import createClient from 'openapi-fetch'"],
  ['VITE_', 'const adresse = import.meta.env.VITE_API'],
  ['VITE_', 'const { VITE_API } = import.meta.env'],
  ['supabase', "import { createClient } from '@supabase/supabase-js'"],
  ['supabase', "const SUPABASE_URL = ''"],
  ['dangerouslySetInnerHTML', 'const a = <p dangerouslySetInnerHTML={{ __html: texte }} />'],
  ['innerHTML', 'element.innerHTML = texte'],
  ['innerHTML', 'element.insertAdjacentHTML("beforeend", texte)'],
  ['eval', 'eval(code)'],
  ['new Function', "const f = new Function('return 1')"],
  ['popLayout', 'const a = <AnimatePresence mode="popLayout" />'],
]

describe('les leurres de la garde', () => {
  it.each(LEURRES)('la règle « %s » détecte `%s`', (regle, code) => {
    const src = faussesSources({ 'ecran/leurre.tsx': code })
    expect(infractionsDe(src)).toEqual([`ecran/leurre.tsx : ${regle}`])
  })

  it('chaque règle a au moins un leurre', () => {
    expect(new Set(LEURRES.map(([regle]) => regle))).toEqual(new Set(REGLES.map((regle) => regle.nom)))
  })

  it.each(LEURRES.filter(([regle]) => REGLES.find((r) => r.nom === regle)?.horsDeLApi))(
    'la couche API a le droit à la règle réseau « %s » (`%s`)',
    (_regle, code) => {
      expect(infractionsDe(faussesSources({ 'api/client.ts': code }))).toEqual([])
    },
  )

  it.each(LEURRES.filter(([regle]) => REGLES.find((r) => r.nom === regle)?.horsDeLApi === false))(
    'la couche API n’a pas le droit à la règle « %s » (`%s`)',
    (regle, code) => {
      expect(infractionsDe(faussesSources({ 'api/client.ts': code }))).toEqual([`api/client.ts : ${regle}`])
    },
  )

  it('lit tous les sous-dossiers et les extensions .ts, .js et .mjs', () => {
    const src = faussesSources({ 'a/b/c/profond.ts': 'eval(x)', 'ancien.js': 'eval(x)', 'outil.mjs': 'eval(x)' })
    expect(infractionsDe(src).sort()).toEqual(['a/b/c/profond.ts : eval', 'ancien.js : eval', 'outil.mjs : eval'])
  })

  it('laisse passer un test, une aide de test et le schéma généré, qui ne sont pas livrés', () => {
    const src = faussesSources({
      'ecran/Ecran.test.tsx': "fetch('/x'); eval(x)",
      'ecran/Ecran.test.ts': "fetch('/x')",
      'test/setup.ts': 'eval(x)',
      'api/schema.d.ts': '// Supabase Auth',
    })
    expect(infractionsDe(src)).toEqual([])
  })

  it('ne confond pas un appel proche avec un `fetch` (fetchQuery, prefetch, un fichier qui n’est pas du code)', () => {
    const src = faussesSources({
      'ecran/Propre.tsx': "queryClient.fetchQuery(options); prefetch('/x'); const nom = 'fetchez'",
      'ecran/note.md': 'fetch(',
    })
    expect(infractionsDe(src)).toEqual([])
  })

  it('refuse un test dont le nom ne se termine pas par `.test.` (un fichier d’aide nommé comme un test ne passe pas la garde par erreur)', () => {
    expect(infractionsDe(faussesSources({ 'ecran/aide-test.ts': 'eval(x)', 'ecran/testeur.ts': 'eval(x)' })).sort()).toEqual([
      'ecran/aide-test.ts : eval',
      'ecran/testeur.ts : eval',
    ])
  })
})

describe('les leurres de package.json', () => {
  it.each(['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'])('refuse un paquet du fournisseur dans « %s »', (section) => {
    expect(infractionsDuPaquet({ [section]: { '@supabase/supabase-js': '2.0.0' } })).toEqual([`${section} : @supabase/supabase-js`])
  })

  it('refuse `VITE_` dans un script', () => {
    expect(infractionsDuPaquet({ scripts: { build: 'VITE_API=https://x.exemple.fr vite build' } })).toEqual(['scripts : build'])
  })

  it('laisse passer un paquet et un script ordinaires, et un fichier mal formé', () => {
    expect(infractionsDuPaquet({ dependencies: { react: '19.0.0' }, scripts: { build: 'vite build' } })).toEqual([])
    expect(infractionsDuPaquet(null)).toEqual([])
    expect(infractionsDuPaquet({ scripts: { build: 3 } })).toEqual([])
  })
})
