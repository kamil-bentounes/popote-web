import { Ground } from '../ui/Ground'
import { Sun, type SunVariant } from '../ui/Sun'

/**
 * Une scène de décor : le soleil, le sol, un titre et une note posés sur le sol (positionné après le soleil, donc au-dessus de lui).
 * Jamais de texte sur le dégradé du soleil : axe n'en tranche pas le contraste. La marge `.scene--sonde` est obligatoire : le soleil
 * de 700 px déborde de sa scène, et axe lirait « recouvert » le texte voisin.
 */
export function SceneDeDecor({ variant, fond, titre, note }: { variant?: SunVariant; fond?: string; titre: string; note: string }) {
  return (
    <div className={`scene scene--sonde ${fond ?? ''}`} data-decor={variant ?? 'jaune'}>
      <Sun variant={variant} />
      <Ground className="top-[190px]" />
      <div className="absolute inset-x-[18px] top-[214px] text-center">
        <span className="titre carte-titre">{titre}</span>
        <p className="texte-doux m-0 text-note">{note}</p>
      </div>
    </div>
  )
}
