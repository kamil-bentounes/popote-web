import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { BulleQuiParle } from './BulleQuiParle'

it('le bouton change le texte de la MÊME région status : c’est ce qui l’annonce', async () => {
  const user = userEvent.setup()
  render(<BulleQuiParle />)
  const region = screen.getByRole('status')
  const avant = region.textContent
  await user.click(screen.getByRole('button', { name: 'Changer la phrase' }))
  expect(screen.getByRole('status')).toBe(region)
  expect(region.textContent).not.toBe(avant)
})
