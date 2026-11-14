import { useSyncExternalStore } from 'react'
import { evenements, type Emetteur, type Evenements } from '../api/evenements'

/*
 * La machine à états du réveil : l'API sort de veille (5 à 7 s), l'écran de F18b se montre pendant ce temps. Aucune interface ici :
 * elle écoute les événements des requêtes (F5a) et dit quand l'écran existe, quelle phrase il porte, et quand il s'efface.
 *
 * Une requête qui n'a pas de réponse au bout de `SEUIL_MS` ouvre l'écran, mais seulement si l'API n'a répondu à personne depuis
 * `INACTIVITE_MS` : une veille de conteneur suit une inactivité, alors qu'une photo ou une réponse de l'assistant lentes, juste
 * après une autre réponse, ne sont pas une veille.
 */

/** Une requête sans réponse au bout de ce temps (ms) peut être une veille. */
export const SEUIL_MS = 2_000
/** L'API n'a répondu à personne depuis ce temps (ms) : seule une API restée seule assez longtemps s'endort. */
export const INACTIVITE_MS = 5 * 60_000
/** L'écran reste au moins ce temps (ms) une fois ouvert : pas de clignotement. */
export const AFFICHAGE_MIN_MS = 1_200
/** « Prêt » reste affiché au moins ce temps (ms) : le temps de l'annoncer et de le lire. */
export const PRET_MS = 700
/** Les instants (ms après l'ouverture de l'écran) où la phrase change : début, 3 s, 6 s, puis 12 s (« plus long que d'habitude »). */
export const PALIERS_MS = [0, 3_000, 6_000, 12_000] as const

export type Palier = 0 | 1 | 2 | 3

export type EtatReveil =
  | { phase: 'repos' }
  /** L'écran est affiché ; `palier` est l'index de la phrase dans `PALIERS_MS`. */
  | { phase: 'reveil'; palier: Palier }
  /** L'API a répondu : l'écran le dit (« C'est prêt »), puis s'efface. */
  | { phase: 'pret' }

const REPOS: EtatReveil = { phase: 'repos' }

/** Ces statuts viennent du relais ou de l'hébergeur quand l'API ne répond pas : ils ne prouvent pas qu'elle est éveillée. */
const STATUTS_DE_RELAIS = new Set([502, 503, 504])

type Minuteur = ReturnType<typeof setTimeout>

interface Options {
  emetteur?: Emetteur
  /** Hors ligne, une requête lente n'est pas une veille : la couche réseau (F21a) en parle. */
  enLigne?: () => boolean
}

