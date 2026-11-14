// Titres de repli d'une erreur dont le corps n'est pas lisible (page d'un proxy, texte, vide) ou d'un échec sans réponse.
// Ce ne sont pas les phrases des écrans : F18 à F21 possèdent celles des états communs (réveil, réseau, `429`, `5xx`,
// session) et F19 choisit la phrase d'après `type`, puis la classe de statut.
export const erreurs = {
  reseau: 'Popote ne joint pas le réseau pour le moment.',
  delai: 'Popote met trop de temps à répondre.',
  serveur: 'Popote a un souci de son côté.',
  inattendu: 'Quelque chose ne s’est pas passé comme prévu.',
} as const

export function titreDeStatut(statut: number): string {
  if (statut === 408 || statut === 504) return erreurs.delai
  return statut >= 500 ? erreurs.serveur : erreurs.inattendu
}
