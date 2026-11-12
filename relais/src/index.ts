/**
 * Le relais de notre-popote.fr (spec § 2) : sert les fichiers du front avec les en-têtes de sécurité, et
 * transmet /api/* au conteneur de l'API avec l'en-tête secret et l'adresse IP vue par Cloudflare.
 */
export interface Env {
  ASSETS: Fetcher
  API_ORIGIN: string
  RELAY_SECRET: string
  /** `report-only` tant que le front parle encore à Supabase en direct (jusqu'au jour J). */
  CSP_MODE: 'enforce' | 'report-only'
  CSP: string
}

/** Au-delà, l'amont est tenu pour injoignable : un Worker n'a sinon aucune borne à ses appels. */
const DELAI_AMONT_MS = 30_000

const SECURITE: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(self), microphone=(), geolocation=(), payment=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/')) return relaie(request, url, env)
    const fichier = await env.ASSETS.fetch(request)
    const reponse = new Response(fichier.body, fichier)
    for (const [k, v] of Object.entries(SECURITE)) reponse.headers.set(k, v)
    reponse.headers.set(env.CSP_MODE === 'enforce' ? 'Content-Security-Policy'
      : 'Content-Security-Policy-Report-Only', env.CSP)
    return reponse
  },
}

async function relaie(request: Request, url: URL, env: Env): Promise<Response> {
  // Sans secret, l'amont refuserait de toute façon : on ne l'appelle pas (échec fermé).
  if (!env.RELAY_SECRET) {
    console.error('relais : RELAY_SECRET absent de la configuration')
    return amontIndisponible()
  }
  // Le chemin déjà normalisé par `URL` (`..` résolus) est posé sur l'origine configurée : la cible ne
  // peut sortir ni de l'hôte ni du préfixe /api/.
  const cible = new URL(env.API_ORIGIN)
  cible.pathname = url.pathname
  cible.search = url.search
  const entetes = new Headers(request.headers)
  entetes.delete('host')
  // Écrasés quoi que le client ait envoyé : c'est ce qui les rend dignes de confiance côté API.
  entetes.set('X-Popote-Relais', env.RELAY_SECRET)
  entetes.set('X-Popote-IP', request.headers.get('CF-Connecting-IP') ?? '')
  let amont: Response
  try {
    amont = await fetch(cible, {
      method: request.method,
      headers: entetes,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      redirect: 'manual',
      signal: AbortSignal.timeout(DELAI_AMONT_MS),
    })
  } catch (erreur) {
    // Seulement le type de l'erreur : jamais l'URL, ni l'en-tête secret, ni un message de l'amont.
    console.error('relais : amont injoignable', erreur instanceof Error ? erreur.name : 'inconnue')
    return amontIndisponible()
  }
  // Sur le réseau de Cloudflare, un amont injoignable (DNS, connexion refusée, délai) ne fait PAS échouer
  // `fetch` : il rend la page d'erreur de Cloudflare en 520-530, qui nomme l'hôte. L'API n'émet jamais ces
  // codes ; on les remplace par la même 502 que l'échec de `fetch`.
  if (amont.status >= 520 && amont.status <= 530) {
    await amont.body?.cancel()
    console.error('relais : amont refusé par Cloudflare', amont.status)
    return amontIndisponible()
  }
  const reponse = new Response(amont.body, amont)
  if (!reponse.headers.has('Cache-Control')) reponse.headers.set('Cache-Control', 'no-store')
  return reponse
}

/** La 502 rendue quand l'API ne répond pas : un corps `problem+json` sans détail technique. */
function amontIndisponible(): Response {
  const corps = {
    type: 'about:blank',
    title: 'Popote ne peut pas joindre son serveur pour le moment. Réessaie dans un instant.',
    status: 502,
    code: 'api_indisponible',
  }
  return new Response(JSON.stringify(corps), {
    status: 502,
    headers: {
      'Content-Type': 'application/problem+json',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
