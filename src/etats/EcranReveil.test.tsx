import { act, render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { creeEmetteur, type Evenements } from '../api/evenements'
import { verifieAxe } from '../test/axe'
import { annonces, reveil as textes } from '../textes/reveil'
import { MotionProvider } from '../ui/MotionProvider'
import { EcranReveil } from './EcranReveil'
import { AFFICHAGE_MIN_MS, creeReveil, PALIERS_MS, PRET_MS, SEUIL_MS, useReveil, type Reveil } from './reveil'

beforeEach(() => vi.useFakeTimers({ now: new Date('2026-11-14T10:00:00Z') }))
afterEach(() => vi.useRealTimers())

/** Ce que `routes/__root.tsx` fait de la coque : inerte tant que l'écran de réveil est là. */
function Coque({ magasin }: { magasin: Reveil }) {
  const { phase } = useReveil(magasin)
  return (
    <>
      <div id="coque" inert={phase !== 'repos'}>
        <button type="button">Avant le réveil</button>
        <main id="contenu" tabIndex={-1}>
          <a href="/x">Un lien</a>
        </main>
      </div>
      <div id="transverses">
        <EcranReveil magasin={magasin} />
      </div>
    </>
  )
}

function monte(enLigne = true) {
  const emetteur = creeEmetteur()
  const magasin = creeReveil({ emetteur, enLigne: () => enLigne })
  const arrete = magasin.demarre()
  const rendu = render(
    <StrictMode>
      <MotionProvider reduit>
        <Coque magasin={magasin} />
      </MotionProvider>
    </StrictMode>,
  )
  const debut = (id: string) => emetteur.emet('requete:debut', { id, methode: 'GET', chemin: '/api/v1/me' })
  const fin = (id: string, reste: Partial<Evenements['requete:fin']> = {}) =>
    emetteur.emet('requete:fin', { id, methode: 'GET', chemin: '/api/v1/me', issue: 'reponse', statut: 200, ...reste })
  const avance = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)))
  return { magasin, arrete, rendu, debut: (id: string) => act(() => debut(id)), fin: (id: string, reste?: Partial<Evenements['requete:fin']>) => act(() => fin(id, reste)), avance }
}

const titre = () => screen.queryByRole('heading', { level: 1, name: textes.titre })
const coque = () => document.getElementById('coque')!

/** Ouvre l'écran : une requête qui dépasse le seuil. */
async function ouvre(essai: ReturnType<typeof monte>, id = 'a') {
  await essai.debut(id)
  await essai.avance(SEUIL_MS)
}

