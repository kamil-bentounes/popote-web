import type { ButtonHTMLAttributes, MouseEvent, Ref } from 'react'
import { classes } from './classes'

export type ButtonVariant = 'principal' | 'jaune' | 'blanc' | 'danger'

const CLASSE_DE: Record<ButtonVariant, string | undefined> = {
  principal: undefined,
  jaune: 'bouton--jaune',
  blanc: 'bouton--blanc',
  danger: 'bouton--danger',
}

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'aria-busy' | 'aria-disabled'> & {
  variant?: ButtonVariant
  size?: 'normal' | 'petit'
  /** Un envoi est en cours : le rond tourne, plus rien ne part. Le nom du bouton ne change pas. */
  busy?: boolean
  /**
   * Le bouton attend (le compte à rebours de « Trop de demandes ») : même garde qu'occupé, sans rond. Rien d'autre ne dit
   * l'attente : le libellé de l'appelant dit pourquoi et jusqu'à quand (« Renvoyer dans 30 s »).
   */
  pause?: boolean
  /** `button` par défaut ; `submit` pour le bouton d'envoi d'un formulaire. `reset` n'est pas offert. */
  type?: 'button' | 'submit'
  /** Pour rendre le focus au bouton (React 19 : `ref` est une prop que le type doit déclarer). */
  ref?: Ref<HTMLButtonElement>
}

/**
 * Le bouton du système (`.bouton`). Occupé ou en pause, il reste focalisable (le focus ne saute pas) mais n'agit plus :
 * `aria-busy` seul n'empêche ni Entrée ni Espace de relancer l'action, d'où `aria-disabled` et la garde du clic, qui retient
 * aussi l'envoi d'un formulaire. Désactivé (`disabled`) quitte au contraire l'ordre du clavier. La garde ne couvre que `onClick` :
 * un `onKeyDown` ou un `onPointerDown` de l'appelant tournerait encore, et un parent cliquable recevrait le clic retenu (et, occupé, `pointer-events: none` du système laisse le clic
 * à l'élément dessous).
 */
export function Button({ variant = 'principal', size = 'normal', busy = false, pause = false, type = 'button', className, onClick, ...reste }: ButtonProps) {
  const retenu = busy || pause
  const auClic = (evenement: MouseEvent<HTMLButtonElement>) => {
    if (retenu) {
      evenement.preventDefault()
      return
    }
    onClick?.(evenement)
  }
  return (
    <button
      {...reste}
      type={type}
      className={classes('bouton', CLASSE_DE[variant], size === 'petit' && 'bouton--petit', className)}
      aria-busy={busy || undefined}
      aria-disabled={retenu || undefined}
      onClick={auClic}
    />
  )
}
