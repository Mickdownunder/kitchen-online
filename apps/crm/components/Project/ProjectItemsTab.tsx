'use client'

import React, { useState } from 'react'
import { CustomerProject, InvoiceItem, Article } from '@/types'
import { ApplianceModal } from './ApplianceModal'
import { useAuth } from '@/hooks/useAuth'
import { calculateItemTotalsFromGross, roundTo2Decimals } from '@/lib/utils/priceCalculations'
import { ItemsTable } from './items/ItemsTable'
import { ItemTotalsPanel } from './items/ItemTotalsPanel'

interface ProjectItemsTabProps {
  formData: Partial<CustomerProject>
  setFormData: React.Dispatch<React.SetStateAction<Partial<CustomerProject>>>
  calculations: {
    netTotal: number
    taxTotal: number
    grossTotal: number
    totalPurchaseNet: number
    profitNet: number | null
    marginPercent: number | null
    taxByRate: Record<number, number>
  }
  addItem: () => void
  updateItem: (id: string, updates: Partial<InvoiceItem>) => void
  removeItem: (id: string) => void
  articles: Article[]
  articleSearchTerm: string
  setArticleSearchTerm: (term: string) => void
  showArticleDropdown: boolean
  setShowArticleDropdown: (show: boolean) => void
  filteredArticles: Article[]
  addArticleAsItem: (article: Article) => void
}

