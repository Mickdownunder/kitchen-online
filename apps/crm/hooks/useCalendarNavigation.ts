'use client'

import { useMemo, useState } from 'react'

export type ViewMode = 'day' | 'week' | 'month'

// Get calendar week number (ISO 8601)
const getWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

const monthNames = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
]

const dayNames = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']
const dayNamesShort = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

export function useCalendarNavigation() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('month')

  const goToToday = () => setCurrentDate(new Date())
  const goToPrev = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() - 1)
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7)
    } else {
      newDate.setMonth(newDate.getMonth() - 1)
    }
    setCurrentDate(newDate)
  }
  const goToNext = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + 1)
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setCurrentDate(newDate)
  }

  const daysForView = useMemo((): (Date | null)[] => {
    if (viewMode === 'day') {
      return [new Date(currentDate)]
    } else if (viewMode === 'week') {
      const startOfWeek = new Date(currentDate)
      const day = startOfWeek.getDay()
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
      startOfWeek.setDate(diff)
      return Array.from({ length: 7 }, (_, i) => {
        const date = new Date(startOfWeek)
        date.setDate(startOfWeek.getDate() + i)
        return date
      })
    } else {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)
      const startOfMonth = firstDay.getDay()
      const firstDayIndex = (startOfMonth + 6) % 7
      const days: (Date | null)[] = Array.from({ length: firstDayIndex }, () => null)
      for (let i = 1; i <= lastDay.getDate(); i++) {
        days.push(new Date(year, month, i))
      }
      return days
    }
  }, [currentDate, viewMode])

  const weekStart = useMemo(() => {
    const startOfWeek = new Date(currentDate)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
    startOfWeek.setDate(diff)
    return startOfWeek
  }, [currentDate])

  const formatHeaderDate = () => {
    if (viewMode === 'day') {
      return `${dayNames[(currentDate.getDay() + 6) % 7]}, ${currentDate.getDate()}. ${
        monthNames[currentDate.getMonth()]
      } ${currentDate.getFullYear()}`
    } else if (viewMode === 'week') {
      const weekStartDate = weekStart
      const weekEnd = new Date(weekStartDate)
      weekEnd.setDate(weekStartDate.getDate() + 6)
      const kw = getWeekNumber(weekStartDate)
      if (weekStartDate.getMonth() === weekEnd.getMonth()) {
        return `KW ${kw} • ${weekStartDate.getDate()}. – ${weekEnd.getDate()}. ${
          monthNames[weekStartDate.getMonth()]
        } ${weekStartDate.getFullYear()}`
      }
      return `KW ${kw} • ${weekStartDate.getDate()}. ${monthNames[weekStartDate.getMonth()].slice(
        0,
        3
      )} – ${weekEnd.getDate()}. ${monthNames[weekEnd.getMonth()].slice(0, 3)} ${weekEnd.getFullYear()}`
    }
    return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
  }

  return {
    currentDate,
    setCurrentDate,
    viewMode,
    setViewMode,
    goToToday,
    goToPrev,
    goToNext,
    daysForView,
    weekStart,
    formatHeaderDate,
    getWeekNumber,
    monthNames,
    dayNames,
    dayNamesShort,
  }
}
