/**
 * Unit tests for user validation schemas.
 */

import {
  inviteUserSchema,
  updateMemberRoleSchema,
  updateMemberActiveSchema,
  upsertRolePermissionSchema,
  upsertUserPermissionSchema,
  deleteMemberSchema,
  upsertRolePermissionBodySchema,
} from '@/lib/validations/users'

describe('inviteUserSchema', () => {
  it('accepts valid input', () => {
    const result = inviteUserSchema.parse({
      email: 'max@example.com',
      role: 'verkaeufer',
    })
    expect(result.email).toBe('max@example.com')
    expect(result.role).toBe('verkaeufer')
  })

  it('rejects invalid email', () => {
    expect(() =>
      inviteUserSchema.parse({ email: 'invalid', role: 'verkaeufer' })
    ).toThrow()
  })

  it('rejects invalid role', () => {
    expect(() =>
      inviteUserSchema.parse({ email: 'max@example.com', role: 'invalid' })
    ).toThrow()
  })
})

describe('updateMemberRoleSchema', () => {
  it('accepts valid input with memberId', () => {
    const result = updateMemberRoleSchema.parse({
      memberId: '550e8400-e29b-41d4-a716-446655440000',
      role: 'administration',
    })
    expect(result.memberId).toBe('550e8400-e29b-41d4-a716-446655440000')
    expect(result.role).toBe('administration')
  })

  it('rejects invalid UUID', () => {
    expect(() =>
      updateMemberRoleSchema.parse({ memberId: 'not-uuid', role: 'verkaeufer' })
    ).toThrow()
  })
})

describe('updateMemberActiveSchema', () => {
  it('accepts valid input', () => {
    const result = updateMemberActiveSchema.parse({
      memberId: '550e8400-e29b-41d4-a716-446655440000',
      isActive: false,
    })
    expect(result.isActive).toBe(false)
  })
})

describe('upsertRolePermissionSchema', () => {
  it('accepts valid input', () => {
    const result = upsertRolePermissionSchema.parse({
      role: 'geschaeftsfuehrer',
      permissionCode: 'menu_projects',
      allowed: true,
    })
    expect(result.permissionCode).toBe('menu_projects')
    expect(result.allowed).toBe(true)
  })

  it('rejects empty permissionCode', () => {
    expect(() =>
      upsertRolePermissionSchema.parse({
        role: 'verkaeufer',
        permissionCode: '',
        allowed: false,
      })
    ).toThrow()
  })
})

describe('upsertUserPermissionSchema', () => {
  it('accepts valid input', () => {
    const result = upsertUserPermissionSchema.parse({
      userId: '550e8400-e29b-41d4-a716-446655440000',
      permissionCode: 'menu_tickets',
      allowed: true,
    })
    expect(result.userId).toBe('550e8400-e29b-41d4-a716-446655440000')
  })
})

describe('deleteMemberSchema', () => {
  it('accepts memberId only', () => {
    const result = deleteMemberSchema.parse({
      memberId: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.memberId).toBe('550e8400-e29b-41d4-a716-446655440000')
  })

  it('accepts inviteId only', () => {
    const result = deleteMemberSchema.parse({
      inviteId: '550e8400-e29b-41d4-a716-446655440001',
    })
    expect(result.inviteId).toBe('550e8400-e29b-41d4-a716-446655440001')
  })

  it('rejects when neither memberId nor inviteId', () => {
    expect(() => deleteMemberSchema.parse({})).toThrow()
  })
})

describe('upsertRolePermissionBodySchema', () => {
  it('accepts valid input', () => {
    const result = upsertRolePermissionBodySchema.parse({
      companyId: '550e8400-e29b-41d4-a716-446655440000',
      role: 'monteur',
      permissionCode: 'menu_deliveries',
      allowed: true,
    })
    expect(result.companyId).toBe('550e8400-e29b-41d4-a716-446655440000')
  })
})
