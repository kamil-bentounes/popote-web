import type { components } from './schema'
import { titreDeStatut, erreurs as textes } from '../textes/erreurs'

export type ErreurDeChamp = components['schemas']['ErreurDeChamp']

const RETRY_APRES_MIN_S = 1
// L'API bloque certains codes jusqu'à 24 h : l'écran affiche le vrai temps, pas un plafond (amendement A1 du plan).
const RETRY_APRES_MAX_S = 86_400
const RETRY_APRES_REPLI_S = 10

const SECONDES_ENTIERES = /^\d+$/
// Une date HTTP (IMF-fixdate, RFC 850 ou asctime) commence par un nom de jour : écarte « -5 » ou « 1e3 » que `Date.parse` lirait.
const DATE_HTTP = /^[A-Za-z]{3}/

function borne(secondes: number): number {
  return Math.min(Math.max(Math.ceil(secondes), RETRY_APRES_MIN_S), RETRY_APRES_MAX_S)
}

/** `undefined` : en-tête absent ou illisible. L'API ne pose que des secondes entières ; la date HTTP est tolérée. */
export function lisRetryApres(valeur: string | null, maintenant: () => number = Date.now): number | undefined {
  const texte = valeur?.trim()
  if (!texte) return undefined
  if (SECONDES_ENTIERES.test(texte)) return borne(Number(texte))
  if (!DATE_HTTP.test(texte)) return undefined
  const echeance = Date.parse(texte)
  return Number.isNaN(echeance) ? undefined : borne((echeance - maintenant()) / 1000)
}

/** Une `429` attend toujours un temps : celui de l'API, sinon 10 s. */
export function retryApresDeLimite(response: Response, maintenant?: () => number): number {
  return lisRetryApres(response.headers.get('Retry-After'), maintenant) ?? RETRY_APRES_REPLI_S
}

export type DonneesErreurApi = {
  status: number
  title: string
  type?: string
  code?: string
  detail?: string
  instance?: string
  errors?: readonly ErreurDeChamp[]
  retryApresS?: number
}

/**
 * Une réponse d'erreur de l'API. L'écran choisit son texte d'après `type`, puis la classe de statut ; `detail` et `message`
 * ne sont jamais affichés (amendement A2 du plan), `instance` est la référence qu'on donne à la personne.
 */
export class ErreurApi extends Error {
  override readonly name: string = 'ErreurApi'
  readonly status: number
  readonly title: string
  readonly type?: string
  readonly code?: string
  readonly detail?: string
  readonly instance?: string
  readonly errors?: readonly ErreurDeChamp[]
  readonly retryApresS?: number

  constructor(donnees: DonneesErreurApi, options?: { cause: unknown }) {
    super(`HTTP ${donnees.status}${donnees.code ? ` ${donnees.code}` : ''}`, options)
    this.status = donnees.status
    this.title = donnees.title
    this.type = donnees.type
    this.code = donnees.code
    this.detail = donnees.detail
    this.instance = donnees.instance
    this.errors = donnees.errors
    this.retryApresS = donnees.retryApresS
  }
}

export class TropDeDemandes extends ErreurApi {
  override readonly name: string = 'TropDeDemandes'
  declare readonly retryApresS: number

  constructor(donnees: DonneesErreurApi & { retryApresS: number }) {
    super(donnees)
  }
}

/** Pas de réponse : le réseau est coupé, ou le délai est dépassé. La cause d'origine reste attachée. */
export class ErreurReseau extends Error {
  override readonly name: string = 'ErreurReseau'
  readonly nature: 'coupure' | 'delai'

  constructor(nature: 'coupure' | 'delai', options: { cause: unknown }) {
    super(nature === 'delai' ? textes.delai : textes.reseau, options)
    this.nature = nature
  }
}

const CODE = /^[a-z0-9_]{1,100}$/
const REFERENCE = /^[\w:.-]{1,100}$/
const TEXTE_MAX = 300

const estObjet = (valeur: unknown): valeur is Record<string, unknown> =>
  typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur)

const texteBorne = (valeur: unknown, max = TEXTE_MAX): string | undefined =>
  typeof valeur === 'string' && valeur.length > 0 && valeur.length <= max ? valeur : undefined

const motif = (valeur: unknown, forme: RegExp): string | undefined => {
  const texte = texteBorne(valeur)
  return texte !== undefined && forme.test(texte) ? texte : undefined
}

function lisErreursDeChamp(valeur: unknown): ErreurDeChamp[] | undefined {
  if (!Array.isArray(valeur)) return undefined
  return valeur.slice(0, 100).flatMap((entree: unknown) => {
    if (!estObjet(entree)) return []
    const message = texteBorne(entree.message, 1000)
    if (message === undefined) return []
    const [nom, lieu] = estObjet(entree.parameter) ? [texteBorne(entree.parameter.name), texteBorne(entree.parameter.in)] : []
    const champ: ErreurDeChamp = {
      message,
      pointer: texteBorne(entree.pointer) ?? null,
      parameter: nom !== undefined && lieu !== undefined ? { name: nom, in: lieu } : null,
    }
    return [champ]
  })
}

const estProbleme = (response: Response) =>
  (response.headers.get('Content-Type') ?? '').split(';')[0]?.trim().toLowerCase() === 'application/problem+json'

/**
 * Traduit une réponse non réussie (le corps est celui qu'`openapi-fetch` a lu). Seul un `application/problem+json` objet est
 * repris, champ par champ ; tout autre corps (HTML d'un proxy, texte, vide) devient un titre générique du catalogue, sans
 * jamais garder le texte reçu.
 */
export function depuisReponse(response: Response, corps: unknown, maintenant?: () => number): ErreurApi {
  const status = response.status
  const probleme = estProbleme(response) && estObjet(corps) ? corps : undefined
  const donnees: DonneesErreurApi = {
    status,
    title: texteBorne(probleme?.title) ?? titreDeStatut(status),
    type: texteBorne(probleme?.type),
    code: motif(probleme?.code, CODE),
    detail: texteBorne(probleme?.detail, 1000),
    instance: motif(probleme?.instance, REFERENCE) ?? motif(response.headers.get('X-Request-Id'), REFERENCE),
    errors: lisErreursDeChamp(probleme?.errors),
    retryApresS: lisRetryApres(response.headers.get('Retry-After'), maintenant),
  }
  if (status === 429) return new TropDeDemandes({ ...donnees, retryApresS: retryApresDeLimite(response, maintenant) })
  return new ErreurApi(donnees)
}
