import { act, render, renderHook, screen } from '@testing-library/react'
import * as m from 'motion/react-m'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MotionProvider } from './MotionProvider'
import { useMouvementReduit } from './useMouvementReduit'

/** Un `matchMedia` que le test pilote : `matches` change, les abonnés sont prévenus. */
function installeMatchMedia(initial: boolean) {
  let matches = initial
  const abonnes = new Set<() => void>()
  vi.stubGlobal('matchMedia', (requete: string) => ({
    get matches() {
      return requete.includes('prefers-reduced-motion') && matches
    },
    media: requete,
    addEventListener: (_: string, rappel: () => void) => abonnes.add(rappel),
    removeEventListener: (_: string, rappel: () => void) => abonnes.delete(rappel),
  }))
  return (valeur: boolean) => {
    matches = valeur
    abonnes.forEach((rappel) => rappel())
  }
}

afterEach(() => vi.unstubAllGlobals())

const dansLeFournisseur = (props: { reduit?: boolean } = {}) =>
  function Enveloppe({ children }: { children: ReactNode }) {
    return <MotionProvider {...props}>{children}</MotionProvider>
  }

describe('MotionProvider', () => {
  it('rend un composant `m`', () => {
    render(<MotionProvider><m.p>Bonsoir</m.p></MotionProvider>)
    expect(screen.getByText('Bonsoir')).toBeInTheDocument()
  })

  it('refuse un `motion.div` égaré (mode strict) : il alourdirait le départ de toute la bibliothèque', () => {
    const erreurs = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() => render(<MotionProvider><motion.div>Égaré</motion.div></MotionProvider>)).toThrow(/LazyMotion|strict/i)
    erreurs.mockRestore()
  })
})

describe('useMouvementReduit', () => {
  it('suit la préférence de la personne, et ses changements en cours de route', () => {
    const change = installeMatchMedia(false)
    const { result } = renderHook(() => useMouvementReduit(), { wrapper: dansLeFournisseur() })
    expect(result.current).toBe(false)
    act(() => change(true))
    expect(result.current).toBe(true)
  })

  it('part de la préférence déjà posée', () => {
    installeMatchMedia(true)
    const { result } = renderHook(() => useMouvementReduit(), { wrapper: dansLeFournisseur() })
    expect(result.current).toBe(true)
  })

  it('une valeur donnée au fournisseur (le banc, un test) l’emporte sur la préférence', () => {
    installeMatchMedia(false)
    const { result } = renderHook(() => useMouvementReduit(), { wrapper: dansLeFournisseur({ reduit: true }) })
    expect(result.current).toBe(true)
  })

  it('lève hors d’un fournisseur : un composant animé sans politique serait animé sans règle', () => {
    const erreurs = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() => renderHook(() => useMouvementReduit())).toThrow(/MotionProvider/)
    erreurs.mockRestore()
  })
})
