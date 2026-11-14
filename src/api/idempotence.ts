/** Une clé d'idempotence fabriquée par `nouvelleCle` : une simple chaîne ne passe pas (le type de marque la refuse). */
export type CleIdempotence = string & { readonly __cleIdempotence: unique symbol }

// Chaîne RFC 9651 : entre guillemets, ASCII imprimable sans guillemet ni contre-barre, 255 caractères au plus (la description
// du contrat : « 1 à 255 caractères »).
const FORME = /^"[ !#-[\]-~]{1,253}"$/

export const estCleIdempotence = (valeur: unknown): valeur is CleIdempotence => typeof valeur === 'string' && FORME.test(valeur)

/**
 * Une clé d'idempotence neuve : une chaîne de champ structuré (RFC 9651), donc entre guillemets (`normes-api.md` § 3.5).
 * Les routes qui l'exigent la déclarent dans le contrat : `openapi-fetch` la rend obligatoire au type.
 * Une reprise d'un même envoi rejoue la même clé : c'est à l'appelant de la garder.
 */
export function nouvelleCle(uuid: () => string = () => crypto.randomUUID()): CleIdempotence {
  return `"${uuid()}"` as CleIdempotence
}
