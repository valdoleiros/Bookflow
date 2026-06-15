/**
 * Creates a chainable, awaitable Supabase mock.
 *
 * `tableResponses` maps table name → { data, error } returned by .single(),
 * .maybeSingle(), and direct await (update/insert/delete without .single()).
 *
 * For routes that call the same table multiple times with different expected
 * results, pass an array instead of an object:
 *   tableResponses: { bookings: [firstCallResp, secondCallResp] }
 */

export type MockResponse = { data: any; error: any }
type TableConfig = MockResponse | MockResponse[]

function makeChain(resp: MockResponse) {
  const chain: any = {}

  ;[
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'gte', 'lte', 'order', 'limit', 'filter', 'match',
    'in', 'not', 'or', 'is',
  ].forEach(m => {
    chain[m] = jest.fn().mockReturnThis()
  })

  chain.single      = jest.fn().mockResolvedValue(resp)
  chain.maybeSingle = jest.fn().mockResolvedValue(resp)

  // Make chain directly awaitable (for `await supabase.from().update().eq()`)
  chain.then  = (resolve: any, reject: any) => Promise.resolve(resp).then(resolve, reject)
  chain.catch = (handler: any) => Promise.resolve(resp).catch(handler)

  return chain
}

export function createSupabaseMock(
  tableResponses: Record<string, TableConfig> = {},
  user: object | null = { id: 'owner-uid', email: 'test@test.com' }
) {
  const callCounts: Record<string, number> = {}

  return {
    from: jest.fn((table: string) => {
      const config = tableResponses[table] ?? { data: null, error: null }
      if (Array.isArray(config)) {
        const idx = callCounts[table] ?? 0
        callCounts[table] = idx + 1
        return makeChain(config[idx] ?? config[config.length - 1])
      }
      return makeChain(config as MockResponse)
    }),
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user },
        error: null,
      }),
    },
  }
}
