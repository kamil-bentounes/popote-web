/*
 * La politique de mouvement de l'appli, écrite une fois (D11 du plan) : les durées et les courbes des jetons, et ce que
 * chaque mouvement devient quand la personne demande moins de mouvement. Des fonctions pures, testées : un composant animé
 * n'invente ni durée, ni courbe, ni règle de mouvement réduit.
 *
 * Pourquoi la règle de mouvement réduit est la nôtre : `MotionConfig reducedMotion` ne coupe que les transformations (`y`,
 * `scale`, `rotate`), jamais l'opacité. Le système veut « plus de rotation ni de saut » mais garde l'apparition, en 1 ms.
 */

/** Les durées des jetons de `jetons.css`, en millisecondes. Un test les compare au fichier : un jeton retouché seul échoue. */
export const DUREES = {
  entree: 550, // `--duree-entree` : un élément qui rebondit en place
  decalageEntree: 70, // `--decalage-entree` : l'écart entre deux éléments d'un écran
  ecran: 500, // `--duree-ecran` : un écran ou une feuille qui monte
  appui: 90, // `--duree-appui` : un bouton qui s'enfonce
} as const

/** Les courbes des jetons, au format de Motion (quatre nombres d'une Bézier cubique). */
export const COURBES = {
  rebond: [0.34, 1.56, 0.64, 1], // `--ease-rebond`
  sortie: [0.22, 1, 0.36, 1], // `--ease-sortie`
} as const

/** Au-delà de ce rang, les éléments arrivent ensemble : une longue liste ne fait pas attendre sa fin (630 ms de retard au plus). */
export const RANG_MAX = 9

/** Un mouvement réduit apparaît, il ne se déplace pas : l'opacité seule, en 1 ms (le système coupe ses animations à 1 ms aussi). */
const DUREE_REDUITE = 0.001

const enSecondes = (millisecondes: number): number => millisecondes / 1000

type Courbe = readonly [number, number, number, number]

export interface MouvementEntree {
  initial: { opacity: number; y?: number; scale?: number }
  animate: { opacity: number; y?: number; scale?: number }
  transition: { duration: number; delay: number; ease?: Courbe }
}

/**
 * L'entrée d'un élément d'écran : il monte en rebondissant, `rang` × 70 ms après le premier, qui n'attend pas (un élément qui
 * part de l'opacité nulle retarde le LCP : le rang 0 est celui qui porte le plus gros contenu).
 */
export function variantesEntree(rang: number, reduit: boolean): MouvementEntree {
  if (!Number.isInteger(rang) || rang < 0) throw new RangeError(`rang d'entrée invalide : ${rang}`)
  if (reduit) {
    return { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: DUREE_REDUITE, delay: 0 } }
  }
  return {
    initial: { opacity: 0, y: 36, scale: 0.92 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: {
      duration: enSecondes(DUREES.entree),
      // Le produit se fait en millisecondes entières : 3 × 0,07 vaudrait 0,21000000000000002.
      delay: enSecondes(Math.min(rang, RANG_MAX) * DUREES.decalageEntree),
      ease: COURBES.rebond,
    },
  }
}
