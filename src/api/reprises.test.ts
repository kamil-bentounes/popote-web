import { describe, expect, it } from 'vitest'
import { ErreurApi, ErreurReseau, TropDeDemandes } from './erreurs'
import { estCleIdempotence, nouvelleCle, type CleIdempotence } from './idempotence'
import { delaiDeReprise, optionsEcriture, reessaie } from './reprises'

const api = (status: number, retryApresS?: number) => new ErreurApi({ status, title: 'x', retryApresS })
const coupure = () => new ErreurReseau('coupure', { cause: new TypeError('x') })

describe('reessaie : ce qui vaut une reprise', () => {
  it.each([
    ['une coupure du réseau', coupure()],
    ['un délai dépassé', new ErreurReseau('delai', { cause: new Error('x') })],
    ['un 502', api(502)],
    ['un 503', api(503)],
    ['un 504', api(504)],
  ])('réessaie %s, deux fois', (_cas, erreur) => {
    expect([reessaie(0, erreur), reessaie(1, erreur), reessaie(2, erreur)]).toEqual([true, true, false])
  })

  it.each([400, 401, 403, 404, 408, 409, 412, 422, 425, 428, 500, 501])('ne réessaie jamais un %i', (status) => {
    expect(reessaie(0, api(status))).toBe(false)
  })

  it('ne réessaie pas une 429 : l’écran montre le compte à rebours', () => {
    expect(reessaie(0, new TropDeDemandes({ status: 429, title: 'x', retryApresS: 5 }))).toBe(false)
  })

  it('ne réessaie ni une annulation ni une erreur de programmation', () => {
    expect(reessaie(0, new DOMException('annulé', 'AbortError'))).toBe(false)
    expect(reessaie(0, new TypeError('x'))).toBe(false)
  })

  it('ne réessaie pas une réponse réussie illisible (statut 0)', () => {
    expect(reessaie(0, api(0))).toBe(false)
  })
})

describe('delaiDeReprise : combien attendre', () => {
  it('honore le Retry-After de l’API, en millisecondes', () => {
    expect(delaiDeReprise(0, api(503, 3))).toBe(3_000)
  })

  it('borne le Retry-After à 10 s', () => {
    expect(delaiDeReprise(0, api(503, 600))).toBe(10_000)
    expect(delaiDeReprise(0, api(503, 10))).toBe(10_000)
  })

  it('recule d’une reprise à l’autre quand rien n’est dit, sans dépasser 5 s', () => {
    expect([0, 1, 2, 3, 10].map((n) => delaiDeReprise(n, coupure()))).toEqual([1_000, 2_000, 4_000, 5_000, 5_000])
    expect(delaiDeReprise(0, api(502))).toBe(1_000)
  })
})

describe('optionsEcriture : une écriture ne repart qu’avec sa clé d’idempotence', () => {
  it('passe les variables telles quelles à l’écriture', async () => {
    const options = optionsEcriture(async (variables: { cle: CleIdempotence; n: number }) => variables.n)
    await expect(options.mutationFn?.({ cle: nouvelleCle(() => 'abc'), n: 3 }, {} as never)).resolves.toBe(3)
  })

  it('refuse à la compilation une simple chaîne en guise de clé', () => {
    const options = optionsEcriture(async (_variables: { cle: CleIdempotence }) => 1)
    // @ts-expect-error une chaîne quelconque n'est pas une clé fabriquée par `nouvelleCle` (vérifié par `tsc -b`, jamais appelé)
    const appelleAvecUneChaine = () => options.mutationFn?.({ cle: '"abc"' }, {} as never)
    expect(appelleAvecUneChaine).toBeTypeOf('function')
  })

  it.each([[''], ['abc'], ['"'], ['""'], ['"a'], ['"abc"x'], ['x"abc"'], ['"a"b"'], ['"a\\b"'], ['"é"'], [`"${'a'.repeat(254)}"`], [undefined]])('refuse des variables dont la clé est %o', async (cle) => {
    const options = optionsEcriture(async (_variables: { cle: CleIdempotence }) => 1)
    await expect(options.mutationFn?.({ cle } as never, {} as never)).rejects.toThrow(TypeError)
  })

  it('réessaie selon la même règle que les lectures', () => {
    const options = optionsEcriture(async (_variables: { cle: CleIdempotence }) => 1)
    const retry = options.retry as (nombre: number, erreur: Error) => boolean
    expect(retry(0, api(503))).toBe(true)
    expect(retry(0, api(404))).toBe(false)
    expect(retry(2, api(503))).toBe(false)
  })
})

describe('estCleIdempotence : la forme que le contrat accepte', () => {
  it('accepte la clé fabriquée et le plus long identifiant admis (253 caractères entre guillemets)', () => {
    expect(estCleIdempotence(nouvelleCle())).toBe(true)
    expect(estCleIdempotence(`"${'a'.repeat(253)}"`)).toBe(true)
  })
})
