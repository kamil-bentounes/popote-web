import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { verifieAxe } from '../test/axe'
import { EffectList, EffectRow } from './EffectRow'

const trois = (
  <EffectList>
    <EffectRow sens="perd">Tes objectifs <b>disparaissent</b>.</EffectRow>
    <EffectRow sens="reste">Léa <b>garde</b> le frigo.</EffectRow>
    <EffectRow sens="change">Elle est <b>prévenue</b>.</EffectRow>
  </EffectList>
)

describe('EffectRow', () => {
  it('est un élément de liste du système, avec son `data-sens`', () => {
    render(trois)
    const lignes = screen.getAllByRole('listitem')
    expect(lignes.map((li) => li.getAttribute('data-sens'))).toEqual(['perd', 'reste', 'change'])
    for (const ligne of lignes) expect(ligne).toHaveClass('effet')
  })

  it('lit un préfixe avant la phrase : le sens ne tient pas à la couleur ni au dessin', () => {
    render(trois)
    const [perd, reste, change] = screen.getAllByRole('listitem')
    expect(perd).toHaveTextContent('Disparaît : Tes objectifs disparaissent.')
    expect(reste).toHaveTextContent('Reste : Léa garde le frigo.')
    expect(change).toHaveTextContent('Change : Elle est prévenue.')
    // Le préfixe est réservé aux lecteurs d'écran.
    expect(perd!.querySelector('.sr-seul')).toHaveTextContent('Disparaît :')
  })

  it('montre une icône SVG par sens, de forme différente, cachée des lecteurs d’écran', () => {
    render(trois)
    const traces = screen.getAllByRole('listitem').map((li) => {
      const svg = li.querySelector('i > svg')!
      expect(svg).toHaveAttribute('aria-hidden', 'true')
      expect(li.querySelector('i')).toHaveAttribute('aria-hidden', 'true')
      return svg.querySelector('path')!.getAttribute('d')
    })
    expect(new Set(traces).size).toBe(3)
  })

  it('n’emprunte aucun glyphe de police (croix, coche, flèche) : le dessin est un SVG', () => {
    render(trois)
    expect(document.body.textContent).not.toMatch(/[✕✓✔→⟶➜]/)
  })

  it('ne se touche pas', async () => {
    const user = userEvent.setup()
    render(<><EffectList><EffectRow sens="reste">Léa garde le frigo.</EffectRow></EffectList><button type="button">Après</button></>)
    await user.tab()
    expect(screen.getByRole('button', { name: 'Après' })).toHaveFocus()
  })

  it('refuse un sens inconnu : au type, et à l’exécution par une erreur (une ligne sans signe ni préfixe n’aurait aucun sens)', () => {
    const silence = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    // @ts-expect-error un sens hors de perd, reste, change
    expect(() => render(<EffectList><EffectRow sens="autre">Non</EffectRow></EffectList>)).toThrow(RangeError)
    // `toString` est sur tout objet : le sens ne se cherche pas dans la chaîne de prototypes.
    // @ts-expect-error idem
    expect(() => render(<EffectList><EffectRow sens="toString">Non</EffectRow></EffectList>)).toThrow(RangeError)
    silence.mockRestore()
  })

  it('refuse par le type un gestionnaire, et retire à l’exécution ce qui rendrait la ligne touchable', () => {
    const glisse = { role: 'button', tabIndex: 0, onClick: () => undefined } as object
    render(<EffectList><EffectRow sens="reste" {...glisse}>Oui</EffectRow></EffectList>)
    const ligne = screen.getByText('Oui', { exact: false }).closest('li')!
    expect(ligne).not.toHaveAttribute('role')
    expect(ligne).not.toHaveAttribute('tabindex')
  })

  it('laisse passer `className` et les attributs de données', () => {
    render(<EffectList className="mb-2" data-liste="oui"><EffectRow sens="reste" className="p-2" data-exemple="oui">Oui</EffectRow></EffectList>)
    expect(screen.getByRole('list')).toHaveClass('bloc', 'mb-2')
    expect(screen.getByRole('list')).toHaveAttribute('data-liste', 'oui')
    expect(screen.getByRole('listitem')).toHaveClass('effet', 'p-2')
    expect(screen.getByRole('listitem')).toHaveAttribute('data-exemple', 'oui')
  })

  it('n’a aucune violation axe', async () => {
    const { container } = render(trois)
    expect(await verifieAxe(container)).toEqual([])
  })
})
