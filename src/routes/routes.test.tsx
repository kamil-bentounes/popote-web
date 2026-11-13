/// <reference types="node" />
import { QueryClient } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  RouterProvider,
  type AnyRoute,
} from '@tanstack/react-router'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { StrictMode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ErreurRoute } from '../etats/ErreurRoute'
import { creeRouteur, optionsDuRouteur } from '../router'
import { verifieAxe } from '../test/axe'
import { Route as racineReelle } from './__root'

// Un texte du catalogue qui, sur demande, lève : c'est ce qui fait échouer le VRAI composant de `/entrer`
// (chargé à la demande), sans toucher à son code.
const panne = vi.hoisted(() => ({ entrer: false }))
vi.mock('../textes/navigation', async (importOriginal) => {
  const original = await importOriginal<typeof import('../textes/navigation')>()
  return {
    navigation: new Proxy(original.navigation, {
      get(cible, cle) {
        if (cle === 'entrerAttente' && panne.entrer) throw new Error('secret-entrer')
        return cible[cle as keyof typeof cible]
      },
    }),
  }
})

// Monté comme `main.tsx` le monte : en StrictMode (les effets s'exécutent deux fois).
function affiche(routeur: ReturnType<typeof creeRouteur>) {
  return render(
    <StrictMode>
      <RouterProvider router={routeur} />
    </StrictMode>,
  )
}

function monte(adresse = '/') {
  const history = createMemoryHistory({ initialEntries: [adresse] })
  const routeur = creeRouteur({ queryClient: new QueryClient(), history })
  return { routeur, history, ...affiche(routeur) }
}

/**
 * Un routeur sur une COPIE de la vraie racine (mêmes options : coque, focus, titre, frontières), avec
 * des routes de test en plus. Une copie, car `addChildren` modifie la racine : sur la vraie, il
 * changerait l'arbre de tous les tests suivants.
 */
function monteAvec(fabriques: Array<(racine: AnyRoute) => AnyRoute>, adresse: string) {
  const racine = createRootRouteWithContext<{ queryClient: QueryClient }>()({ ...racineReelle.options } as never)
  const history = createMemoryHistory({ initialEntries: [adresse] })
  const routeur = createRouter({
    ...optionsDuRouteur,
    routeTree: racine.addChildren(fabriques.map((fabrique) => fabrique(racine))),
    history,
    context: { queryClient: new QueryClient() },
  }) as unknown as ReturnType<typeof creeRouteur>
  return { routeur, history, ...affiche(routeur) }
}

const contenu = () => document.getElementById('contenu')

describe('le routeur', () => {
  it('mène « / » à « /entrer »', async () => {
    const { routeur } = monte('/')
    await screen.findByRole('heading', { level: 1 })
    expect(routeur.state.location.pathname).toBe('/entrer')
  })

  it('pose le titre de la route dans document.title', async () => {
    monte('/entrer')
    await screen.findByRole('heading', { level: 1 })
    await waitFor(() => expect(document.title).toBe('Entrer · Popote'))
  })

  it('n’a aucune violation axe sur « /entrer »', async () => {
    const { container } = monte('/entrer')
    await screen.findByRole('heading', { level: 1 })
    expect(await verifieAxe(container)).toEqual([])
  })
})

