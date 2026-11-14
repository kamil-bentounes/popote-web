import type { Section } from '../section'
import { Avatar } from '../../ui/Avatar'
import { Badge } from '../../ui/Badge'
import { Block } from '../../ui/Block'
import { Stamp } from '../../ui/Stamp'

/**
 * La section « Bloc, pastille, tampon, avatar » de `reference.html`. F12 porte les pastilles et les avatars, F14b le bloc avec son
 * tampon ; les trois autres légendes de la section sont déclarées : la jauge, le suivi et la ligne d'effet (F13). Le tampon qui
 * arrive, rejouable, est dans `tampon.tsx`.
 */
export const section: Section = {
  reference: 'Bloc, pastille, tampon, avatar',
  reportees: ['Jauges', 'Suivi', 'Lignes d’effet'],
  cas: [
    {
      legende: 'Bloc avec pastilles et tampon',
      reference: 'Bloc avec pastilles et tampon',
      rendu: (
        // Les pastilles sont en ligne, séparées d'une espace, comme dans la référence (et non en `.pastilles`, une rangée flex) : la hauteur du bloc en dépend.
        <Block className="relative p-4">
          <Stamp className="absolute right-[10px] top-[-16px]">Mangé !</Stamp>
          <small className="texte-doux">Ce soir, pour vous deux</small>
          <div className="titre carte-titre">Lasagnes saumon-poireaux</div>
          <Badge>512 kcal</Badge> <Badge tone="menthe">42 g prot.</Badge>
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
