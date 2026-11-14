import { erreurs as textes } from '../textes/erreurs'
import { depuisReponse, ErreurApi } from './erreurs'

type Resultat<Donnees> = { data?: Donnees; error?: unknown; response: Response }

// openapi-fetch lève un `SyntaxError` quand une réponse réussie n'est pas du JSON (page d'un proxy ou d'un portail) : aucune
// réponse exploitable, donc le statut 0, et le texte reçu n'est pas gardé. Le reste (réseau, annulation) a déjà son type.
async function attends<Donnees>(promesse: Promise<Resultat<Donnees>>): Promise<Resultat<Donnees>> {
  try {
    return await promesse
  } catch (cause) {
    if (cause instanceof SyntaxError) throw new ErreurApi({ status: 0, title: textes.inattendu }, { cause })
    throw cause
  }
}

/** Rend les données d'un appel du client, ou lève l'erreur typée (`ErreurApi`, `TropDeDemandes`, `ErreurReseau`). */
export async function lit<Donnees>(promesse: Promise<Resultat<Donnees>>): Promise<Donnees> {
  const { data, error, response } = await attends(promesse)
  if (!response.ok) throw depuisReponse(response, error)
  if (data === undefined) throw new ErreurApi({ status: response.status, title: textes.inattendu })
  return data
}

/** Comme `lit`, pour une route sans corps de réponse : une `204` est un succès. */
export async function litVide(promesse: Promise<Resultat<undefined>>): Promise<void> {
  const { error, response } = await attends(promesse)
  if (!response.ok) throw depuisReponse(response, error)
}