export function ProjectItemsTab({
  formData,
  setFormData,
  calculations,
  addItem,
  updateItem,
  removeItem,
  articleSearchTerm,
  setArticleSearchTerm,
  showArticleDropdown,
  setShowArticleDropdown,
  filteredArticles,
  addArticleAsItem,
}: ProjectItemsTabProps) {
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [priceMode, setPriceMode] = useState<'netto' | 'brutto'>('brutto')
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>({})
  const [applianceModalItem, setApplianceModalItem] = useState<InvoiceItem | null>(null)

  const { hasPermission } = useAuth()
  const canViewPurchasePrices = hasPermission('view_purchase_prices')
  const canViewMargins = hasPermission('view_margins')

  const formatNumber = (value: number | undefined | null, showZero: boolean = false): string => {
    if (value === undefined || value === null || isNaN(value)) return ''
    if (value === 0 && !showZero) return ''
    return value.toFixed(2).replace('.', ',')
  }

  const parseNumber = (value: string): number => {
    if (!value || value.trim() === '') return 0

    let cleaned = value.replace(/[^\d,.-]/g, '')

    if (cleaned.includes(',')) {
      cleaned = cleaned.replace(/\./g, '')
      cleaned = cleaned.replace(',', '.')
    } else if (cleaned.includes('.')) {
      const parts = cleaned.split('.')

      if (parts.length > 2) {
        cleaned = cleaned.replace(/\./g, '')
      } else if (parts.length === 2) {
        const afterDot = parts[1]
        if (afterDot.length === 3) {
          cleaned = cleaned.replace(/\./g, '')
        }
      }
    }

    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? 0 : parsed
  }

  const handlePriceInput = (itemId: string, value: string, isGross: boolean) => {
    setPriceInputs((prev) => ({ ...prev, [itemId]: value }))

    if (value === '' || value === ',' || value === '.') {
      return
    }

    const numValue = parseNumber(value)
    if (isNaN(numValue) || numValue < 0) return

    const item = formData.items?.find((entry) => entry.id === itemId)
    if (!item) return

    if (isGross && numValue > 0) {
      const quantity = item.quantity || 1
      const taxRate = item.taxRate || 20
      const grossPerUnit = roundTo2Decimals(numValue)
      const totals = calculateItemTotalsFromGross(quantity, grossPerUnit, taxRate)

      updateItem(itemId, {
        pricePerUnit: totals.pricePerUnit,
        grossPricePerUnit: grossPerUnit,
        grossTotal: totals.grossTotal,
      })
    } else {
      const roundedNetPrice = roundTo2Decimals(numValue)
      updateItem(itemId, { pricePerUnit: roundedNetPrice, grossPricePerUnit: undefined })
    }
  }

  const handlePriceBlur = (itemId: string, isGross: boolean) => {
    const rawInput = priceInputs[itemId]
    if (!rawInput || rawInput === '') {
      setPriceInputs((prev) => {
        const newState = { ...prev }
        delete newState[itemId]
        return newState
      })
      return
    }

    const numValue = parseNumber(rawInput)
    const item = formData.items?.find((entry) => entry.id === itemId)
    if (!item) return

    if (isGross && numValue > 0) {
      const quantity = item.quantity || 1
      const taxRate = item.taxRate || 20
      const grossPerUnit = roundTo2Decimals(numValue)
      const totals = calculateItemTotalsFromGross(quantity, grossPerUnit, taxRate)

      updateItem(itemId, {
        pricePerUnit: totals.pricePerUnit,
        grossPricePerUnit: grossPerUnit,
        grossTotal: totals.grossTotal,
      })
    } else {
      const roundedNetPrice = roundTo2Decimals(numValue)
      updateItem(itemId, { pricePerUnit: roundedNetPrice, grossPricePerUnit: undefined })
    }

    setPriceInputs((prev) => {
      const newState = { ...prev }
      delete newState[itemId]
      return newState
    })
  }

  const getDisplayPrice = (item: InvoiceItem, isGross: boolean, itemId?: string): string => {
    if (itemId && priceInputs[itemId] !== undefined) {
      return priceInputs[itemId] || ''
    }

    if (isGross) {
      if (item.grossPricePerUnit !== undefined && item.grossPricePerUnit !== null) {
        return formatNumber(item.grossPricePerUnit, true) || ''
      }
      if (item.grossTotal && item.quantity) {
        const derived = roundTo2Decimals(item.grossTotal / item.quantity)
        return formatNumber(derived, true) || ''
      }
      if (!item.pricePerUnit) return ''
      const taxRate = (item.taxRate || 20) / 100
      const grossPrice = item.pricePerUnit * (1 + taxRate)
      const roundedGrossPrice = roundTo2Decimals(grossPrice)
      return formatNumber(roundedGrossPrice, true) || ''
    }

    return formatNumber(item.pricePerUnit, true) || ''
  }

  const handleAddItem = () => {
    addItem()
    const nextItems = formData.items || []
    if (nextItems.length > 0) {
      setEditingItemId(nextItems[nextItems.length - 1].id)
    }
  }

  return (
    <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
      <ItemsTable
        formData={formData}
        setFormData={setFormData}
        onAddItem={handleAddItem}
        updateItem={updateItem}
        removeItem={removeItem}
        articleSearchTerm={articleSearchTerm}
        setArticleSearchTerm={setArticleSearchTerm}
        showArticleDropdown={showArticleDropdown}
        setShowArticleDropdown={setShowArticleDropdown}
        filteredArticles={filteredArticles}
        addArticleAsItem={addArticleAsItem}
        priceMode={priceMode}
        setPriceMode={setPriceMode}
        editingItemId={editingItemId}
        setEditingItemId={setEditingItemId}
        draggedIndex={draggedIndex}
        setDraggedIndex={setDraggedIndex}
        canViewPurchasePrices={canViewPurchasePrices}
        canViewMargins={canViewMargins}
        formatNumber={formatNumber}
        getDisplayPrice={getDisplayPrice}
        handlePriceInput={handlePriceInput}
        handlePriceBlur={handlePriceBlur}
        setApplianceModalItem={setApplianceModalItem}
      />

      {formData.items && formData.items.length > 0 && (
        <ItemTotalsPanel
          calculations={calculations}
          canViewPurchasePrices={canViewPurchasePrices}
          canViewMargins={canViewMargins}
          formatNumber={formatNumber}
        />
      )}

      {applianceModalItem && (
        <ApplianceModal
          item={applianceModalItem}
          isOpen={!!applianceModalItem}
          onClose={() => setApplianceModalItem(null)}
          onSave={(updates) => {
            updateItem(applianceModalItem.id, updates)
            setApplianceModalItem(null)
          }}
          projectId={formData.id}
        />
      )}
    </div>
  )
}
