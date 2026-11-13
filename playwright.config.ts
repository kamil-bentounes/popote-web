import { defineConfig, devices } from '@playwright/test'

const PORT = 4173

/*
 * Les e2e se jouent contre le VRAI relais (`wrangler dev`), CSP en `enforce` : un `vite preview` n'enverrait aucune CSP et
 * une violation passerait inaperçue (D7 du plan). `API_ORIGIN` pointe un port fermé : le banc n'appelle pas l'API, et le
 * relais rend sa `502` si quelqu'un le fait.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0, // un test instable se corrige, il ne se rejoue pas
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    trace: 'retain-on-failure',
  },
  webServer: {
    // La CI construit le banc et le contrôle avant (`BANC_CONSTRUIT`) : le serveur sert alors ce `dist` précis, sans le refaire.
    command: `${process.env.BANC_CONSTRUIT ? '' : 'npm run build:banc && '}npx wrangler dev --port ${PORT} --var CSP_MODE:enforce --var RELAY_SECRET:banc --var API_ORIGIN:http://127.0.0.1:9`,
    url: `http://127.0.0.1:${PORT}/`,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'telephone', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 } },
    { name: 'pc', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 } },
    // Kamil se connectera par Face ID, donc sur un iPhone : le banc se joue aussi dans WebKit.
    { name: 'iphone', use: { ...devices['iPhone 14'], viewport: { width: 390, height: 844 } } },
  ],
})
