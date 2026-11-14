import { afterEach, describe, expect, it, vi } from 'vitest'
import { creeEmetteur } from './evenements'

afterEach(() => vi.restoreAllMocks())

const limite = { chemin: '/api/v1/me', methode: 'GET', retryApresS: 30 }

describe('creeEmetteur', () => {
  it('rend à chaque abonné les données de son événement, et seulement les siennes', () => {
    const emetteur = creeEmetteur()
    const reçus: unknown[] = []
    emetteur.sur('limite', (donnees) => reçus.push(donnees))
    emetteur.sur('non-authentifie', () => reçus.push('autre'))
    emetteur.emet('limite', limite)
    expect(reçus).toEqual([limite])
  })

  it('cesse de rendre après le désabonnement, même pendant l’émission', () => {
    const emetteur = creeEmetteur()
    const appels: string[] = []
    const retire = emetteur.sur('limite', () => {
      appels.push('premier')
      retire()
    })
    emetteur.sur('limite', () => appels.push('second'))
    emetteur.emet('limite', limite)
    emetteur.emet('limite', limite)
    expect(appels).toEqual(['premier', 'second', 'second'])
  })

  it('un abonné ajouté pendant l’émission n’entend que les suivantes', () => {
    const emetteur = creeEmetteur()
    const tardif = vi.fn<() => void>()
    emetteur.sur('limite', () => void emetteur.sur('limite', tardif))
    emetteur.emet('limite', limite)
    expect(tardif).not.toHaveBeenCalled()
    emetteur.emet('limite', limite)
    expect(tardif).toHaveBeenCalledOnce()
  })

  it('la même fonction abonnée deux fois est deux abonnements : se désabonner de l’un laisse l’autre', () => {
    const emetteur = creeEmetteur()
    const ecouteur = vi.fn<() => void>()
    const retire = emetteur.sur('limite', ecouteur)
    emetteur.sur('limite', ecouteur)
    retire()
    emetteur.emet('limite', limite)
    expect(ecouteur).toHaveBeenCalledOnce()
  })

  it('sans signalement injecté, l’erreur d’un abonné est relancée hors de l’appel, jamais avalée', () => {
    const planifies: (() => void)[] = []
    vi.spyOn(globalThis, 'queueMicrotask').mockImplementation((tache) => void planifies.push(tache))
    const panne = new Error('abonné défaillant')
    const emetteur = creeEmetteur()
    emetteur.sur('limite', () => {
      throw panne
    })
    expect(() => emetteur.emet('limite', limite)).not.toThrow()
    expect(planifies).toHaveLength(1)
    expect(() => planifies[0]?.()).toThrow(panne)
  })

  it('un abonné qui échoue est signalé et ne prive pas les autres', () => {
    const signale = vi.fn<(erreur: unknown) => void>()
    const emetteur = creeEmetteur(signale)
    const panne = new Error('abonné défaillant')
    const suite = vi.fn<() => void>()
    emetteur.sur('limite', () => {
      throw panne
    })
    emetteur.sur('limite', suite)
    expect(() => emetteur.emet('limite', limite)).not.toThrow()
    expect(signale).toHaveBeenCalledWith(panne)
    expect(suite).toHaveBeenCalledOnce()
  })
})
