// Le seul point de contact entre la couche API et les états transverses (réveil, limite, réseau, session) :
// ils s'y abonnent sans toucher à `client.ts`.
export type Evenements = {
  'requete:debut': { id: string; methode: string; chemin: string }
  'requete:fin': { id: string; methode: string; chemin: string; issue: 'reponse' | 'coupure' | 'delai' | 'annulee'; statut?: number }
  limite: { methode: string; chemin: string; retryApresS: number }
  'non-authentifie': { methode: string; chemin: string }
  'reseau:erreur': { methode: string; chemin: string; nature: 'coupure' | 'delai' }
}

type Ecouteur<N extends keyof Evenements> = (donnees: Evenements[N]) => void
type Ecouteurs = { [N in keyof Evenements]: Set<Ecouteur<N>> }

// Une erreur d'abonné ne doit ni faire échouer l'appel qui l'a émise ni rester muette : on la relance hors de l'appel,
// où `window.onerror` (puis le suivi des erreurs) la voit.
const relance = (erreur: unknown) => queueMicrotask(() => { throw erreur })

export function creeEmetteur(signale: (erreur: unknown) => void = relance) {
  const ecouteurs: Ecouteurs = {
    'requete:debut': new Set(),
    'requete:fin': new Set(),
    limite: new Set(),
    'non-authentifie': new Set(),
    'reseau:erreur': new Set(),
  }
  // TypeScript ne relie pas la clé de `ecouteurs` à son type d'écouteur : une seule conversion, ici.
  const de = <N extends keyof Evenements>(nom: N) => ecouteurs[nom] as Set<Ecouteur<N>>
  return {
    sur<N extends keyof Evenements>(nom: N, ecouteur: Ecouteur<N>): () => void {
      // Une enveloppe par abonnement : la même fonction abonnée deux fois reste deux abonnements, que le `Set` ne fusionne pas.
      const abonnement: Ecouteur<N> = (donnees) => ecouteur(donnees)
      de(nom).add(abonnement)
      return () => void de(nom).delete(abonnement)
    },
    emet<N extends keyof Evenements>(nom: N, donnees: Evenements[N]): void {
      for (const ecouteur of [...de(nom)]) {
        try {
          ecouteur(donnees)
        } catch (erreur) {
          signale(erreur)
        }
      }
    },
  }
}

export type Emetteur = ReturnType<typeof creeEmetteur>

export const evenements: Emetteur = creeEmetteur()
