// Ce qu'`oasdiff breaking` laisse passer et qu'un front ne peut pas laisser passer :
//  - une opération RETIRÉE, même dépréciée : oasdiff admet la suppression d'une route dépréciée
//    (avec ou sans date de fin), mais le front l'appelle peut-être encore ;
//  - une route dont la PROTECTION change (devient publique, ou exige une session) : la liste
//    `src/api/routes-protegees.ts` serait périmée, et F21 ne reconnaîtrait plus une session expirée.
// Un ajout n'est pas signalé.
//
// Usage : node scripts/compare-contrats.mjs <copie du front> <amont>   (rend 1 s'il y a un écart)
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { operations, routesProtegees } from './genere-routes-protegees.mjs'

export function compare(base, amont) {
  const operationsAmont = new Set(operations(amont))
  const retirees = operations(base).filter((cle) => !operationsAmont.has(cle))
  const protegeesBase = new Set(routesProtegees(base))
  const protegeesAmont = new Set(routesProtegees(amont))
  const protectionChangee = operations(base)
    .filter((cle) => operationsAmont.has(cle) && protegeesBase.has(cle) !== protegeesAmont.has(cle))
  return { retirees, protectionChangee }
}

function lance([fichierBase, fichierAmont]) {
  if (!fichierBase || !fichierAmont) {
    console.error('Usage : node scripts/compare-contrats.mjs <copie du front> <amont>')
    return 1
  }
  let ecarts
  try {
    ecarts = compare(JSON.parse(readFileSync(fichierBase, 'utf8')), JSON.parse(readFileSync(fichierAmont, 'utf8')))
  } catch (erreur) {
    console.error(`comparaison impossible : ${erreur.message}`)
    return 1
  }
  const lignes = [
    ...ecarts.retirees.map((cle) => `opération retirée par l'amont : ${cle}`),
    ...ecarts.protectionChangee.map((cle) => `protection changée par l'amont : ${cle} (src/api/routes-protegees.ts serait périmé)`),
  ]
  for (const ligne of lignes) console.error(process.env.GITHUB_ACTIONS ? `::error::${ligne}` : ligne)
  return lignes.length === 0 ? 0 : 1
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  process.exit(lance(process.argv.slice(2)))
}
