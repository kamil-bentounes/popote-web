import type { ReactNode } from 'react'
import type { Section } from '../section'

const cas = (legende: string, rendu: ReactNode) => ({ legende, rendu })

/**
 * Chaque texte du système sur son fond, dessiné par les classes de `composants.css`. Le test de contraste statique lit une
 * règle à la fois : une règle qui sépare le texte du fond n'y est pas vue. Axe mesure ici ce que Chromium dessine
 * (F7, « Contraste »). Les sections des composants (F9 à F13) montrent les vrais ; celle-ci reste la sonde des classes.
 */
export const section: Section = {
  titre: 'Paires texte et fond',
  cas: [
    cas('Bouton menthe', <button type="button" className="bouton">Continuer</button>),
    cas('Bouton jaune', <button type="button" className="bouton bouton--jaune">Envoyer l’invitation</button>),
    cas('Bouton blanc', <button type="button" className="bouton bouton--blanc">Recevoir un code</button>),
    cas('Bouton danger, blanc sur tomate foncée', <button type="button" className="bouton bouton--danger">Supprimer</button>),
    cas('Bouton désactivé', <button type="button" className="bouton" disabled>Continuer</button>),
    cas('Lien', <button type="button" className="lien">Annuler</button>),
    cas('Lien de danger, erreur sur crème', <button type="button" className="lien lien--danger">Quitter Popote</button>),
    cas('Champ et son aide', (
      <>
        <label className="champ"><span>Ton e-mail</span><input type="email" placeholder="toi@exemple.fr" aria-describedby="aide-paire" /></label>
        <small id="aide-paire">Une aide, en gris sur crème</small>
      </>
    )),
    cas('Champ en erreur', (
      <>
        <label className="champ" data-erreur><span>Ton e-mail</span><input type="email" defaultValue="lea@exemple" aria-invalid="true" aria-describedby="erreur-paire" /></label>
        <small className="erreur" id="erreur-paire" role="alert">Il manque la fin de l’adresse.</small>
      </>
    )),
    cas('Champ désactivé', <label className="champ"><span>Ton prénom</span><input type="text" defaultValue="Léa" disabled /></label>),
    cas('Pastilles', (
      <div className="pastilles">
        <span className="pastille">C’est toi</span><span className="pastille pastille--menthe">Invitée</span>
        <span className="pastille pastille--rose">Mission du soir</span><span className="pastille pastille--lilas">Encore 30 jours</span>
      </div>
    )),
    cas('Tampon', <span className="tampon">Mangé !</span>),
    cas('Cases du code', (
      <div className="cases" data-etat="faux">
        <i>1</i><i>3</i><i>5</i><i>7</i><i>9</i><i>0</i>
      </div>
    )),
    cas('Bulle', <p className="bulle">Bonsoir !</p>),
    cas('Avatars', <div className="pastilles"><span className="avatar">K</span><span className="avatar avatar--menthe">L</span><span className="avatar avatar--libre">+</span></div>),
    cas('Suivi', (
      <div className="suivi">
        <div data-fait><i />Envoyée</div><div data-fait><i />Ouverte</div><div><i />Arrivée</div>
      </div>
    )),
    cas('Bloc et texte doux', <div className="bloc carte"><span>Ce soir, pour vous deux</span><span className="texte-doux">Gris sur papier</span></div>),
  ],
}
