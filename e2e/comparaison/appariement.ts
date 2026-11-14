/** Une légende de `reference.html`, lue dans le navigateur après exécution de la page. */
export interface LegendeReference {
  legende: string
  /** `cas` : un `.cas` avec sa `<small>` ; `nuance` : une pastille de couleur ; `bloc` : un bloc seul, sans légende. */
  genre: 'cas' | 'nuance' | 'bloc'
  /** Sa place dans la page, posée en `data-cmp` pour la retrouver. */
  rang: number
}

export interface SectionReference {
  titre: string
  elements: LegendeReference[]
}

export interface CasBanc {
  legende: string
  /** Le début de la légende de la référence ; sans lui, le cas n'a pas de pendant. */
  reference?: string
}

export interface SectionBanc {
  titre: string
  /** Le `h2` de la section de la référence ; sans lui, la section n'a pas de pendant. */
  reference?: string
  cas: CasBanc[]
}

export interface Paire {
  section: string
  legende: string
  reference: LegendeReference
}

export interface Appariement {
  paires: Paire[]
  /** Ce qui fait échouer la comparaison. */
  erreurs: string[]
  /** Les cas du banc sans pendant : signalés, jamais une erreur. */
  sansPendant: string[]
  /** Les sections de la référence que le banc ne montre pas encore. */
  nonPortees: string[]
}

/** Sans casse ni espaces multiples : les mots, eux, comptent. */
export const normalise = (texte: string): string => texte.normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase()

/** Un nom de fichier : sans accent ni ponctuation, jamais vide. */
export function slug(texte: string): string {
  const nom = texte.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return nom === '' ? 'x' : nom
}

/** L'égalité exacte l'emporte sur le début : « tomate » désigne « tomate », non « tomate foncée ». */
function candidates(elements: LegendeReference[], debut: string): LegendeReference[] {
  const voulu = normalise(debut)
  const exacts = elements.filter((e) => normalise(e.legende) === voulu)
  return exacts.length === 1 ? exacts : elements.filter((e) => normalise(e.legende).startsWith(voulu))
}

/** Apparie chaque cas du banc à la légende de la référence qu'il désigne : par la légende, jamais par la position. */
export function apparie(reference: SectionReference[], banc: SectionBanc[]): Appariement {
  const resultat: Appariement = { paires: [], erreurs: [], sansPendant: [], nonPortees: [] }
  const portees = new Set<string>()

  for (const section of banc) {
    if (section.reference === undefined) {
      resultat.sansPendant.push(...section.cas.map((c) => `${section.titre} / ${c.legende}`))
      continue
    }
    const cible = reference.find((r) => normalise(r.titre) === normalise(section.reference ?? ''))
    if (!cible) {
      resultat.erreurs.push(`aucune section de reference.html ne s’appelle « ${section.reference} » (section « ${section.titre} » du banc)`)
      continue
    }
    portees.add(cible.titre)

    const vues = new Set<string>()
    const prises = new Map<number, string>()
    for (const cas of section.cas) {
      if (vues.has(normalise(cas.legende))) {
        resultat.erreurs.push(`deux cas de la section « ${section.titre} » portent la légende « ${cas.legende} »`)
      }
      vues.add(normalise(cas.legende))
      if (cas.reference === undefined) {
        resultat.sansPendant.push(`${section.titre} / ${cas.legende}`)
        continue
      }
      const trouvees = candidates(cible.elements, cas.reference)
      const [une, ...autres] = trouvees
      if (!une) {
        resultat.erreurs.push(`« ${cas.reference} » ne désigne aucune légende de la section « ${cible.titre} » de reference.html`)
      } else if (autres.length > 0) {
        resultat.erreurs.push(`« ${cas.reference} » désigne plusieurs légendes de « ${cible.titre} » : ${trouvees.map((t) => `« ${t.legende} »`).join(', ')}`)
      } else if (prises.has(une.rang)) {
        resultat.erreurs.push(`les cas « ${prises.get(une.rang)} » et « ${cas.legende} » désignent la même légende de la référence (« ${une.legende} »)`)
      } else {
        prises.set(une.rang, cas.legende)
        resultat.paires.push({ section: section.titre, legende: cas.legende, reference: une })
      }
    }
    for (const element of cible.elements) {
      if (!prises.has(element.rang)) {
        resultat.erreurs.push(`la légende « ${element.legende} » de reference.html manque au banc (section « ${cible.titre} »)`)
      }
    }
  }
  resultat.nonPortees = reference.filter((r) => !portees.has(r.titre)).map((r) => r.titre)
  return resultat
}