describe('EcranReveil', () => {
  it('ne montre rien au repos, et ne pose aucune région status', () => {
    monte()
    expect(titre()).toBeNull()
    expect(screen.queryAllByRole('status')).toHaveLength(0)
    expect(coque()).not.toHaveAttribute('inert')
  })

  it('n’apparaît jamais quand la réponse arrive avant le seuil', async () => {
    const essai = monte()
    await essai.debut('a')
    await essai.avance(SEUIL_MS - 100)
    await essai.fin('a')
    await essai.avance(10_000)
    expect(titre()).toBeNull()
  })

  it('apparaît à 2 s : la marmite dort, le titre a le focus, la coque est inerte', async () => {
    const essai = monte()
    await ouvre(essai)
    const heading = titre()!
    expect(heading).toHaveFocus()
    expect(heading).toHaveAttribute('tabindex', '-1')
    expect(document.querySelector('.marmite')).toHaveAttribute('data-etat', 'sommeil')
    expect(screen.getByText(textes.phrases[0])).toBeInTheDocument()
    expect(coque()).toHaveAttribute('inert')
  })

  it('vit hors de #coque, dans le lieu des états transverses', async () => {
    const essai = monte()
    await ouvre(essai)
    expect(coque()).not.toContainElement(titre())
    expect(document.getElementById('transverses')).toContainElement(titre())
  })

  it('n’a aucun élément focalisable dans la coque qui ne soit sous un ancêtre inerte', async () => {
    const essai = monte()
    await ouvre(essai)
    const focalisables = coque().querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, [tabindex]')
    expect(focalisables.length).toBeGreaterThan(0)
    for (const element of focalisables) expect(element.closest('[inert]')).not.toBeNull()
  })

  it('ne pose qu’une seule région status, la sienne', async () => {
    const essai = monte()
    await ouvre(essai)
    expect(screen.getAllByRole('status')).toHaveLength(1)
    await essai.avance(PALIERS_MS[3])
    expect(screen.getAllByRole('status')).toHaveLength(1)
  })

  it('change de phrase à 3 s, 6 s et 12 s, sans rien annoncer de plus', async () => {
    const essai = monte()
    await ouvre(essai)
    const annoncees: string[] = []
    const region = screen.getByRole('status')
    new MutationObserver(() => annoncees.push(region.textContent ?? '')).observe(region, { childList: true, characterData: true, subtree: true })
    await essai.avance(PALIERS_MS[1])
    expect(screen.getByText(textes.phrases[1])).toBeInTheDocument()
    await essai.avance(PALIERS_MS[2] - PALIERS_MS[1])
    expect(screen.getByText(textes.phrases[2])).toBeInTheDocument()
    await essai.avance(PALIERS_MS[3] - PALIERS_MS[2])
    expect(screen.getByText(textes.phrases[3])).toBeInTheDocument()
    expect(annoncees).toEqual([])
    expect(region).toHaveTextContent(annonces.reveil)
  })

  it('annonce exactement deux textes : le réveil, puis « prêt »', async () => {
    const essai = monte()
    const textesAnnonces: string[] = []
    await ouvre(essai)
    const region = screen.getByRole('status')
    textesAnnonces.push(region.textContent ?? '')
    await essai.avance(PALIERS_MS[2])
    await essai.fin('a')
    expect(screen.getByRole('status')).toBe(region)
    textesAnnonces.push(region.textContent ?? '')
    expect(textesAnnonces).toEqual([annonces.reveil, annonces.pret])
    expect(screen.getByText(textes.pret)).toBeInTheDocument()
    expect(document.querySelector('.marmite')).toHaveAttribute('data-etat', 'joie')
  })

  it('s’efface après son minimum, rend la coque interactive et le focus à l’élément d’avant', async () => {
    const essai = monte()
    const avant = screen.getByRole('button', { name: 'Avant le réveil' })
    avant.focus()
    await ouvre(essai)
    expect(avant).not.toHaveFocus()
    await essai.avance(5000)
    await essai.fin('a')
    await essai.avance(PRET_MS)
    expect(titre()).toBeNull()
    expect(coque()).not.toHaveAttribute('inert')
    expect(avant).toHaveFocus()
  })

  it('rend le focus à #contenu quand l’élément d’avant n’existe plus', async () => {
    const essai = monte()
    const avant = screen.getByRole('button', { name: 'Avant le réveil' })
    avant.focus()
    await ouvre(essai)
    avant.remove()
    await essai.fin('a')
    await essai.avance(PRET_MS + AFFICHAGE_MIN_MS)
    expect(document.getElementById('contenu')).toHaveFocus()
  })

  it('rend le focus à #contenu quand l’élément d’avant est devenu inerte', async () => {
    const essai = monte()
    const avant = screen.getByRole('button', { name: 'Avant le réveil' })
    avant.focus()
    await ouvre(essai)
    avant.setAttribute('inert', '')
    await essai.fin('a')
    await essai.avance(PRET_MS + AFFICHAGE_MIN_MS)
    expect(document.getElementById('contenu')).toHaveFocus()
  })

  it('ne vole pas le focus au premier rendu', () => {
    monte()
    expect(document.body).toHaveFocus()
  })

  it('ne se montre pas après un 503 rapide, ni hors ligne', async () => {
    const essai = monte()
    await essai.debut('a')
    await essai.avance(300)
    await essai.fin('a', { statut: 503 })
    await essai.avance(10_000)
    expect(titre()).toBeNull()
    essai.arrete()
    const horsLigne = monte(false)
    await horsLigne.debut('b')
    await horsLigne.avance(10_000)
    expect(titre()).toBeNull()
  })

  it('se ferme sans « prêt » sur un 500 : la frontière d’erreur parle', async () => {
    const essai = monte()
    await ouvre(essai)
    await essai.fin('a', { statut: 500 })
    await essai.avance(AFFICHAGE_MIN_MS)
    expect(titre()).toBeNull()
    expect(screen.queryByText(textes.pret)).toBeNull()
  })

  it('n’a aucune violation axe, au réveil comme au « prêt »', async () => {
    const essai = monte()
    await ouvre(essai)
    vi.useRealTimers()
    expect(await verifieAxe(document.getElementById('transverses')!)).toEqual([])
    vi.useFakeTimers()
    await essai.fin('a')
    expect(screen.getByText(textes.pret)).toBeInTheDocument()
    vi.useRealTimers()
    expect(await verifieAxe(document.getElementById('transverses')!)).toEqual([])
  })
})
