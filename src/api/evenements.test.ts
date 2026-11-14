import { describe, expect, it, vi } from 'vitest'
import { creeEmetteur } from './evenements'

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
