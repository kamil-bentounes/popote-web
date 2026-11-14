/**
 * Ce qui rendrait touchable ou focalisable un élément qui ne doit qu'informer (pastille, avatar). Une même règle sert le type (`Omit`)
 * et l'exécution (`sansInteraction`) : un appelant en JavaScript, ou un objet converti, n'y fait pas entrer ce que le type refuse.
 * Ce qui se touche est un bouton ou un lien (règle 9 du système). La règle est un motif, non une liste de gestionnaires : une liste
 * oublie les variantes `...Capture` et `onPointerCancel`.
 */
type FamilleDeGestionnaires = 'Click' | 'DoubleClick' | 'AuxClick' | 'ContextMenu' | 'Key' | 'Pointer' | 'Mouse' | 'Touch' | 'Drag' | 'Drop' | 'Focus'

const GESTIONNAIRE = /^on(Click|DoubleClick|AuxClick|ContextMenu|Key|Pointer|Mouse|Touch|Drag|Drop|Focus)/

/** Les attributs qui font d'un élément un contrôle (rôle, ordre du clavier, édition, glisser) ou en annoncent l'état. */
const ATTRIBUTS = [
  'role', 'tabIndex', 'contentEditable', 'draggable', 'accessKey', 'popover',
  'aria-pressed', 'aria-expanded', 'aria-haspopup', 'aria-checked', 'aria-selected',
] as const

export type Interactif = `on${FamilleDeGestionnaires}${string}` | (typeof ATTRIBUTS)[number]

const estInteractif = (nom: string): boolean => GESTIONNAIRE.test(nom) || (ATTRIBUTS as readonly string[]).includes(nom)

export function sansInteraction<T extends object>(attributs: T): Omit<T, Interactif> {
  return Object.fromEntries(Object.entries(attributs).filter(([nom]) => !estInteractif(nom))) as Omit<T, Interactif>
}
