'use client'

import { useMemo, useState } from 'react'
import type { DateRangeResult, TimeRange } from '@/components/accounting/accounting.types'

interface DateRangeParams {
  timeRange: TimeRange
  selectedMonth: string
  selectedQuarter: string
  selectedYear: number
  customStartDate: string
  customEndDate: string
}

interface UseAccountingDateRangeResult {
  timeRange: TimeRange
  setTimeRange: (value: TimeRange) => void
  selectedMonth: string
  setSelectedMonth: (value: string) => void
  selectedQuarter: string
  setSelectedQuarter: (value: string) => void
  selectedYear: number
  setSelectedYear: (value: number) => void
  customStartDate: string
  setCustomStartDate: (value: string) => void
  customEndDate: string
  setCustomEndDate: (value: string) => void
  dateRange: DateRangeResult
}

function createInitialMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function createInitialQuarter(): string {
  const now = new Date()
  const quarter = Math.floor(now.getMonth() / 3) + 1
  return `${now.getFullYear()}-Q${quarter}`
}

function createInitialCustomStartDate(): string {
  const date = new Date()
  date.setMonth(date.getMonth() - 1)
  return date.toISOString().split('T')[0]
}

function createInitialCustomEndDate(): string {
  return new Date().toISOString().split('T')[0]
}

export function buildDateRange({
  timeRange,
  selectedMonth,
  selectedQuarter,
  selectedYear,
  customStartDate,
  customEndDate,
}: DateRangeParams): DateRangeResult {
  if (timeRange === 'month') {
    const [year, month] = selectedMonth.split('-').map(Number)
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59)
    return {
      startDate,
      endDate,
      label: new Date(year, month - 1).toLocaleDateString('de-DE', {
        month: 'long',
        year: 'numeric',
      }),
    }
  }

  if (timeRange === 'quarter') {
    const [yearPart, quarterPart] = selectedQuarter.split('-Q')
    const year = Number(yearPart)
    const quarter = Number(quarterPart)
    const startMonth = (quarter - 1) * 3
    const startDate = new Date(year, startMonth, 1)
    const endDate = new Date(year, startMonth + 3, 0, 23, 59, 59)
    return { startDate, endDate, label: `${quarter}. Quartal ${year}` }
  }

  if (timeRange === 'custom') {
    const startDate = new Date(customStartDate)
    const endDate = new Date(customEndDate)
    endDate.setHours(23, 59, 59, 999)
    return { startDate, endDate, label: `${customStartDate} – ${customEndDate}` }
  }

  const startDate = new Date(selectedYear, 0, 1)
  const endDate = new Date(selectedYear, 11, 31, 23, 59, 59)
  return { startDate, endDate, label: `Jahr ${selectedYear}` }
}

export function useAccountingDateRange(): UseAccountingDateRangeResult {
  const [timeRange, setTimeRange] = useState<TimeRange>('month')
  const [selectedMonth, setSelectedMonth] = useState<string>(createInitialMonth)
  const [selectedQuarter, setSelectedQuarter] = useState<string>(createInitialQuarter)
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [customStartDate, setCustomStartDate] = useState<string>(createInitialCustomStartDate)
  const [customEndDate, setCustomEndDate] = useState<string>(createInitialCustomEndDate)

  const dateRange = useMemo(
    () =>
      buildDateRange({
        timeRange,
        selectedMonth,
        selectedQuarter,
        selectedYear,
        customStartDate,
        customEndDate,
      }),
    [customEndDate, customStartDate, selectedMonth, selectedQuarter, selectedYear, timeRange],
  )

  return {
    timeRange,
    setTimeRange,
    selectedMonth,
    setSelectedMonth,
    selectedQuarter,
    setSelectedQuarter,
    selectedYear,
    setSelectedYear,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    dateRange,
  }
}