export function creeReveil({ emetteur = evenements, enLigne = () => navigator.onLine }: Options = {}) {
  let etat: EtatReveil = REPOS
  const abonnes = new Set<() => void>()
  // Les requêtes en vol : leur minuteur de seuil tant qu'il court, `null` une fois sonné.
  const enVol = new Map<string, Minuteur | null>()
  let derniereReponse: number | null = null
  let ouvertA = 0
  let minuteursPaliers: Minuteur[] = []
  let minuteurSortie: Minuteur | undefined
  let desabonnements: (() => void)[] = []

  const change = (suivant: EtatReveil) => {
    etat = suivant
    for (const abonne of [...abonnes]) {
      // Un abonné qui lève ne doit pas laisser la machine à mi-chemin (un « prêt » sans sortie programmée resterait à l'écran) :
      // l'erreur est relancée hors de l'appel, où `window.onerror` la voit, comme pour l'émetteur.
      try {
        abonne()
      } catch (erreur) {
        queueMicrotask(() => {
          throw erreur
        })
      }
    }
  }

  const arreteAffichage = () => {
    minuteursPaliers.forEach(clearTimeout)
    minuteursPaliers = []
    clearTimeout(minuteurSortie)
    minuteurSortie = undefined
  }

  const efface = () => {
    arreteAffichage()
    change(REPOS)
    // Une requête qui attendait déjà quand l'écran s'est fermé (sur l'échec d'une autre) n'a plus d'écran : son seuil repart,
    // pour que l'écran revienne si l'API dort encore, au lieu de la laisser attendre sans rien dire.
    for (const [id, minuteur] of enVol) if (minuteur === null) enVol.set(id, setTimeout(() => seuilAtteint(id), SEUIL_MS))
  }

  const ouvre = () => {
    ouvertA = performance.now()
    change({ phase: 'reveil', palier: 0 })
    PALIERS_MS.forEach((retard, palier) => {
      if (palier === 0) return
      minuteursPaliers.push(
        setTimeout(() => {
          if (etat.phase === 'reveil') change({ phase: 'reveil', palier: palier as Palier })
        }, retard),
      )
    })
  }

  const seuilAtteint = (id: string) => {
    if (!enVol.has(id)) return
    enVol.set(id, null)
    if (etat.phase !== 'repos' || !enLigne()) return
    if (derniereReponse !== null && Date.now() - derniereReponse < INACTIVITE_MS) return
    ouvre()
  }

  /** Programme la sortie `apres` ms plus tard au plus tôt ; au minimum quand l'écran a été affiché `AFFICHAGE_MIN_MS`. */
  const programmeSortie = (apres: number) => {
    const reste = Math.max(apres, ouvertA + AFFICHAGE_MIN_MS - performance.now())
    clearTimeout(minuteurSortie)
    if (reste <= 0) return efface()
    minuteurSortie = setTimeout(efface, reste)
  }

  const termine = (reussi: boolean) => {
    if (reussi) {
      change({ phase: 'pret' })
      programmeSortie(PRET_MS)
    } else {
      programmeSortie(0)
    }
  }

  const debut = ({ id }: Evenements['requete:debut']) => {
    if (enVol.has(id)) return
    enVol.set(id, setTimeout(() => seuilAtteint(id), SEUIL_MS))
  }

  const fin = ({ id, issue, statut }: Evenements['requete:fin']) => {
    const minuteur = enVol.get(id)
    if (minuteur) clearTimeout(minuteur)
    enVol.delete(id)

    const aRepondu = issue === 'reponse' && statut !== undefined && !STATUTS_DE_RELAIS.has(statut)
    if (aRepondu) derniereReponse = Date.now()
    if (etat.phase !== 'reveil') return

    if (issue === 'annulee') {
      // Une annulation n'est pas une panne : l'écran attend les requêtes restantes, et part s'il n'en reste aucune.
      if (enVol.size === 0) termine(false)
      return
    }
    // Un 500 est une réponse de l'API (elle est éveillée) mais pas un « prêt » : la frontière d'erreur va parler.
    termine(aRepondu && statut !== undefined && statut < 500)
  }

  return {
    lis: () => etat,
    abonne(abonne: () => void): () => void {
      abonnes.add(abonne)
      return () => void abonnes.delete(abonne)
    },
    /** S'abonne aux événements des requêtes. À appeler avant le premier rendu : la garde de session lance déjà une requête. */
    demarre(): () => void {
      if (desabonnements.length === 0) {
        desabonnements = [emetteur.sur('requete:debut', debut), emetteur.sur('requete:fin', fin)]
      }
      return () => {
        desabonnements.forEach((desabonne) => desabonne())
        desabonnements = []
        enVol.forEach((minuteur) => minuteur && clearTimeout(minuteur))
        enVol.clear()
        derniereReponse = null
        arreteAffichage()
        if (etat !== REPOS) change(REPOS)
      }
    },
  }
}

export type Reveil = ReturnType<typeof creeReveil>

/** La machine de l'appli ; les tests créent la leur. */
export const reveil: Reveil = creeReveil()

export function useReveil(magasin: Reveil = reveil): EtatReveil {
  return useSyncExternalStore(magasin.abonne, magasin.lis)
}
