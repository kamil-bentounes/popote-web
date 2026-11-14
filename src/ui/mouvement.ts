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
  jauge: 900, // la transition de `.jauge > i` du système (pas un jeton) : un test la relit dans `composants.css` du système
  remplissage: 600, // l'animation `remplit` du suivi du système (pas un jeton), relue de même
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

export interface MouvementTampon {
  initial: { opacity?: number; rotate?: number; scale?: number }
  animate: { opacity?: number; rotate?: number; scale?: number }
  transition: { duration: number; ease?: Courbe }
}

/**
 * L'arrivée d'un tampon : il vient du néant (échelle nulle), penché à -40 degrés, et se pose à 8 degrés en rebondissant (les
 * `@keyframes tampon` du système, que ceci remplace). Il se pose sans autre retard : c'est le geste qui le déclenche, non un
 * rang d'écran. En mouvement réduit il apparaît seulement ; son inclinaison de repos (8 degrés) est celle de `.tampon`, qui n'est
 * pas un mouvement.
 */
export function variantesTampon(reduit: boolean): MouvementTampon {
  if (reduit) return { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: DUREE_REDUITE } }
  return {
    initial: { rotate: -40, scale: 0 },
    animate: { rotate: 8, scale: 1 },
    transition: { duration: enSecondes(DUREES.entree), ease: COURBES.rebond },
  }
}

export interface MouvementJauge {
  initial: { '--part': string }
  animate: { '--part': string }
  transition: { duration: number; ease?: Courbe }
}

/**
 * Le remplissage d'une jauge : `--part` va de 0 à la part demandée en 0,9 s avec la courbe rebond (la transition de `width` du
 * système, que ceci remplace : Motion sait dire quand elle finit, et c'est alors que les rayures s'arrêtent). `part` est déjà bornée
 * (`borneLaPart`). En mouvement réduit la part est posée en 1 ms, sans courbe qui déborde.
 */
export function variantesJauge(part: number, reduit: boolean): MouvementJauge {
  const initial = { '--part': '0%' }
  const animate = { '--part': `${part}%` }
  if (reduit) return { initial, animate, transition: { duration: DUREE_REDUITE } }
  return { initial, animate, transition: { duration: enSecondes(DUREES.jauge), ease: COURBES.rebond } }
}

export interface MouvementRemplissage {
  initial: { width: string }
  animate: { width: string }
  transition: { duration: number; ease?: Courbe }
}

/** Une étape de suivi qui se remplit, de 0 à 100 % en 0,6 s (les `@keyframes remplit` du système, que ceci remplace). */
export function variantesRemplissage(reduit: boolean): MouvementRemplissage {
  const initial = { width: '0%' }
  const animate = { width: '100%' }
  if (reduit) return { initial, animate, transition: { duration: DUREE_REDUITE } }
  return { initial, animate, transition: { duration: enSecondes(DUREES.remplissage), ease: COURBES.sortie } }
}
