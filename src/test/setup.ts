import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { MotionGlobalConfig } from 'motion/react'
import { afterEach } from 'vitest'

// Vitest n'expose pas `afterEach` globalement : Testing Library ne nettoie donc pas seul le document.
afterEach(() => {
  cleanup()
})

// Motion saute à l'état final : happy-dom n'a pas de vraie animation (`Animation.cancel` y rejette), et un test ne doit
// jamais dépendre d'une durée. Le mouvement lui-même (retard, ordre) se prouve dans Chromium sur le banc.
MotionGlobalConfig.skipAnimations = true
