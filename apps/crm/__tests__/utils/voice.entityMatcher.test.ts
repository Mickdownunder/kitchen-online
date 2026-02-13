import { matchCustomerByHint, matchProjectByHint } from '@/lib/voice/entityMatcher'

type QueryResult = { data: unknown; error: unknown }

function createBuilder(result: QueryResult) {
  const builder: Record<string, jest.Mock> = {
    select: jest.fn(),
    eq: jest.fn(),
    in: jest.fn(),
    order: jest.fn(),
    limit: jest.fn(),
    then: jest.fn(),
  }

  builder.select.mockReturnValue(builder)
  builder.eq.mockReturnValue(builder)
  builder.in.mockReturnValue(builder)
  builder.order.mockReturnValue(builder)
  builder.limit.mockReturnValue(builder)
  builder.then.mockImplementation((resolve: (value: QueryResult) => unknown) => {
    return Promise.resolve(result).then(resolve)
  })

  return builder
}

function createMatcherClient(config: {
  companyMembers: QueryResult
  projects?: QueryResult
  customers?: QueryResult
}) {
  const builders: Record<string, ReturnType<typeof createBuilder>> = {
    company_members: createBuilder(config.companyMembers),
    projects: createBuilder(config.projects || { data: [], error: null }),
    customers: createBuilder(config.customers || { data: [], error: null }),
  }

  const from = jest.fn().mockImplementation((table: string) => {
    return builders[table]
  })

  return {
    client: { from } as never,
    from,
    builders,
  }
}

describe('voice entity matcher', () => {
  it('matches project by exact order number', async () => {
    const { client } = createMatcherClient({
      companyMembers: {
        data: [{ user_id: 'user-1' }],
        error: null,
      },
      projects: {
        data: [
          { id: 'p-1', order_number: 'K-2026-1001', customer_name: 'Musterkunde', user_id: 'user-1' },
          { id: 'p-2', order_number: 'K-2026-1002', customer_name: 'Anderer Kunde', user_id: 'user-1' },
        ],
        error: null,
      },
    })

    const result = await matchProjectByHint(client, 'company-1', 'K-2026-1001')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.bestId).toBe('p-1')
      expect(result.data.confidence).toBeGreaterThan(0.9)
    }
  })

  it('returns NOT_FOUND when company has no active members', async () => {
    const { client } = createMatcherClient({
      companyMembers: {
        data: [],
        error: null,
      },
    })

    const result = await matchProjectByHint(client, 'company-1', 'anything')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('NOT_FOUND')
    }
  })

  it('matches customer by name', async () => {
    const { client } = createMatcherClient({
      companyMembers: {
        data: [{ user_id: 'user-1' }],
        error: null,
      },
      customers: {
        data: [
          { id: 'c-1', first_name: 'Anna', last_name: 'Maier', company_name: null, user_id: 'user-1' },
          { id: 'c-2', first_name: 'Peter', last_name: 'Müller', company_name: null, user_id: 'user-1' },
        ],
        error: null,
      },
    })

    const result = await matchCustomerByHint(client, 'company-1', 'Peter Müller')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.bestId).toBe('c-2')
      expect(result.data.confidence).toBeGreaterThan(0.9)
    }
  })
})
