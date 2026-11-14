// Usage : node --experimental-strip-types e2e/comparaison/ecrit-index.ts <dossier>   (Node 22.18 ou plus lit le TypeScript sans l'option)
// Réunit les `donnees.json` de chaque projet Playwright en `<dossier>/index.html`, déposé en artefact par la CI.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { renduIndex, type DonneesProjet } from './rendu-index.ts'

const dossier = process.argv[2]
if (!dossier) {
  console.error('Usage : node e2e/comparaison/ecrit-index.ts <dossier>')
  process.exit(1)
}
let entrees
try {
  entrees = readdirSync(dossier, { withFileTypes: true })
} catch {
  console.error(`${dossier} n'existe pas : les tests n'ont rien capturé`)
  process.exit(1)
}
const donnees: DonneesProjet[] = entrees
  .filter((entree) => entree.isDirectory())
  .map((entree) => join(dossier, entree.name, 'donnees.json'))
  .flatMap((fichier) => {
    try {
      return [JSON.parse(readFileSync(fichier, 'utf8')) as DonneesProjet]
    } catch {
      return [] // un projet qui n'a rien écrit (test tombé avant la capture) : l'index montre les autres
    }
  })
  .sort((a, b) => a.projet.localeCompare(b.projet))
if (donnees.length === 0) {
  console.error(`Aucun donnees.json sous ${dossier} : rien à comparer`)
  process.exit(1)
}
writeFileSync(join(dossier, 'index.html'), renduIndex(donnees))
console.log(`${join(dossier, 'index.html')} : ${donnees.reduce((n, d) => n + d.paires.length, 0)} cas, projets : ${donnees.map((d) => d.projet).join(', ')}`)
