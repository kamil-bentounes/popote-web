import { useId, type InputHTMLAttributes, type Ref } from 'react'
import { classes } from './classes'

export type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'autoComplete' | 'aria-describedby' | 'aria-invalid' | 'className'> & {
  label: string
  /** Dit à la personne et au navigateur ce que le champ attend (WCAG 1.3.5) : `'off'` est un choix, pas un oubli. */
  autoComplete: NonNullable<InputHTMLAttributes<HTMLInputElement>['autoComplete']>
  aide?: string
  /** Le message d'erreur : il dit quoi faire, et prend la place de l'aide comme description du champ. */
  erreur?: string
  /** Pour le conteneur (`.champ`), non pour l'`input`. */
  className?: string
  ref?: Ref<HTMLInputElement>
}

/**
 * Le champ du système (`.champ`) : un libellé, le champ, puis une aide ou une erreur. L'aide est HORS du `<label>` (sinon elle
 * entrerait dans le nom du champ) et le relie par `aria-describedby` ; l'erreur ajoute `aria-invalid` et s'annonce.
 */
export function Field({ label, aide, erreur: messageErreur, className, ref, ...reste }: FieldProps) {
  const identifiant = useId()
  // Une erreur vide n'est pas une erreur : elle ne poserait qu'une alerte muette et un champ « invalide » sans raison.
  const erreur = messageErreur === '' ? undefined : messageErreur
  const message = erreur ?? aide
  const idMessage = `${identifiant}-message`
  return (
    <div className={classes('champ', className)} data-erreur={erreur === undefined ? undefined : ''}>
      <label htmlFor={identifiant}>{label}</label>
      <input
        {...reste}
        ref={ref}
        id={identifiant}
        aria-invalid={erreur === undefined ? undefined : true}
        aria-describedby={message === undefined ? undefined : idMessage}
      />
      {message !== undefined && (
        // `key` : l'erreur est un NOUVEAU nœud. Un `role="alert"` ajouté à l'aide déjà affichée ne serait pas fiablement annoncé.
        <small key={erreur === undefined ? 'aide' : 'erreur'} id={idMessage} role={erreur === undefined ? undefined : 'alert'}>
          {message}
        </small>
      )}
    </div>
  )
}
