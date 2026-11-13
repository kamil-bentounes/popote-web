import './styles/index.css'
import './styles/coque.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { nettoieAncienFrontDe } from './ancien-front'
import { creeRouteur } from './router'

nettoieAncienFrontDe(window)
// Tant que F22 n'a pas refait la PWA, rien ne doit retirer le `sw.js` qui remplace celui de l'ancien front.
registerSW({ immediate: true })

const queryClient = new QueryClient()
const routeur = creeRouteur({ queryClient })

const racine = document.getElementById('root')
if (!racine) throw new Error('#root introuvable dans index.html')
createRoot(racine).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={routeur} />
    </QueryClientProvider>
  </StrictMode>,
)
