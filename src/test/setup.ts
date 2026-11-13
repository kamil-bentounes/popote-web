import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Vitest n'expose pas `afterEach` globalement : Testing Library ne nettoie donc pas seul le document.
afterEach(() => {
  cleanup()
})
