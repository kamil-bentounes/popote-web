const LONGUEUR_MAX = 200

// Contrôles C0 et DEL. Un navigateur retire tabulation, saut de ligne et retour chariot d'une adresse : « /<tab>/x » y
// devient « //x », donc un autre site. Aucun n'a sa place dans un chemin.
const aUnControle = (texte: string) => Array.from(texte).some((caractere) => caractere <= '\u001F' || caractere === '\u007F')

const estChemin = (texte: string) => texte.startsWith('/') && !texte.startsWith('//') && !texte.includes('\\') && !aUnControle(texte)

// `/.//x` se normalise en `//x` (même origine pour `history.push`, mais un autre site si le chemin était réutilisé comme adresse) :
// on résout les segments `.` et `..` du chemin à la main, comme le ferait le navigateur. (Pas de `new URL` : le build refuse tout
// `URL` vers un autre hôte, même fictif.)
function resteUnChemin(texte: string): boolean {
  const [chemin = ''] = texte.split(/[?#]/)
  const segments: string[] = []
  for (const segment of chemin.split('/').slice(1)) {
    if (segment === '..') segments.pop()
    else if (segment !== '.') segments.push(segment)
  }
  return !`/${segments.join('/')}`.startsWith('//')
}

const estCheminSur = (texte: string) => estChemin(texte) && resteUnChemin(texte)

/**
 * Ne rend que ce qui est un chemin de cette origine (`/budget`, `/accueil?mois=11`), sinon `undefined`. C'est ce qui garde
 * `?retour=` de devenir une redirection vers un autre site (`//x`, `/\x`, `https://x`, `javascript:`). On vérifie la forme
 * brute ET la forme décodée : `/%2F%2Fx` redevient `//x` au premier décodage venu.
 */
export function cheminSur(valeur: unknown): string | undefined {
  if (typeof valeur !== 'string' || valeur.length > LONGUEUR_MAX || !estCheminSur(valeur)) return undefined
  try {
    return estCheminSur(decodeURIComponent(valeur)) ? valeur : undefined
  } catch {
    // Un pourcentage mal formé : rien de ce que le navigateur comprendrait pareil que nous.
    return undefined
  }
}
