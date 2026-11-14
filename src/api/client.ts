import createOpenApiClient, { type Middleware } from 'openapi-fetch'
import { ErreurReseau, retryApresDeLimite } from './erreurs'
import { evenements, type Emetteur } from './evenements'
import type { paths } from './schema'

// Le relais coupe à 30 s et l'API répond avant, à 25 s : on attend un peu plus pour recevoir leur réponse plutôt que couper avant eux.
// Une route plus lente (appel au modèle) aura son client, avec son `delaiMs`.
const DELAI_MS = 35_000

type Options = {
  /** L'API est sur la même origine que la page : un seul build pour l'essai et la prod. */
  baseUrl?: string
  fetch?: (requete: Request) => Promise<Response>
  delaiMs?: number
  emetteur?: Emetteur
}

/**
 * Borne la requête dans le temps, et lit le corps avant de rendre la réponse : une coupure ou un délai pendant cette lecture est
 * alors une erreur du `fetch` (donc de `onError`, typée), non une erreur brute levée plus tard par `response.json()`.
 * Les signaux sont chaînés à la main : `AbortSignal.any` manque avant Chrome 116 et Safari 17.4, et `fetch` ne rend pas
 * toujours `TimeoutError` pour un signal expiré, d'où l'indicateur `delaiDepasse`.
 */
function avecDelai(base: Options['fetch'], delaiMs: number): (requete: Request) => Promise<Response> {
  return async (requete) => {
    const controle = new AbortController()
    let delaiDepasse = false
    const relayeAnnulation = () => controle.abort(requete.signal.reason)
    if (requete.signal.aborted) relayeAnnulation()
    else requete.signal.addEventListener('abort', relayeAnnulation, { once: true })
    const minuteur = setTimeout(() => {
      delaiDepasse = true
      controle.abort(new DOMException('Délai dépassé', 'TimeoutError'))
    }, delaiMs)
    try {
      const reponse = await (base ?? globalThis.fetch)(new Request(requete, { signal: controle.signal }))
      const octets = await reponse.arrayBuffer()
      // Un corps vide reste `null` : `204` et `304` n'admettent pas de corps.
      return new Response(octets.byteLength > 0 ? octets : null, { status: reponse.status, statusText: reponse.statusText, headers: reponse.headers })
    } catch (cause) {
      if (delaiDepasse && !requete.signal.aborted) throw new ErreurReseau('delai', { cause })
      throw cause
    } finally {
      clearTimeout(minuteur)
      requete.signal.removeEventListener('abort', relayeAnnulation)
    }
  }
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
      const erreurReseau = error instanceof ErreurReseau ? error : new ErreurReseau('coupure', { cause: error })
      emetteur.emet('requete:fin', { id, ...route, issue: erreurReseau.nature })
      emetteur.emet('reseau:erreur', { ...route, nature: erreurReseau.nature })
      return erreurReseau
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
