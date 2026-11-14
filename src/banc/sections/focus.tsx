import type { Section } from '../section'

/**
 * Chaque contrôle de couleur du système, avec la classe qui lui pose son anneau de focus (encre de 4 px cerné de jaune).
 * `e2e/banc.base.spec.ts` y passe au clavier et mesure l'anneau dessiné par Chromium : un test de feuille de style ne voit
 * pas qu'une règle de couche supérieure ou un `box-shadow` d'un autre composant le recouvre.
 */
export const section: Section = {
  titre: 'Anneaux de focus',
  cas: [
    { legende: 'Bouton', rendu: <button type="button" className="bouton">Continuer</button> },
    { legende: 'Champ', rendu: <div className="champ"><label htmlFor="champ-focus">Ton e-mail</label><input id="champ-focus" type="email" /></div> },
    { legende: 'Lien', rendu: <button type="button" className="lien">Annuler</button> },
    {
      legende: 'Cases du code',
      // Le vrai champ de F11 est réel et caché ; ici un `input` caché porte le focus que `.cases:focus-within` suit.
      rendu: (
        <div className="cases">
          <input className="sr-seul" aria-label="Code à 6 chiffres" inputMode="numeric" />
          <i aria-hidden="true">4</i><i aria-hidden="true">8</i><i aria-hidden="true" />
        </div>
      ),
    },
    { legende: 'Avatar', rendu: <button type="button" className="avatar avatar--menthe" aria-label="Léa">L</button> },
    { legende: 'Place libre', rendu: <button type="button" className="avatar avatar--libre" aria-label="Inviter quelqu’un">+</button> },
  ],
}
