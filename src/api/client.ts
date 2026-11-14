import createOpenApiClient, { type Middleware } from 'openapi-fetch'
import { ErreurReseau, retryApresDeLimite } from './erreurs'
import { evenements, type Emetteur } from './evenements'
import type { paths } from './schema'

// Le relais coupe à 30 s et l'API répond avant, à 25 s : on attend un peu plus pour recevoir leur réponse plutôt que couper avant eux.
const DELAI_MS = 35_000

type Options = {
  /** L'API est sur la même origine que la page : un seul build pour l'essai et la prod. */
  baseUrl?: string
  fetch?: (requete: Request) => Promise<Response>
  delaiMs?: number
  emetteur?: Emetteur
}

const estDelai = (erreur: unknown) => typeof erreur === 'object' && erreur !== null && 'name' in erreur && erreur.name === 'TimeoutError'

function avecDelai(base: Options['fetch'], delaiMs: number): (requete: Request) => Promise<Response> {
  return (requete) =>
    (base ?? globalThis.fetch)(new Request(requete, { signal: AbortSignal.any([requete.signal, AbortSignal.timeout(delaiMs)]) }))
}

function creeIntergiciel(emetteur: Emetteur): Middleware {
  return {
    onRequest({ request, schemaPath, id }) {
      emetteur.emet('requete:debut', { id, methode: request.method, chemin: schemaPath })
    },
    onResponse({ request, response, schemaPath, id }) {
      const route = { methode: request.method, chemin: schemaPath }
      emetteur.emet('requete:fin', { id, ...route, issue: 'reponse', statut: response.status })
      if (response.status === 429) emetteur.emet('limite', { ...route, retryApresS: retryApresDeLimite(response) })
      if (response.status === 401) emetteur.emet('non-authentifie', route)
    },
    onError({ request, error, schemaPath, id }) {
      const route = { methode: request.method, chemin: schemaPath }
      // Une annulation demandée par l'appelant n'est pas une panne : elle remonte telle quelle, sans `reseau:erreur`.
      if (request.signal.aborted) {
        emetteur.emet('requete:fin', { id, ...route, issue: 'annulee' })
        return undefined
      }
      const nature = estDelai(error) ? 'delai' : 'coupure'
      emetteur.emet('requete:fin', { id, ...route, issue: nature })
      emetteur.emet('reseau:erreur', { ...route, nature })
      return new ErreurReseau(nature, { cause: error })
    },
  }
}

/** Le client du contrat : les en-têtes que l'API exige et les événements des états transverses sont posés ici, une fois. */
export function creeClient({ baseUrl, fetch, delaiMs = DELAI_MS, emetteur = evenements }: Options = {}) {
  const client = createOpenApiClient<paths>({
    baseUrl: baseUrl ?? location.origin,
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'X-Popote-Client': 'web' },
    fetch: avecDelai(fetch, delaiMs),
  })
  client.use(creeIntergiciel(emetteur))
  return client
}

/** Le client de l'appli ; les tests créent le leur. */
export const client = creeClient()
