import axe from 'axe-core'

const BALISES_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

/**
 * Passe `axe-core` sur un élément et rend les identifiants des règles violées (vide = rien trouvé).
 *
 * Garde sémantique PARTIELLE : seules les règles des balises WCAG A et AA (2.0 à 2.2) tournent, et
 * happy-dom n'a pas de mise en page. Ne sont donc pas vus ici : le contraste (`color-contrast`,
 * coupé), la taille des cibles (`target-size`), `link-in-text-block` et les zones défilantes
 * (`scrollable-region-focusable`), qui se mesurent dans Chromium sur le banc (F8). Les règles
 * classées « bonne pratique » par axe ne tournent pas non plus (nom d'un `<dialog>`, titre vide,
 * ordre des titres) : un nom de dialogue se teste avec `getByRole('dialog', { name })`.
 * Ce que rend `axe` ne suffit pas à dire « accessible » : il trouve une partie des défauts, le
 * reste se teste à la main.
 */
export async function verifieAxe(element: Element): Promise<string[]> {
  const resultat = await axe.run(element, {
    runOnly: { type: 'tag', values: BALISES_WCAG },
    rules: { 'color-contrast': { enabled: false } },
  })
  return resultat.violations.map((violation) => violation.id)
}
