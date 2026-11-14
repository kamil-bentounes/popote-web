import { EcranReveil } from './EcranReveil'

/**
 * Le lieu des états transverses (réveil, réseau, session expirée), HORS de `#coque` : quand l'écran de réveil rend la coque
 * `inert`, ces écrans doivent rester atteignables. F21 y ajoute sa ligne.
 */
export function Transverses() {
  return (
    <div id="transverses">
      <EcranReveil />
    </div>
  )
}
