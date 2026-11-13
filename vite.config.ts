import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        cleanupOutdatedCaches: true,
        /*
         * `skipWaiting` et `clientsClaim` font que ce service worker remplace tout seul l'ancien
         * (même `sw.js`, même portée) chez un navigateur qui a déjà l'ancienne appli. Sans eux il
         * attendrait, et l'ancienne appli resterait servie. `scripts/verifie-sw-remplacant.mjs`
         * le garde en CI sur le `sw.js` construit.
         */
        clientsClaim: true,
        skipWaiting: true,
        // L'API et les images des mails de rappel ne passent jamais par le repli de navigation.
        navigateFallbackDenylist: [/^\/api\//, /^\/mail\//],
      },
      manifest: {
        name: 'Popote',
        short_name: 'Popote',
        lang: 'fr',
        start_url: '/',
        display: 'standalone',
        description: 'Ce qu’on mange et ce que ça coûte, à deux.',
        background_color: '#F2F4EF',
        theme_color: '#2F5D45',
        icons: [
          { src: '/icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icone-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icone-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    // Trois projets qui héritent de la configuration racine (`extends` vaut `true` par défaut).
    projects: [
      {
        test: {
          name: 'web',
          environment: 'happy-dom',
          include: ['src/**/*.test.{ts,tsx}'],
          setupFiles: ['src/test/setup.ts'],
        },
      },
      { test: { name: 'relais', environment: 'node', include: ['relais/**/*.test.ts'] } },
      { test: { name: 'scripts', environment: 'node', include: ['scripts/**/*.test.{ts,mjs}'] } },
    ],
  },
})
