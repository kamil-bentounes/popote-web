import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { verifieAxe } from '../test/axe'
import { Button } from './Button'
import { Field } from './Field'

describe('Field', () => {
  it('retrouve le champ par son libellé, et son nom ne contient pas l’aide (revue 11)', () => {
    render(<Field label="Ton e-mail" aide="Un code part vers cette adresse." type="email" autoComplete="email" />)
    const champ = screen.getByLabelText('Ton e-mail')
    expect(champ.tagName).toBe('INPUT')
    expect(screen.getByRole('textbox', { name: 'Ton e-mail' })).toBe(champ)
  })

  it('relie l’aide au champ par aria-describedby : l’aide est sa description, hors du libellé', () => {
    render(<Field label="Ton e-mail" aide="Un code part vers cette adresse." autoComplete="email" />)
    const champ = screen.getByLabelText('Ton e-mail')
    expect(champ).toHaveAccessibleDescription('Un code part vers cette adresse.')
    const aide = screen.getByText('Un code part vers cette adresse.')
    expect(aide.tagName).toBe('SMALL')
    expect(aide.closest('label')).toBeNull()
    expect(champ).not.toHaveAttribute('aria-invalid')
    expect(screen.queryByRole('alert')).toBeNull() // une aide seule n'est pas une alerte
  })

  it('l’erreur ajoute aria-invalid, remplace l’aide comme description, s’annonce et pose data-erreur', () => {
    render(<Field label="Ton e-mail" aide="Un code part vers cette adresse." erreur="Il manque la fin de l’adresse." autoComplete="email" />)
    const champ = screen.getByLabelText('Ton e-mail')
    expect(champ).toHaveAttribute('aria-invalid', 'true')
    expect(champ).toHaveAccessibleDescription('Il manque la fin de l’adresse.')
    expect(screen.queryByText('Un code part vers cette adresse.')).toBeNull()
    expect(screen.getByRole('alert')).toHaveTextContent('Il manque la fin de l’adresse.')
    expect(champ.closest('.champ')).toHaveAttribute('data-erreur')
  })

  it('l’erreur qui arrive sur un champ qui avait une aide est un NOUVEAU nœud `alert` (un rôle ajouté après coup à un nœud existant n’est pas fiable)', () => {
    const { rerender } = render(<Field label="Ton e-mail" aide="Un code part vers cette adresse." autoComplete="email" />)
    const aide = screen.getByText('Un code part vers cette adresse.')
    rerender(<Field label="Ton e-mail" aide="Un code part vers cette adresse." erreur="Il manque la fin de l’adresse." autoComplete="email" />)
    const alerte = screen.getByRole('alert')
    expect(alerte).toHaveTextContent('Il manque la fin de l’adresse.')
    expect(alerte).not.toBe(aide)
    expect(screen.getByLabelText('Ton e-mail')).toHaveAccessibleDescription('Il manque la fin de l’adresse.')
  })

  it('une erreur vide n’est pas une erreur : ni aria-invalid, ni data-erreur, ni alerte vide', () => {
    render(<Field label="Ton e-mail" aide="Aide" erreur="" autoComplete="email" />)
    const champ = screen.getByLabelText('Ton e-mail')
    expect(champ).not.toHaveAttribute('aria-invalid')
    expect(champ.closest('.champ')).not.toHaveAttribute('data-erreur')
    expect(screen.queryByRole('alert')).toBeNull()
    expect(champ).toHaveAccessibleDescription('Aide')
  })

  it('sans aide ni erreur : aucune description, aucun data-erreur, aucun aria-describedby', () => {
    render(<Field label="Ton prénom" autoComplete="given-name" />)
    const champ = screen.getByLabelText('Ton prénom')
    expect(champ).not.toHaveAttribute('aria-describedby')
    expect(champ).not.toHaveAttribute('aria-invalid')
    expect(champ.closest('.champ')).not.toHaveAttribute('data-erreur')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('deux champs ont deux identifiants distincts, chacun relié à sa propre aide', () => {
    render(<><Field label="Ton e-mail" aide="Aide un" autoComplete="email" /><Field label="Ton prénom" aide="Aide deux" autoComplete="given-name" /></>)
    expect(screen.getByLabelText('Ton e-mail')).toHaveAccessibleDescription('Aide un')
    expect(screen.getByLabelText('Ton prénom')).toHaveAccessibleDescription('Aide deux')
  })

  it('passe le reste des attributs à l’input (type, valeur, désactivé) et className au conteneur', () => {
    render(<Field label="Ton prénom" autoComplete="given-name" defaultValue="Léa" disabled className="mt-4" />)
    const champ = screen.getByLabelText('Ton prénom')
    expect(champ).toBeDisabled()
    expect(champ).toHaveValue('Léa')
    expect(champ.closest('.champ')).toHaveClass('champ', 'mt-4')
  })

  it('pose autocomplete (WCAG 1.3.5) et le refuse de ne pas être dit : le type l’exige', () => {
    // @ts-expect-error `autoComplete` est obligatoire : un champ qui recueille une donnée de la personne dit ce qu'il attend
    render(<Field label="Ton e-mail" />)
    render(<Field label="Ton nom" autoComplete="name" />)
    expect(screen.getByLabelText('Ton nom')).toHaveAttribute('autocomplete', 'name')
  })

  it('passe la ref de l’input', () => {
    let ref: HTMLInputElement | null = null
    render(<Field label="Ton e-mail" autoComplete="email" ref={(noeud) => { ref = noeud }} />)
    expect(ref).toBe(screen.getByLabelText('Ton e-mail'))
  })

  it('suit le clavier : Tab va du champ au bouton, et on y écrit', async () => {
    const user = userEvent.setup()
    render(<><Field label="Ton e-mail" autoComplete="email" /><Button>Continuer</Button></>)
    await user.tab()
    expect(screen.getByLabelText('Ton e-mail')).toHaveFocus()
    await user.keyboard('lea@exemple.fr')
    expect(screen.getByLabelText('Ton e-mail')).toHaveValue('lea@exemple.fr')
    await user.tab()
    expect(screen.getByRole('button', { name: 'Continuer' })).toHaveFocus()
  })

  it.each([
    ['au repos, avec une aide', <Field key="a" label="Ton e-mail" aide="Aide" type="email" autoComplete="email" />],
    ['en erreur', <Field key="b" label="Ton e-mail" erreur="Il manque la fin." type="email" autoComplete="email" defaultValue="lea@exemple" />],
    ['désactivé', <Field key="c" label="Ton prénom" autoComplete="given-name" defaultValue="Léa" disabled />],
  ])('axe ne trouve rien (%s)', async (_nom, champ) => {
    const { container } = render(champ)
    expect(await verifieAxe(container)).toEqual([])
  })
})
