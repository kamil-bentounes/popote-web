/** Une capture : le fichier (relatif à `index.html`) et la taille du cas en pixels CSS. */
export interface Mesure {
  largeur: number
  hauteur: number
  image: string
}

export interface PaireCapturee {
  section: string
  legende: string
  /** La légende de la référence que le cas désigne : deux `reference` croisées passent l'appariement, l'œil les voit ici. */
  legendeReference: string
  reference: Mesure
  banc: Mesure
}

/** Ce qu'un projet Playwright écrit dans `donnees.json`, et que l'index relit. */
export interface DonneesProjet {
  projet: string
  paires: PaireCapturee[]
  sansPendant: string[]
  nonPortees: string[]
}

/** Au-delà de 2 px dans un sens, la ligne porte un repère rouge : la session de design juge, rien n'échoue. */
export const ECART_MAX_PX = 2

const echappe = (texte: string): string =>
  texte.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c)

const taille = (m: Mesure): string => `${Math.round(m.largeur)} × ${Math.round(m.hauteur)}`
const ecarte = (p: PaireCapturee): boolean =>
  Math.abs(p.banc.largeur - p.reference.largeur) > ECART_MAX_PX || Math.abs(p.banc.hauteur - p.reference.hauteur) > ECART_MAX_PX

function ligne(projet: string, p: PaireCapturee): string {
  const image = (m: Mesure, cote: string) => `<img src="${echappe(`${projet}/${m.image}`)}" alt="${cote} : ${echappe(p.legende)}" loading="lazy">`
  return `<tr class="paire${ecarte(p) ? ' ecart' : ''}">
<th scope="row">${ecarte(p) ? '<strong>ÉCART</strong><br>' : ''}${echappe(p.section)}<br>${echappe(p.legende)}<br><small>référence : ${echappe(p.legendeReference)}</small></th>
<td>${image(p.reference, 'référence')}<br>référence ${taille(p.reference)}</td>
<td>${image(p.banc, 'banc')}<br>banc ${taille(p.banc)}</td>
</tr>`
}

function projet(d: DonneesProjet): string {
  const liste = (titre: string, items: string[]) =>
    items.length === 0 ? '' : `<p>${titre} : ${items.map(echappe).join(' ; ')}</p>`
  return `<section>
<h2>${echappe(d.projet)} (${d.paires.length} cas, ${d.paires.filter(ecarte).length} avec un écart de plus de ${ECART_MAX_PX} px)</h2>
${liste('Pas encore portées dans le banc', d.nonPortees)}
${liste('Cas du banc sans pendant dans la référence', d.sansPendant)}
<table>
<thead><tr><th>Cas</th><th>reference.html</th><th>Banc</th></tr></thead>
<tbody>
${d.paires.map((p) => ligne(d.projet, p)).join('\n')}
</tbody>
</table>
</section>`
}

/** La page de comparaison : une ligne par cas, la référence et le banc côte à côte. */
export function renduIndex(donnees: DonneesProjet[]): string {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Comparaison du banc avec reference.html</title>
<style>
body { font: 16px/1.4 system-ui, sans-serif; margin: 24px; }
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid #999; padding: 8px; vertical-align: top; text-align: left; }
img { max-width: 100%; height: auto; background: #eee; }
tr.ecart { outline: 3px solid red; outline-offset: -3px; background: #fdd; }
</style>
</head>
<body>
<h1>Comparaison du banc avec reference.html</h1>
<p>Une ligne par cas. Rien n'échoue sur un écart : la session de design juge. Un contour rouge marque un écart de plus de ${ECART_MAX_PX} px dans un sens.</p>
${donnees.map(projet).join('\n')}
</body>
</html>
`
}
