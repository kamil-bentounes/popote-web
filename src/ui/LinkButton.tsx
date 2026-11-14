import type { ButtonHTMLAttributes, Ref } from 'react'
import { classes } from './classes'

export type LinkButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & {
  variant?: 'normal' | 'danger'
  ref?: Ref<HTMLButtonElement>
}

/** Un geste en forme de lien (`.lien`) : une ACTION, donc un bouton. Un lien qui change de page reste un `<Link>` du routeur. */
export function LinkButton({ variant = 'normal', className, ...reste }: LinkButtonProps) {
  return <button {...reste} type="button" className={classes('lien', variant === 'danger' && 'lien--danger', className)} />
}
