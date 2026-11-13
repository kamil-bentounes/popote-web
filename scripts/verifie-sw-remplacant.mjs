// Garde de CI : le `sw.js` construit doit s'activer seul et prendre la main sur l'ancien.
//
// L'ancien front de l'essai a inscrit un `sw.js` (même fichier, même portée). Le navigateur le
// remplace à la visite suivante, mais le nouveau ne prend la main que s'il appelle `skipWaiting` ET
// `clientsClaim` dès son démarrage ; sinon il attend, et le repli SPA rend l'ancienne appli.
//
// Un `grep skipWaiting` ne prouve rien : la forme `prompt` de vite-plugin-pwa le contient aussi, dans
// un écouteur de message (`SKIP_WAITING`), et un commentaire ou une chaîne le contiendrait de même.
// On EXÉCUTE donc le fichier dans un bac à sable qui simule le service worker et sa bibliothèque
// (workbox), sans déclencher aucun événement, et on regarde si les deux appels ont eu lieu.
//
// Usage : node scripts/verifie-sw-remplacant.mjs dist/sw.js
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import vm from 'node:vm'

/** Exécute `contenu` comme un service worker qui démarre ; rend les appels faits à la racine. */
function executeAuDemarrage(contenu) {
  const appels = { skipWaiting: false, clientsClaim: false }
  const noop = () => undefined
  // Toute méthode de workbox est acceptée ; seul `clientsClaim` est observé. `NavigationRoute` se
  // construit avec `new`, d'où une fonction ordinaire.
  const workbox = new Proxy(
    {},
    {
      get: (_, nom) =>
        nom === 'clientsClaim'
          ? () => void (appels.clientsClaim = true)
          : nom === 'NavigationRoute'
            ? function NavigationRoute() {}
            : noop,
    },
  )
  const portee = {
    skipWaiting: () => void (appels.skipWaiting = true),
    addEventListener: noop, // un écouteur n'est jamais déclenché : ce n'est pas « au démarrage »
    location: { href: 'https://exemple.test/sw.js' },
    define: (_dependances, fabrique) => fabrique(workbox),
  }
  portee.self = portee
  vm.runInNewContext(contenu, { ...portee, define: portee.define, self: portee }, { timeout: 2000 })
  return appels
}

export function remplaceLAncienServiceWorker(contenu) {
  try {
    const { skipWaiting, clientsClaim } = executeAuDemarrage(contenu)
    return skipWaiting && clientsClaim
  } catch {
    return false // un fichier qui ne s'exécute pas ne remplace rien
  }
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
      `${fichier} ne s'active pas seul : au démarrage il n'appelle pas à la fois self.skipWaiting() et ` +
        'clientsClaim() (registerType: autoUpdate, ou workbox.skipWaiting et workbox.clientsClaim). ' +
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
