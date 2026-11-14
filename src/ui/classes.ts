/** Assemble des noms de classe : les valeurs vides (`false`, `undefined`, `''`) disparaissent. */
export function classes(...noms: Array<string | false | undefined>): string {
  return noms.filter(Boolean).join(' ')
}
