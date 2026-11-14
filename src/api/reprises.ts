import type { UseMutationOptions } from '@tanstack/react-query'
import { ErreurApi, ErreurReseau } from './erreurs'
import { estCleIdempotence, type CleIdempotence } from './idempotence'

const REPRISES_MAX = 2
const ATTENTE_MAX_MS = 10_000
const RECUL_MAX_MS = 5_000
const STATUTS_DE_REPRISE: ReadonlySet<number> = new Set([502, 503, 504])

/**
 * Vrai pour ce qu'un nouvel essai peut guérir : le réseau coupé, le délai dépassé, un amont absent (502, 503, 504), au plus
 * deux fois. Jamais pour un 4xx (la même demande donnerait la même réponse ; une 429 a son écran), ni pour une annulation.
 * `nombre` est le nombre d'échecs déjà essuyés, comme dans `retry` de TanStack Query (0 au premier).
 */
export function reessaie(nombre: number, erreur: Error): boolean {
  if (nombre >= REPRISES_MAX) return false
  if (erreur instanceof ErreurReseau) return true
  return erreur instanceof ErreurApi && STATUTS_DE_REPRISE.has(erreur.status)
}

/** Le `Retry-After` de l'API quand elle en donne un (10 s au plus), sinon 1 s, 2 s, 4 s… sans dépasser 5 s. */
export function delaiDeReprise(nombre: number, erreur: Error): number {
  if (erreur instanceof ErreurApi && erreur.retryApresS !== undefined) return Math.min(erreur.retryApresS * 1000, ATTENTE_MAX_MS)
  return Math.min(1000 * 2 ** nombre, RECUL_MAX_MS)
}

/**
 * Les réglages d'une écriture qui peut être rejouée sans refaire son effet. La clé d'idempotence est dans les VARIABLES :
 * TanStack Query rejoue la fonction avec les mêmes variables, donc la même clé, à chaque reprise (et quand une écriture faite
 * hors ligne attend le retour du réseau). Elle ne doit jamais naître dans `mutationFn`, qui en changerait à chaque essai.
 * La clé est typée (`CleIdempotence`, de `nouvelleCle()`) et vérifiée à l'exécution : sans clé bien formée, l'écriture ne part pas (faute
 * de programmation, pas panne).
 */
export function optionsEcriture<Variables extends { cle: CleIdempotence }, Donnees>(
  ecris: (variables: Variables) => Promise<Donnees>,
): UseMutationOptions<Donnees, Error, Variables> {
  return {
    mutationFn: (variables) => {
      if (!estCleIdempotence(variables.cle)) {
        return Promise.reject(new TypeError('une écriture rejouable porte une clé d’idempotence entre guillemets dans ses variables'))
      }
      return ecris(variables)
    },
    retry: reessaie,
  }
}
