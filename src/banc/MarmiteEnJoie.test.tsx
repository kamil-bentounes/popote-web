import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MarmiteEnJoie } from './MarmiteEnJoie'

// `shouldAdvanceTime` : le `setTimeout(0)` de Testing Library, après un geste de user-event, ne se résoudrait jamais sur une horloge figée.
beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }))
afterEach(() => vi.useRealTimers())

it('le bouton met la marmite en joie, qui retombe au repos d’elle-même', async () => {
  const user = userEvent.setup()
  const { container } = render(<MarmiteEnJoie />)
  const marmite = container.querySelector('.marmite')
  expect(marmite).toHaveAttribute('data-etat', 'repos')
  await user.click(screen.getByRole('button', { name: 'Je l’ai mangé' }))
  expect(marmite).toHaveAttribute('data-etat', 'joie')
  act(() => void vi.advanceTimersByTime(1400))
  expect(marmite).toHaveAttribute('data-etat', 'repos')
})
