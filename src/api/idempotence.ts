/**
 * Une clé d'idempotence neuve : une chaîne de champ structuré (RFC 9651), donc entre guillemets (`normes-api.md` § 3.5).
 * Les routes qui l'exigent la déclarent dans le contrat : `openapi-fetch` la rend obligatoire au type.
 * Une reprise d'un même envoi rejoue la même clé : c'est à l'appelant de la garder.
 */
export function nouvelleCle(uuid: () => string = () => crypto.randomUUID()): string {
  return `"${uuid()}"`
}
