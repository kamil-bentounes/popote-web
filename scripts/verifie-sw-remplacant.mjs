// Garde de CI : le `sw.js` construit doit s'activer seul et prendre la main sur l'ancien.
//
// L'ancien front de l'essai a inscrit un `sw.js` (même fichier, même portée). Le navigateur le
// remplace à la visite suivante, mais le nouveau ne prend la main que s'il appelle `skipWaiting` ET
// `clientsClaim` dès son démarrage ; sinon il attend, et le repli SPA rend l'ancienne appli.
//
// Un simple `grep skipWaiting` ne prouve rien : la forme `prompt` de vite-plugin-pwa le contient
// aussi, dans un écouteur de message (`SKIP_WAITING`). La forme `autoUpdate` pose les deux appels
// côte à côte, à la racine du module : c'est elle qu'on exige.
//
// Usage : node scripts/verifie-sw-remplacant.mjs dist/sw.js
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const FORME_AUTO_UPDATE = /self\.skipWaiting\(\),\w+\.clientsClaim\(\)/

export function remplaceLAncienServiceWorker(contenu) {
  return FORME_AUTO_UPDATE.test(contenu)
}

function lance(fichier) {
  if (!fichier) {
    console.error('Usage : node scripts/verifie-sw-remplacant.mjs <dist/sw.js>')
    return 1
  }
  let contenu
  try {
    contenu = readFileSync(fichier, 'utf8')
  } catch (erreur) {
    console.error(`Lecture impossible de ${fichier} : ${erreur.message}`)
    return 1
  }
  if (!remplaceLAncienServiceWorker(contenu)) {
    console.error(
      `${fichier} ne s'active pas seul : il manque « self.skipWaiting(),x.clientsClaim() » à la racine ` +
        '(registerType: autoUpdate, ou workbox.skipWaiting et workbox.clientsClaim). ' +
        "L'ancien service worker resterait aux commandes.",
    )
    return 1
  }
  console.log(`${fichier} : s'active seul et remplace l'ancien.`)
  return 0
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  process.exit(lance(process.argv[2]))
}
