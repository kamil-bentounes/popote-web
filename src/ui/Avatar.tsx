import type { HTMLAttributes } from 'react'
import { composants } from '../textes/composants'
import { classes } from './classes'
import { sansInteraction, type Interactif } from './nonInteractif'

type Attributs = Omit<HTMLAttributes<HTMLSpanElement>, Interactif | 'aria-label' | 'aria-labelledby' | 'children'>

export type AvatarProps = Attributs & (
  | {
      /** Le prénom, que lit un lecteur d'écran : la lettre n'est que le dessin. */
      name: string
      letter: string
      tone?: 'jaune' | 'menthe'
      free?: false
    }
  | {
      /** Une place libre du foyer : un signe, jamais une lettre. */
      free: true
      /** Ce que la place propose (« Inviter quelqu'un ») ; « Place libre » par défaut. */
      name?: string
      letter?: never
      tone?: never
    }
)

/**
 * L'avatar du système (`.avatar`) : une personne du foyer ou une place libre. Une image nommée (`role="img"`, `aria-label`) : la
 * lettre posée dedans est présentationnelle, d'où le nom obligatoire. Il ne se touche pas : un avatar qu'on choisit sera un bouton qui
 * le contient (le halo de focus de `composants.css` l'attend déjà).
 */
export function Avatar({ name, letter, tone = 'jaune', free = false, className, ...reste }: AvatarProps) {
  return (
    <span
      {...sansInteraction(reste)}
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- une lettre ou un signe, pas une image : un `<img>` ne la contiendrait pas
      role="img"
      // Le nom se pose ici, jamais ailleurs : un `aria-labelledby` glissé par un appelant l'emporterait sur `aria-label` (JSX ne vérifie pas les attributs à trait d'union).
      aria-labelledby={undefined}
      // Une place libre se nomme « Place libre » à défaut ; une personne SANS nom (appelant en JavaScript) ne prend pas ce nom-là.
      aria-label={free ? name || composants.placeLibre : name}
      className={classes('avatar', !free && tone === 'menthe' && 'avatar--menthe', free && 'avatar--libre', className)}
    >
      {free ? composants.signePlaceLibre : letter}
    </span>
  )
}
