// Copie épinglée du contrat de `popote-api` (spec § 3.9 et § 9.2) : `contrat/openapi.json` est la copie
// d'UN commit de `popote-api`, dont le SHA est dans `contrat/AMONT`. Le client TypeScript
// (`src/api/schema.d.ts`) est généré depuis cette copie.
//
// Usage :
//   node scripts/sync-contrat.mjs <sha|main>   copie le contrat de ce commit (ou de la tête de main)
//   node scripts/sync-contrat.mjs --verifie    la copie est-elle celle de AMONT, et AMONT est-il sur main ?
//
// L'hôte et le dépôt sont figés ci-dessous : l'URL se construit à partir d'un SHA de 40 caractères
// hexadécimaux validé, jamais d'une chaîne libre. `--verifie` ne lit aucun secret : le jeton de la CI
// (`GITHUB_TOKEN`, lecture seule) ne part qu'à l'API de comparaison.
import { execFile } from 'node:child_process'
import { lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

const DEPOT = 'kamil-bentounes/popote-api'
const HOTE_CONTRAT = 'https://raw.githubusercontent.com'
const HOTE_API = 'https://api.github.com'
const ESSAIS = 3
const DELAI_REQUETE_MS = 15_000
const TAILLE_MAX = 1024 * 1024 // 1 Mio : un contrat plus gros n'est pas le nôtre

export class ErreurContrat extends Error {
  name = 'ErreurContrat'
}

export function estSha(valeur) {
  return typeof valeur === 'string' && /^[0-9a-f]{40}$/.test(valeur)
}

function exigeSha(valeur) {
  if (!estSha(valeur)) throw new ErreurContrat(`SHA invalide : il faut 40 caractères hexadécimaux en minuscules (reçu « ${String(valeur).slice(0, 60)} »)`)
  return valeur
}

/**
 * LF partout, un seul saut de ligne final : la forme que `popote-api` commite (sa CI régénère le
 * fichier). La copie et sa vérification passent par cette forme : la comparaison est donc exacte
 * aux fins de ligne près, et elle l'est au caractère près pour tout le reste.
 */
export function normalise(texte) {
  return texte.replaceAll('\r\n', '\n').replace(/\n*$/, '\n')
}

function valideContrat(texte) {
  let contrat
  try {
    contrat = JSON.parse(texte)
  } catch {
    throw new ErreurContrat('le contrat reçu n’est pas du JSON')
  }
  const version = contrat !== null && typeof contrat === 'object' ? contrat.openapi : undefined
  if (typeof version !== 'string' || !/^3\.1\.\d+$/.test(version)) {
    throw new ErreurContrat(`le contrat reçu n’est pas de l’OpenAPI 3.1 (champ « openapi » : ${JSON.stringify(version)})`)
  }
}

const attends = (ms) => new Promise((fin) => setTimeout(fin, ms))

/**
 * GET avec délai, sans suivre de redirection (l'hôte reste celui de la liste), et trois essais sur
 * coupure réseau, erreur serveur ou limite de débit (403, 429) ; rend la dernière réponse.
 */
async function obtient(url, { fetch, entetes, pauseMs }) {
  let derniere
  for (let essai = 1; essai <= ESSAIS; essai += 1) {
    try {
      derniere = await fetch(url, { headers: entetes, redirect: 'error', signal: AbortSignal.timeout(DELAI_REQUETE_MS) })
      if (derniere.status < 500 && derniere.status !== 403 && derniere.status !== 429) return derniere
    } catch {
      derniere = undefined
    }
    if (essai < ESSAIS) await attends(pauseMs * essai)
  }
  if (derniere && (derniere.status === 403 || derniere.status === 429)) {
    throw new ErreurContrat(`limite de débit ou accès refusé : ${url} (statut ${derniere.status} après ${ESSAIS} essais)`)
  }
  throw new ErreurContrat(`amont injoignable : ${url} (${derniere ? `statut ${derniere.status}` : 'pas de réponse'} après ${ESSAIS} essais)`)
}

async function telecharge(sha, options) {
  const url = `${HOTE_CONTRAT}/${DEPOT}/${exigeSha(sha)}/openapi.json`
  const reponse = await obtient(url, { ...options, entetes: undefined })
  if (!reponse.ok) throw new ErreurContrat(`le contrat de ${sha} est introuvable : statut ${reponse.status}`)
  const annonce = Number(reponse.headers.get('content-length') ?? 0)
  const texte = annonce > TAILLE_MAX ? '' : await reponse.text()
  if (annonce > TAILLE_MAX || new TextEncoder().encode(texte).length > TAILLE_MAX) {
    throw new ErreurContrat('le contrat reçu dépasse 1 Mio : ce n’est pas celui de popote-api')
  }
  valideContrat(texte)
  return normalise(texte)
}

/** `popote-api` fusionne par écrasement : un SHA de branche de demande retirée de `main` resterait servi. */
async function estAncetreDeMain(sha, { fetch, token, pauseMs }) {
  const entetes = { Accept: 'application/vnd.github+json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  // `per_page=1` : seul `status` compte, pas la liste des commits.
  const reponse = await obtient(`${HOTE_API}/repos/${DEPOT}/compare/${exigeSha(sha)}...main?per_page=1`, { fetch, entetes, pauseMs })
  if (reponse.status === 401) return { ok: false, raison: 'le jeton GITHUB_TOKEN est refusé par GitHub (401) : la comparaison avec main est impossible' }
  if (!reponse.ok) return { ok: false, raison: `${sha} n’est pas connu de GitHub comme ancêtre de main (comparaison : statut ${reponse.status})` }
  const { status } = await reponse.json()
  if (status === 'identical' || status === 'ahead') return { ok: true }
  return { ok: false, raison: `${sha} n’est pas un ancêtre de main (comparaison : ${status}) : la copie n’est celle d’aucune version fusionnée` }
}

const executer = promisify(execFile)

async function resoudreMainParGit() {
  let derniere
  for (let essai = 1; essai <= ESSAIS; essai += 1) {
    try {
      const { stdout } = await executer('git', ['ls-remote', `https://github.com/${DEPOT}`, 'refs/heads/main'], { timeout: DELAI_REQUETE_MS })
      return stdout.split(/\s/)[0]
    } catch (erreur) {
      derniere = erreur
      if (essai < ESSAIS) await attends(2000 * essai)
    }
  }
  throw new ErreurContrat(`amont injoignable : git ls-remote a échoué (${derniere?.message ?? 'inconnu'})`)
}

const chemins = (racine) => ({ contrat: join(racine, 'contrat/openapi.json'), amont: join(racine, 'contrat/AMONT') })

function defauts(options) {
  return { fetch: globalThis.fetch, pauseMs: 2000, resoudreMain: resoudreMainParGit, racine: process.cwd(), ...options }
}

/** Écrire à travers un lien symbolique commité modifierait un fichier hors de `contrat/`. */
function refuseLienSymbolique(chemin) {
  let stat
  try {
    stat = lstatSync(chemin)
  } catch {
    return // le fichier n'existe pas encore
  }
  if (stat.isSymbolicLink()) throw new ErreurContrat(`${chemin} est un lien symbolique : refus d'écrire à travers`)
}

/** Copie le contrat de `cible` (un SHA, ou « main ») et écrit son SHA dans `contrat/AMONT`. */
export async function synchronise(cible, options = {}) {
  const o = defauts(options)
  const sha = exigeSha(cible === 'main' ? await o.resoudreMain() : cible)
  const texte = await telecharge(sha, o)
  const { contrat, amont } = chemins(o.racine)
  mkdirSync(dirname(contrat), { recursive: true })
  refuseLienSymbolique(contrat)
  refuseLienSymbolique(amont)
  writeFileSync(contrat, texte)
  writeFileSync(amont, `${sha}\n`)
  return sha
}

/** La copie est celle du SHA de `contrat/AMONT` (aux fins de ligne près, voir `normalise`), et ce SHA est sur `main`. Ne lève pas. */
export async function verifie(options = {}) {
  const o = defauts(options)
  const { contrat, amont } = chemins(o.racine)
  try {
    const sha = readFileSync(amont, 'utf8').trim()
    if (!estSha(sha)) return { ok: false, raison: 'contrat/AMONT ne contient pas un SHA de 40 caractères hexadécimaux' }
    const ancetre = await estAncetreDeMain(sha, o)
    if (!ancetre.ok) return ancetre
    const attendu = await telecharge(sha, o)
    if (readFileSync(contrat, 'utf8') !== attendu) {
      return { ok: false, raison: `contrat/openapi.json n’est pas la copie exacte du contrat de ${sha} : relancer « npm run contrat:sync -- ${sha} » (ou « main ») et commiter` }
    }
    return { ok: true }
  } catch (erreur) {
    if (erreur instanceof ErreurContrat || erreur?.code === 'ENOENT') {
      return { ok: false, raison: erreur.code === 'ENOENT' ? `fichier absent : ${erreur.path}` : erreur.message }
    }
    throw erreur
  }
}

async function lance(argv) {
  const [cible] = argv
  try {
    if (cible === '--verifie') {
      const resultat = await verifie({ token: process.env.GITHUB_TOKEN })
      if (!resultat.ok) throw new ErreurContrat(resultat.raison)
      console.log('contrat/openapi.json est la copie exacte du contrat de AMONT, et AMONT est sur main.')
      return 0
    }
    if (!cible) throw new ErreurContrat('Usage : node scripts/sync-contrat.mjs <sha|main> | --verifie')
    const sha = await synchronise(cible)
    console.log(`contrat/openapi.json copié depuis popote-api@${sha}. Régénérer le client : npm run contrat:genere`)
    return 0
  } catch (erreur) {
    if (!(erreur instanceof ErreurContrat)) throw erreur
    console.error(process.env.GITHUB_ACTIONS ? `::error::${erreur.message}` : erreur.message)
    return 1
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  process.exit(await lance(process.argv.slice(2)))
}