describe('la coque', () => {
  it('met le lien d’évitement en premier dans l’ordre de tabulation et lui fait mener le focus à #contenu', async () => {
    const user = userEvent.setup()
    monte('/entrer')
    await screen.findByRole('heading', { level: 1 })
    await user.tab()
    expect(screen.getByRole('link', { name: 'Aller au contenu' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(contenu()).toHaveFocus()
  })

  it('contient le lien d’évitement et le contenu dans #coque, hors de laquelle se trouve le lieu des états transverses', async () => {
    monte('/entrer')
    await screen.findByRole('heading', { level: 1 })
    const coque = document.getElementById('coque')
    expect(coque).not.toBeNull()
    expect(coque).toContainElement(screen.getByRole('link', { name: 'Aller au contenu' }))
    expect(coque).toContainElement(screen.getByRole('main'))
    expect(document.getElementById('transverses')).not.toBeNull()
    expect(coque).not.toContainElement(document.getElementById('transverses'))
  })

  it('supprime l’anneau de focus du conteneur #contenu : un conteneur n’est pas un contrôle', () => {
    // Vitest ne traite pas le CSS (`?raw` rend une chaîne vide) : on lit le fichier.
    const css = readFileSync(resolve(process.cwd(), 'src/styles/coque.css'), 'utf8')
    expect(css).toMatch(/main\[tabindex="-1"\]:focus\s*\{\s*outline:\s*none/)
  })
})

describe('le focus à la navigation', () => {
  it('ne se déplace pas au premier chargement', async () => {
    monte('/entrer')
    await screen.findByRole('heading', { level: 1 })
    expect(contenu()).not.toHaveFocus()
  })

  it('ne se déplace pas à la redirection de « / » vers « /entrer »', async () => {
    const { routeur } = monte('/')
    await screen.findByRole('heading', { level: 1 })
    expect(routeur.state.location.pathname).toBe('/entrer')
    expect(contenu()).not.toHaveFocus()
  })

  it('passe à #contenu quand on suit un vrai lien vers un autre chemin', async () => {
    const user = userEvent.setup()
    const { routeur } = monte('/inexistant')
    await screen.findByRole('heading', { name: 'Page introuvable' })
    await user.click(screen.getByRole('link', { name: 'Retour à l’accueil' }))
    await screen.findByRole('heading', { name: 'Popote revient bientôt' })
    expect(routeur.state.location.pathname).toBe('/entrer')
    expect(contenu()).toHaveFocus()
  })

  it('passe à #contenu au retour arrière dans l’historique', async () => {
    const { history } = monte('/entrer')
    await screen.findByRole('heading', { level: 1 })
    await act(async () => history.push('/inexistant'))
    await screen.findByRole('heading', { name: 'Page introuvable' })
    ;(document.activeElement as HTMLElement).blur()
    await act(async () => history.back())
    await screen.findByRole('heading', { name: 'Popote revient bientôt' })
    expect(contenu()).toHaveFocus()
  })

  it('ne se déplace pas quand seul un paramètre de recherche change', async () => {
    const { history } = monte('/entrer')
    await screen.findByRole('heading', { level: 1 })
    await act(async () => history.push('/entrer?retour=%2Faccueil'))
    await waitFor(() => expect(history.location.search).toContain('retour'))
    expect(contenu()).not.toHaveFocus()
  })

  it('ne se déplace pas quand seul le fragment change', async () => {
    const { history } = monte('/entrer')
    await screen.findByRole('heading', { level: 1 })
    await act(async () => history.push('/entrer#ancre'))
    await waitFor(() => expect(history.location.hash).toBe('#ancre'))
    expect(contenu()).not.toHaveFocus()
  })

  it('n’arrive qu’une fois le nouveau contenu affiché, pas au début de la navigation', async () => {
    let finDuChargement!: () => void
    const attente = new Promise<void>((fin) => (finDuChargement = fin))
    const lent = (racine: AnyRoute) => createRoute({
      getParentRoute: () => racine,
      path: '/lent',
      head: () => ({ meta: [{ title: 'Lent · Popote' }] }),
      loader: () => attente,
      errorComponent: ErreurRoute,
      component: () => <h1>Chargé</h1>,
    })
    const { history } = monteAvec([lent], '/depart')
    await screen.findByRole('heading', { name: 'Page introuvable' })
    await act(async () => history.push('/lent'))
    expect(contenu()).not.toHaveFocus()
    await act(async () => finDuChargement())
    await screen.findByRole('heading', { name: 'Chargé' })
    expect(contenu()).toHaveFocus()
  })
})

describe('une route inconnue', () => {
  it('rend la page « introuvable » dans la coque : le lien d’évitement est encore là', async () => {
    monte('/inexistant')
    await screen.findByRole('heading', { name: 'Page introuvable' })
    expect(screen.getByRole('link', { name: 'Aller au contenu' })).toBeInTheDocument()
    expect(screen.getByRole('main')).toContainElement(screen.getByRole('heading', { name: 'Page introuvable' }))
  })

  it('a son propre titre de document (WCAG 2.4.2)', async () => {
    monte('/inexistant')
    await screen.findByRole('heading', { name: 'Page introuvable' })
    await waitFor(() => expect(document.title).toBe('Page introuvable · Popote'))
  })

  it('n’a aucune violation axe', async () => {
    const { container } = monte('/inexistant')
    await screen.findByRole('heading', { name: 'Page introuvable' })
    expect(await verifieAxe(container)).toEqual([])
  })
})

describe('chaque route déclare sa frontière d’erreur et son titre', () => {
  it('à l’exécution : un errorComponent et un titre sur toute route sauf la racine', () => {
    const routeur = creeRouteur({ queryClient: new QueryClient(), history: createMemoryHistory() })
    const routes = Object.entries(routeur.routesById).filter(([id]) => id !== '__root__')
    expect(routes.length).toBeGreaterThanOrEqual(3)
    for (const [id, route] of routes) {
      expect(route.options.errorComponent, `errorComponent de ${id}`).toBeTruthy()
      const titres = route.options.head?.({} as never)?.meta?.filter((m: Record<string, unknown>) => 'title' in m) ?? []
      expect(titres.length, `titre de ${id}`).toBeGreaterThan(0)
    }
  })

  // `autoCodeSplitting` remplace l'errorComponent par un enveloppeur toujours « vrai » : le test
  // précédent ne verrait pas un `() => null`. Celui-ci lit le source de chaque route.
  it('dans le source : `errorComponent: ErreurRoute` et `head` sur chaque fichier de route', () => {
    const dossier = resolve(process.cwd(), 'src/routes')
    const fichiers = readdirSync(dossier).filter((f) => /\.tsx?$/.test(f) && !f.includes('.test.') && f !== '__root.tsx')
    expect(fichiers.length).toBeGreaterThanOrEqual(3)
    for (const fichier of fichiers) {
      const source = readFileSync(resolve(dossier, fichier), 'utf8')
      expect(source, `errorComponent de ${fichier}`).toContain('errorComponent: ErreurRoute')
      expect(source, `head de ${fichier}`).toMatch(/head: \(\) =>/)
    }
  })
})

describe('les frontières d’erreur attrapent, à chaque phase, sans rien montrer du texte reçu', () => {
  const routeDeTest = (chemin: string, options: object) => (racine: AnyRoute) =>
    createRoute({
      getParentRoute: () => racine,
      path: chemin,
      head: () => ({ meta: [{ title: `${chemin} · Popote` }] }),
      errorComponent: ErreurRoute,
      component: () => <h1>Contenu de {chemin}</h1>,
      ...options,
    })

  it.each([
    ['beforeLoad', 'secret-avant', { beforeLoad: () => { throw new Error('secret-avant') } }],
    ['loader', 'secret-chargeur', { loader: () => { throw new Error('secret-chargeur') } }],
    ['rendu', 'secret-rendu', { component: () => { throw new Error('secret-rendu') } }],
  ])('%s : la frontière de la route s’affiche, la coque reste, aucun « %s »', async (_phase, secret, options) => {
    const { container } = monteAvec([routeDeTest('/panne', options)], '/panne')
    await screen.findByRole('button', { name: 'Réessayer' })
    expect(screen.getByRole('link', { name: 'Aller au contenu' })).toBeInTheDocument()
    expect(screen.getByRole('main')).toContainElement(screen.getByRole('button', { name: 'Réessayer' }))
    expect(document.body).not.toHaveTextContent(secret)
    expect(await verifieAxe(container)).toEqual([])
  })

  it('« Réessayer » récupère une panne passagère du chargeur', async () => {
    const user = userEvent.setup()
    let appels = 0
    const route = routeDeTest('/passagere', {
      loader: () => {
        appels += 1
        if (appels === 1) throw new Error('secret-passager')
      },
    })
    monteAvec([route], '/passagere')
    await user.click(await screen.findByRole('button', { name: 'Réessayer' }))
    await screen.findByRole('heading', { name: 'Contenu de /passagere' })
    expect(appels).toBeGreaterThanOrEqual(2)
  })

  it('la VRAIE route /entrer : son composant qui plante est attrapé par sa frontière, puis « Réessayer » le récupère', async () => {
    const user = userEvent.setup()
    panne.entrer = true
    try {
      monte('/entrer')
      const reessayer = await screen.findByRole('button', { name: 'Réessayer' })
      expect(screen.getByRole('link', { name: 'Aller au contenu' })).toBeInTheDocument()
      expect(document.body).not.toHaveTextContent('secret-entrer')
      panne.entrer = false
      await user.click(reessayer)
      await screen.findByRole('heading', { name: 'Popote revient bientôt' })
    } finally {
      panne.entrer = false
    }
  })
})
