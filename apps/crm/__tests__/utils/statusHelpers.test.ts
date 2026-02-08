/**
 * Unit tests for status helper utilities.
 */

import { ProjectStatus } from '@/types'
import {
  getStatusColor,
  getStatusLabel,
  isLeadStatus,
  isCompletedStatus,
  getStatusOrder,
  getDeliveryNoteStatusColor,
} from '@/lib/utils/statusHelpers'

describe('getStatusColor', () => {
  it('returns Tailwind classes for known statuses', () => {
    expect(getStatusColor(ProjectStatus.LEAD)).toContain('amber')
    expect(getStatusColor(ProjectStatus.COMPLETED)).toContain('green')
    expect(getStatusColor(ProjectStatus.COMPLAINT)).toContain('red')
    expect(getStatusColor(ProjectStatus.PLANNING)).toContain('slate')
  })

  it('returns default for unknown status', () => {
    const result = getStatusColor('UNKNOWN' as ProjectStatus)
    expect(result).toContain('slate')
  })
})

describe('getStatusLabel', () => {
  it('returns German label for known statuses', () => {
    expect(getStatusLabel(ProjectStatus.LEAD)).toBe('Lead')
    expect(getStatusLabel(ProjectStatus.COMPLETED)).toBe('Abgeschlossen')
    expect(getStatusLabel(ProjectStatus.PLANNING)).toBe('Planung')
  })

  it('returns stringified value for unknown status', () => {
    expect(getStatusLabel('UNKNOWN' as ProjectStatus)).toBe('UNKNOWN')
  })
})

describe('isLeadStatus', () => {
  it('returns true for LEAD enum', () => {
    expect(isLeadStatus(ProjectStatus.LEAD)).toBe(true)
  })

  it('returns true for "Lead" string', () => {
    expect(isLeadStatus('Lead')).toBe(true)
  })

  it('returns false for other statuses', () => {
    expect(isLeadStatus(ProjectStatus.PLANNING)).toBe(false)
    expect(isLeadStatus('Planung')).toBe(false)
  })
})

describe('isCompletedStatus', () => {
  it('returns true for COMPLETED enum', () => {
    expect(isCompletedStatus(ProjectStatus.COMPLETED)).toBe(true)
  })

  it('returns true for "Abgeschlossen" string', () => {
    expect(isCompletedStatus('Abgeschlossen')).toBe(true)
  })

  it('returns false for other statuses', () => {
    expect(isCompletedStatus(ProjectStatus.PLANNING)).toBe(false)
  })
})

describe('getStatusOrder', () => {
  it('returns ascending order for workflow', () => {
    expect(getStatusOrder(ProjectStatus.LEAD)).toBeLessThan(
      getStatusOrder(ProjectStatus.PLANNING)
    )
    expect(getStatusOrder(ProjectStatus.PLANNING)).toBeLessThan(
      getStatusOrder(ProjectStatus.COMPLETED)
    )
  })

  it('returns 99 for unknown status', () => {
    expect(getStatusOrder('UNKNOWN' as ProjectStatus)).toBe(99)
  })
})

describe('getDeliveryNoteStatusColor', () => {
  it('returns Tailwind classes for known delivery note statuses', () => {
    expect(getDeliveryNoteStatusColor('pending')).toContain('amber')
    expect(getDeliveryNoteStatusColor('complete')).toContain('green')
    expect(getDeliveryNoteStatusColor('cancelled')).toContain('red')
  })

  it('returns default for unknown status', () => {
    const result = getDeliveryNoteStatusColor('unknown')
    expect(result).toContain('slate')
  })
})
