import type { Section } from '../section'

/**
 * Le lien d'évitement de la coque, sur une scène qui monte un `.soleil` de 700 px : sans son `z-index`, le décor, positionné
 * et placé après lui, le recouvrirait (constat de F7). `e2e/banc.base.spec.ts` le prouve avec `elementFromPoint`.
 */
export const section: Section = {
  titre: 'Lien d’évitement',
  cas: [
    {
      legende: 'Au clavier, au-dessus du soleil',
      rendu: (
        <div className="scene scene--sonde" id="scene-evitement" style={{ position: 'relative', height: 220 }}>
          <a className="evitement" href="#cible-evitement" id="lien-evitement">Aller au contenu</a>
          <div className="soleil" aria-hidden="true" />
          <p id="cible-evitement" tabIndex={-1} style={{ position: 'relative', margin: '120px 18px 0' }}>Le contenu de la page.</p>
        </div>
      ),
    },
  ],
}
