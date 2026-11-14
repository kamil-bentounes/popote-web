import type { ReactNode } from 'react'

/** Un cas du banc : un composant dans un état, avec la légende de la page de référence qui lui correspond. */
export interface Cas {
  legende: string
  /** Le début de la légende de `reference.html` (F8b l'apparie ; sans lui, le cas n'a pas de pendant). */
  reference?: string
  /** Identifie un cas sans légende dans la page de référence (Couleurs, Typographie). */
  cle?: string
  rendu: ReactNode
}

/**
 * Une section du banc, exportée sous le nom `section` par un fichier de `src/banc/sections/`. Plusieurs fichiers qui
 * désignent le même `reference` (le `h2` de `reference.html`) sont fusionnés. Une section sans pendant dans la page de
 * référence se nomme par `titre`.
 */
export type Section = { cas: Cas[] } & (
  | { reference: string; titre?: string }
  | { titre: string; reference?: undefined }
)

export function titreDe(section: Section): string {
  return section.reference === undefined ? section.titre : (section.titre ?? section.reference)
}

/** Fusionne les sections qui désignent le même titre, dans l'ordre reçu (celui des noms de fichier). */
export function fusionne(sections: Section[]): Array<{ titre: string; cas: Cas[] }> {
  const parTitre = new Map<string, Cas[]>()
  for (const section of sections) {
    const titre = titreDe(section)
    parTitre.set(titre, [...(parTitre.get(titre) ?? []), ...section.cas])
  }
  return [...parTitre].map(([titre, cas]) => ({ titre, cas }))
}
