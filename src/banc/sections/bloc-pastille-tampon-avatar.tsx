import type { Section } from '../section'
import { Avatar } from '../../ui/Avatar'
import { Badge } from '../../ui/Badge'
import { Block } from '../../ui/Block'

/**
 * La section « Bloc, pastille, tampon, avatar » de `reference.html`. F12 porte le bloc, les pastilles et les avatars ; les
 * trois autres légendes de la section sont déclarées : la jauge, le suivi et la ligne d'effet (F13), le bloc avec son tampon (F14,
 * dans son propre fichier `tampon.tsx`, qui retire la déclaration).
 */
export const section: Section = {
  reference: 'Bloc, pastille, tampon, avatar',
  reportees: ['Bloc avec pastilles et tampon', 'Jauges', 'Suivi', 'Lignes d’effet'],
  cas: [
    // Sans pendant : le même bloc que celui de la référence, sans son tampon (le tampon est celui de F14).
    {
      legende: 'Bloc avec pastilles, sans le tampon',
      rendu: (
        <Block className="carte">
          <small className="texte-doux">Ce soir, pour vous deux</small>
          <div className="titre carte-titre">Lasagnes saumon-poireaux</div>
          <div className="pastilles">
            <Badge>512 kcal</Badge>
            <Badge tone="menthe">42 g prot.</Badge>
          </div>
        </Block>
      ),
    },
    {
      legende: 'Pastilles',
      reference: 'Pastilles',
      rendu: (
        <div className="pastilles">
          <Badge>C’est toi</Badge>
          <Badge tone="menthe">Invitée</Badge>
          <Badge tone="rose">Mission du soir</Badge>
          <Badge tone="lilas">Encore 30 jours</Badge>
        </div>
      ),
    },
    {
      legende: 'Avatars : deux personnes, une place libre',
      reference: 'Avatars : deux personnes, une place libre',
      rendu: (
        <div className="avatars">
          <Avatar name="Sam" letter="S" />
          <Avatar name="Léa" letter="L" tone="menthe" />
          <Avatar free />
        </div>
      ),
    },
  ],
}
