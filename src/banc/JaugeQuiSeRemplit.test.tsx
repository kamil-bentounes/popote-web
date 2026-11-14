import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { MotionProvider } from '../ui/MotionProvider'
import { JaugeQuiSeRemplit } from './JaugeQuiSeRemplit'

it('« Remplir de nouveau » change la valeur de la MÊME jauge, qui repart', async () => {
  const user = userEvent.setup()
  render(<MotionProvider><JaugeQuiSeRemplit /></MotionProvider>)
  const jauge = screen.getByRole('progressbar', { name: 'Énergie du jour' })
  expect(jauge).toHaveAttribute('aria-valuenow', '15')
  await user.click(screen.getByRole('button', { name: 'Remplir de nouveau' }))
  expect(screen.getByRole('progressbar')).toBe(jauge)
  expect(jauge).toHaveAttribute('aria-valuenow', '85')
  await user.click(screen.getByRole('button', { name: 'Remplir de nouveau' }))
  expect(jauge).toHaveAttribute('aria-valuenow', '15')
})
