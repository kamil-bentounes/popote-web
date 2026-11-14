import { COURBES, DUREES } from '../ui/mouvement'

/** Un mouvement réduit apparaît et s'efface, il ne se déplace pas (même règle que `ui/mouvement.ts`) : l'opacité seule, en 1 ms. */
const DUREE_REDUITE_S = 0.001

/** L'écran de réveil fond à l'entrée ; à la sortie il monte en s'effaçant, et ne retient plus les clics pendant qu'il part. */
export function variantesEcran(reduit: boolean) {
  if (reduit) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0, pointerEvents: 'none' as const },
      transition: { duration: DUREE_REDUITE_S },
    }
  }
  return {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0, y: -48, pointerEvents: 'none' as const },
    transition: { duration: DUREES.ecran / 1000, ease: COURBES.sortie },
  }
}
