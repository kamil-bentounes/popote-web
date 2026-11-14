import type { ReactNode } from 'react'

/** Un cas du banc : un composant dans un état, avec la légende de la page de référence qui lui correspond. */
export interface Cas {
  legende: string
  /**
   * Le début de la légende de `reference.html` que `e2e/comparaison.spec.ts` apparie à ce cas (sans casse ni espaces
   * multiples ; l'égalité exacte l'emporte sur le début ; il doit désigner UNE légende). Sans lui, le cas n'a pas de pendant.
   * Une pastille de couleur a pour légende son texte ; un bloc seul, sans légende, celle du `h2` de sa section.
   */
  reference?: string
  rendu: ReactNode
}

/**
 * Une section du banc, exportée sous le nom `section` par un fichier de `src/banc/sections/`. Plusieurs fichiers qui
 * désignent le même `reference` (le `h2` de `reference.html`) sont fusionnés. Une section sans pendant dans la page de
 * référence se nomme par `titre`.
 */
export type Section = {
  cas: Cas[]
  /**
   * La largeur minimale d'une colonne de la grille, en px, comme dans la page de référence (230 par défaut ; 150 pour les
   * couleurs, 320 pour les scènes) ; `'pleine'` pour une section dont le bloc occupe toute la largeur (la typographie).
   * Sans cela, la comparaison mesurerait des cas plus larges ou plus étroits que ceux de la référence.
   */
  colonne?: number | 'pleine'
  /**
   * Les légendes de `reference.html` (début de légende, comme `Cas.reference`) que le banc ne montre pas encore parce qu'un lot
   * suivant les porte : « À maintenir » (F10), les cases du code (F11). Le lot qui ajoute le cas retire la déclaration : une
   * déclaration que le banc contredit fait échouer la comparaison (`e2e/comparaison/appariement.ts`).
   */
  reportees?: string[]
} & (
  | { reference: string; titre?: string }
  | { titre: string; reference?: undefined }
)

export function titreDe(section: Section): string {
  return section.reference === undefined ? section.titre : (section.titre ?? section.reference)
}

/** Fusionne les sections qui désignent le même titre, dans l'ordre reçu (celui des noms de fichier). */
export interface SectionFusionnee {
  titre: string
  reference?: string
  colonne?: number | 'pleine'
  reportees?: string[]
  cas: Cas[]
}

export function fusionne(sections: Section[]): SectionFusionnee[] {
  const parTitre = new Map<string, SectionFusionnee>()
  for (const section of sections) {
    const titre = titreDe(section)
    const deja = parTitre.get(titre)
    parTitre.set(titre, {
      titre,
      reference: section.reference ?? deja?.reference,
      colonne: section.colonne ?? deja?.colonne,
      reportees: section.reportees || deja?.reportees ? [...(deja?.reportees ?? []), ...(section.reportees ?? [])] : undefined,
      cas: [...(deja?.cas ?? []), ...section.cas],
    })
  }
  return [...parTitre.values()]
}
