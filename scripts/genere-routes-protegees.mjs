// Écrit `src/api/routes-protegees.ts` : la liste des opérations du contrat qui exigent une session,
// tirée de leur `security` (OpenAPI). F21 s'en sert pour ne traiter une `401` comme une session
// expirée que sur ces routes : aucune liste n'est écrite à la main.
//
// Usage : node scripts/genere-routes-protegees.mjs [--check]
//   --check : ne rien écrire, rendre 1 si le fichier commité n'est pas celui que le contrat donne.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const METHODES = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']

/** Protégée = l'exigence effective existe et aucune de ses alternatives n'admet l'anonyme (`{}`). */
function estProtegee(exigences) {
  return Array.isArray(exigences) && exigences.length > 0 && exigences.every((exigence) => Object.keys(exigence).length > 0)
}

/** Les opérations d'un chemin ; un chemin décrit par `$ref` n'est pas résolu : on le refuse, on ne le saute pas. */
function* parcourt(contrat) {
  for (const [chemin, element] of Object.entries(contrat.paths ?? {})) {
    if ('$ref' in element) throw new Error(`le chemin ${chemin} est décrit par $ref : non pris en charge (ses opérations disparaîtraient de la liste)`)
    for (const methode of METHODES) {
      if (element[methode]) yield { cle: `${methode.toUpperCase()} ${chemin}`, operation: element[methode] }
    }
  }
}

/** Toutes les opérations du contrat (« MÉTHODE chemin »), triées. */
export function operations(contrat) {
  return [...parcourt(contrat)].map(({ cle }) => cle).sort()
}

export function routesProtegees(contrat) {
  const routes = []
  for (const { cle, operation } of parcourt(contrat)) {
    // Une opération qui déclare `security` (même `[]`) remplace celle de la racine.
    const exigences = 'security' in operation ? operation.security : contrat.security
    if (estProtegee(exigences)) routes.push(cle)
  }
  return routes.sort()
}

export function rendu(routes) {
  const lignes = routes.map((route) => `  '${route}',\n`).join('')
  return (
    '// Généré par `npm run contrat:genere` depuis contrat/openapi.json : ne pas modifier à la main.\n' +
    '// Les opérations du contrat qui exigent une session (`security`).\n' +
    `export const routesProtegees = [\n${lignes}] as const\n\n` +
    'export type RouteProtegee = (typeof routesProtegees)[number]\n'
  )
}

export function genere({ racine = process.cwd(), verifie = false } = {}) {
  const contrat = JSON.parse(readFileSync(join(racine, 'contrat/openapi.json'), 'utf8'))
  const attendu = rendu(routesProtegees(contrat))
  const fichier = join(racine, 'src/api/routes-protegees.ts')
  if (!verifie) {
    writeFileSync(fichier, attendu)
    return 0
  }
  let actuel
  try {
    actuel = readFileSync(fichier, 'utf8')
  } catch {
    console.error('src/api/routes-protegees.ts est absent : lancer « npm run contrat:genere » et le commiter')
    return 1
  }
  if (actuel !== attendu) {
    console.error('src/api/routes-protegees.ts n’est pas celui que donne contrat/openapi.json : lancer « npm run contrat:genere » et le commiter')
    return 1
  }
  return 0
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  process.exit(genere({ verifie: process.argv.includes('--check') }))
}
