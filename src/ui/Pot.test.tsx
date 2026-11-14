import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { verifieAxe } from '../test/axe'
import { annonces } from '../textes/marmite'
import { ETATS_MARMITE, type EtatMarmite } from './etatsMarmite'
import { Pot } from './Pot'

const marmiteDe = (conteneur: HTMLElement) => conteneur.querySelector('.marmite') as HTMLElement

describe('Pot', () => {
  describe('ce qu’elle est pour un lecteur d’écran', () => {
    it('est décorative par défaut : cachée, sans rôle, sans nom', () => {
      const { container } = render(<Pot etat="repos" />)
      const marmite = marmiteDe(container)
      expect(marmite).toHaveAttribute('aria-hidden', 'true')
      expect(marmite).not.toHaveAttribute('role')
      expect(marmite).not.toHaveAttribute('aria-label')
      expect(screen.queryByRole('img')).toBeNull()
    })

    it('avec `nom`, devient une image nommée, visible des lecteurs d’écran', () => {
      const { container } = render(<Pot etat="repos" nom="Popote, la petite marmite" />)
      expect(screen.getByRole('img', { name: 'Popote, la petite marmite' })).toBe(marmiteDe(container))
      expect(marmiteDe(container)).not.toHaveAttribute('aria-hidden')
    })

    it('ne se touche pas : ni gestionnaire, ni `tabindex`, ni rôle passés à la main', async () => {
      const clic = vi.fn<() => void>()
      const { container } = render(<Pot etat="repos" {...({ onClick: clic, tabIndex: 0, role: 'button' } as object)} />)
      await userEvent.setup().click(marmiteDe(container))
      expect(clic).not.toHaveBeenCalled()
      expect(marmiteDe(container)).not.toHaveAttribute('tabindex')
      expect(marmiteDe(container)).not.toHaveAttribute('role')
    })

    it('a un SVG qui n’entre ni dans l’ordre du clavier ni dans l’arbre d’accessibilité à lui seul', () => {
      const { container } = render(<Pot etat="repos" />)
      const svg = container.querySelector('svg')!
      expect(svg).toHaveAttribute('focusable', 'false')
      expect(svg).not.toHaveAttribute('role')
    })
  })

  describe('les sept états', () => {
    it.each(ETATS_MARMITE)('pose data-etat="%s"', (etat) => {
      const { container } = render(<Pot etat={etat} />)
      expect(marmiteDe(container)).toHaveAttribute('data-etat', etat)
    })

    it('compte exactement les sept états du système', () => {
      expect([...ETATS_MARMITE]).toEqual(['repos', 'sommeil', 'ecoute', 'reflexion', 'parole', 'joie', 'inquiet'])
    })

    it('retombe sur `repos` pour une valeur inconnue', () => {
      const { container } = render(<Pot etat={'colere' as EtatMarmite} />)
      expect(marmiteDe(container)).toHaveAttribute('data-etat', 'repos')
    })

    it('ne retombe pas sur `repos` pour un nom hérité de Object (`constructor`)', () => {
      const { container } = render(<Pot etat={'constructor' as EtatMarmite} />)
      expect(marmiteDe(container)).toHaveAttribute('data-etat', 'repos')
    })

    it('change d’état au rendu suivant, dans le même nœud', () => {
      const { container, rerender } = render(<Pot etat="repos" />)
      const marmite = marmiteDe(container)
      rerender(<Pot etat="ecoute" />)
      expect(marmiteDe(container)).toBe(marmite)
      expect(marmite).toHaveAttribute('data-etat', 'ecoute')
    })

    it('dessine toutes les parties dont les sept états se servent', () => {
      const { container } = render(<Pot etat="repos" />)
      const parties = ['vapeur', 'zzz', 'ondes', 'yeux', 'pupilles', 'dodo', 'joie', 'bouche', 'bouche-ouverte', 'goutte', 'couvercle']
      expect(parties.filter((partie) => container.querySelector(`.marmite .${partie}`) === null)).toEqual([])
    })
  })

  describe('le dessin', () => {
    it('ne porte aucune couleur écrite en dur ni aucun attribut `style` : tout passe par des classes qui lisent les jetons', () => {
      const { container } = render(<Pot etat="repos" />)
      expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b/i)
      expect(container.innerHTML).not.toMatch(/\bstyle=/)
      expect(container.innerHTML).not.toMatch(/rgb\(|hsl\(/i)
    })
  })

  describe('l’annonce, à la demande seulement', () => {
    it('par défaut, ne rend aucune région : un écran d’état n’a que la sienne', () => {
      render(<Pot etat="sommeil" />)
      expect(screen.queryByRole('status')).toBeNull()
    })

    it('`annonce={false}` ne rend pas de région non plus', () => {
      render(<Pot etat="sommeil" annonce={false} />)
      expect(screen.queryByRole('status')).toBeNull()
    })

    it('avec `annonce`, la région existe dès le premier rendu, vide, même dans un état qui parle', () => {
      // `renderToString` ne lance aucun effet : c'est le premier rendu, avant que le texte puisse arriver.
      const sansRegion = ETATS_MARMITE.filter((etat) => !renderToString(<Pot etat={etat} annonce />).includes('<output class="sr-seul"></output>'))
      expect(sansRegion).toEqual([])
    })

    it('n’a qu’une région `status`', () => {
      render(<Pot etat="repos" annonce />)
      expect(screen.getAllByRole('status')).toHaveLength(1)
      expect(screen.getByRole('status')).toBeEmptyDOMElement()
    })

    it('met à jour le même nœud avec la phrase du catalogue quand l’état change', () => {
      const { rerender } = render(<Pot etat="repos" annonce />)
      const region = screen.getByRole('status')
      rerender(<Pot etat="sommeil" annonce />)
      expect(screen.getByRole('status')).toBe(region)
      expect(region).toHaveTextContent('Popote se réveille, ça prend quelques secondes.')
    })

    it('même montée dans un état qui parle, la région est d’abord vide puis reçoit sa phrase (c’est ce qui l’annonce)', () => {
      // `render` de Testing Library vide les effets : on vérifie que la phrase arrive bien APRÈS le montage, par la région déjà là.
      const { container } = render(<Pot etat="sommeil" annonce />)
      expect(container.querySelector('output')).toHaveTextContent(annonces.sommeil)
    })

    it.each(ETATS_MARMITE.filter((e) => e !== 'repos'))('dit une phrase pour `%s`', (etat) => {
      render(<Pot etat={etat} annonce />)
      expect(screen.getByRole('status')).toHaveTextContent(annonces[etat])
      expect(annonces[etat].length).toBeGreaterThan(5)
    })

    it('a une phrase différente par état : une permutation du catalogue ne passe pas inaperçue', () => {
      const phrases = ETATS_MARMITE.filter((e) => e !== 'repos').map((e) => annonces[e])
      expect(new Set(phrases).size).toBe(6)
      expect(annonces.repos).toBe('')
    })

    it('ne dit rien au repos', () => {
      render(<Pot etat="repos" annonce />)
      expect(screen.getByRole('status')).toBeEmptyDOMElement()
    })

    it('`annonce="…"` remplace la phrase du catalogue', () => {
      render(<Pot etat="sommeil" annonce="Un instant, Popote se réveille." />)
      expect(screen.getByRole('status')).toHaveTextContent('Un instant, Popote se réveille.')
      expect(screen.getByRole('status')).not.toHaveTextContent(annonces.sommeil)
    })

    it('ne dit rien au repos, même avec une phrase à elle (« repos : rien »)', () => {
      render(<Pot etat="repos" annonce="Un instant." />)
      expect(screen.getByRole('status')).toBeEmptyDOMElement()
    })

    it('la région n’est pas dans la marmite cachée (sinon les lecteurs d’écran ne la liraient jamais)', () => {
      const { container } = render(<Pot etat="sommeil" annonce />)
      expect(marmiteDe(container).contains(screen.getByRole('status'))).toBe(false)
      expect(screen.getByRole('status').closest('[aria-hidden=true]')).toBeNull()
    })

    it('la région est du texte pour lecteurs d’écran seulement (`sr-seul`)', () => {
      render(<Pot etat="sommeil" annonce />)
      expect(screen.getByRole('status')).toHaveClass('sr-seul')
    })
  })

  describe('la joie', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('retombe sur `repos` après `joieMs`, et appelle `onJoieFinie` une seule fois', () => {
      const finie = vi.fn<() => void>()
      const { container } = render(<Pot etat="joie" joieMs={1400} onJoieFinie={finie} />)
      expect(marmiteDe(container)).toHaveAttribute('data-etat', 'joie')
      act(() => void vi.advanceTimersByTime(1399))
      expect(marmiteDe(container)).toHaveAttribute('data-etat', 'joie')
      expect(finie).not.toHaveBeenCalled()
      act(() => void vi.advanceTimersByTime(1))
      expect(marmiteDe(container)).toHaveAttribute('data-etat', 'repos')
      act(() => void vi.advanceTimersByTime(10_000))
      expect(finie).toHaveBeenCalledTimes(1)
    })

    it('dure 1 400 ms par défaut', () => {
      const { container } = render(<Pot etat="joie" />)
      act(() => void vi.advanceTimersByTime(1399))
      expect(marmiteDe(container)).toHaveAttribute('data-etat', 'joie')
      act(() => void vi.advanceTimersByTime(1))
      expect(marmiteDe(container)).toHaveAttribute('data-etat', 'repos')
    })

    it('ne retombe jamais avec `joieMs={Infinity}` (le banc fige la joie pour la comparer ; `setTimeout(Infinity)` partirait aussitôt)', () => {
      const finie = vi.fn<() => void>()
      const { container } = render(<Pot etat="joie" joieMs={Infinity} onJoieFinie={finie} />)
      act(() => void vi.advanceTimersByTime(60_000))
      expect(marmiteDe(container)).toHaveAttribute('data-etat', 'joie')
      expect(finie).not.toHaveBeenCalled()
      expect(vi.getTimerCount()).toBe(0)
    })

    it('n’appelle pas `onJoieFinie` une seconde fois quand `joieMs` change après la fin (le parent garde `etat="joie"`)', () => {
      const finie = vi.fn<() => void>()
      const { rerender } = render(<Pot etat="joie" joieMs={100} onJoieFinie={finie} />)
      act(() => void vi.advanceTimersByTime(100))
      rerender(<Pot etat="joie" joieMs={200} onJoieFinie={finie} />)
      act(() => void vi.advanceTimersByTime(1000))
      expect(finie).toHaveBeenCalledTimes(1)
    })

    it('relance le compte quand `joieMs` change en cours de joie', () => {
      const finie = vi.fn<() => void>()
      const { container, rerender } = render(<Pot etat="joie" joieMs={100} onJoieFinie={finie} />)
      act(() => void vi.advanceTimersByTime(60))
      rerender(<Pot etat="joie" joieMs={200} onJoieFinie={finie} />)
      act(() => void vi.advanceTimersByTime(199))
      expect(marmiteDe(container)).toHaveAttribute('data-etat', 'joie')
      act(() => void vi.advanceTimersByTime(1))
      expect(marmiteDe(container)).toHaveAttribute('data-etat', 'repos')
      expect(finie).toHaveBeenCalledTimes(1)
    })

    it('prend la durée par défaut pour `NaN`', () => {
      const { container } = render(<Pot etat="joie" joieMs={NaN} />)
      act(() => void vi.advanceTimersByTime(1399))
      expect(marmiteDe(container)).toHaveAttribute('data-etat', 'joie')
      act(() => void vi.advanceTimersByTime(1))
      expect(marmiteDe(container)).toHaveAttribute('data-etat', 'repos')
    })

    it('ramène un négatif à 0 et un excès de 2^31 ms au délai maximal du minuteur (au lieu d’un départ aussitôt)', () => {
      const { container: negatif } = render(<Pot etat="joie" joieMs={-5} />)
      act(() => void vi.advanceTimersByTime(1))
      expect(marmiteDe(negatif)).toHaveAttribute('data-etat', 'repos')
      const { container: enorme } = render(<Pot etat="joie" joieMs={2 ** 40} />)
      act(() => void vi.advanceTimersByTime(60_000))
      expect(marmiteDe(enorme)).toHaveAttribute('data-etat', 'joie')
      act(() => void vi.advanceTimersByTime(2 ** 31))
      expect(marmiteDe(enorme)).toHaveAttribute('data-etat', 'repos')
    })

    it('ne retombe pas si l’état change avant la fin, et n’appelle alors rien', () => {
      const finie = vi.fn<() => void>()
      const { container, rerender } = render(<Pot etat="joie" onJoieFinie={finie} />)
      act(() => void vi.advanceTimersByTime(500))
      rerender(<Pot etat="ecoute" onJoieFinie={finie} />)
      act(() => void vi.advanceTimersByTime(5000))
      expect(marmiteDe(container)).toHaveAttribute('data-etat', 'ecoute')
      expect(finie).not.toHaveBeenCalled()
    })

    it('rejoue la joie quand l’état revient à `joie` après un autre', () => {
      const finie = vi.fn<() => void>()
      const { container, rerender } = render(<Pot etat="joie" joieMs={100} onJoieFinie={finie} />)
      act(() => void vi.advanceTimersByTime(100))
      rerender(<Pot etat="repos" joieMs={100} onJoieFinie={finie} />)
      rerender(<Pot etat="joie" joieMs={100} onJoieFinie={finie} />)
      expect(marmiteDe(container)).toHaveAttribute('data-etat', 'joie')
      act(() => void vi.advanceTimersByTime(100))
      expect(marmiteDe(container)).toHaveAttribute('data-etat', 'repos')
      expect(finie).toHaveBeenCalledTimes(2)
    })

    it('appelle le `onJoieFinie` le plus récent (celui du dernier rendu)', () => {
      const ancien = vi.fn<() => void>()
      const recent = vi.fn<() => void>()
      const { rerender } = render(<Pot etat="joie" onJoieFinie={ancien} />)
      rerender(<Pot etat="joie" onJoieFinie={recent} />)
      act(() => void vi.advanceTimersByTime(1400))
      expect(ancien).not.toHaveBeenCalled()
      expect(recent).toHaveBeenCalledTimes(1)
    })

    it('ne laisse aucun minuteur derrière elle quand elle disparaît', () => {
      const finie = vi.fn<() => void>()
      const { unmount } = render(<Pot etat="joie" onJoieFinie={finie} />)
      unmount()
      expect(vi.getTimerCount()).toBe(0)
      act(() => void vi.advanceTimersByTime(5000))
      expect(finie).not.toHaveBeenCalled()
    })

    it('retire la phrase de joie de la région quand elle retombe au repos', () => {
      render(<Pot etat="joie" annonce />)
      expect(screen.getByRole('status')).toHaveTextContent(annonces.joie)
      act(() => void vi.advanceTimersByTime(1400))
      expect(screen.getByRole('status')).toBeEmptyDOMElement()
    })
  })

  it('n’a aucune violation axe (décorative, nommée, avec annonce)', async () => {
    const { container } = render(
      <>
        <Pot etat="repos" />
        <Pot etat="inquiet" nom="Popote s’inquiète" />
        <Pot etat="sommeil" annonce />
      </>,
    )
    expect(await verifieAxe(container)).toEqual([])
  })
})
