type StockageNettoyable = Pick<Storage, 'key' | 'removeItem' | 'length'>

// Les jetons que l'ancien front lisait en JavaScript : `sb-<projet>-auth-token` et ses variantes
// (`-code-verifier`, `-user`), la clé par défaut de la bibliothèque d'authentification de l'ancien
// front. Rien d'autre n'est visé. Pas d'autre nom en clair ici : la garde de CI refuse l'ancien
// fournisseur dans `dist/`.
function estJetonAncienFront(cle: string): boolean {
  return cle.startsWith('sb-')
}

/**
 * Efface du navigateur les jetons que l'ancien front y a laissés.
 *
 * Ne lève jamais : un stockage refusé (navigation privée) ne doit pas empêcher la page d'attente de
 * s'afficher, et ces clés ne servent plus à personne. Les clés se relèvent avant d'être effacées,
 * car effacer décale les index.
 */
export function nettoieAncienFront(stockage: StockageNettoyable): void {
  let cles: string[]
  try {
    cles = Array.from({ length: stockage.length }, (_, index) => stockage.key(index)).filter(
      (cle): cle is string => cle !== null && estJetonAncienFront(cle),
    )
  } catch {
    return
  }
  for (const cle of cles) {
    try {
      stockage.removeItem(cle)
    } catch {
      // Une clé qui résiste n'empêche pas d'effacer les autres.
    }
  }
}
