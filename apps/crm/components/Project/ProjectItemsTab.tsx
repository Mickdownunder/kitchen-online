'use client'

import React, { useState } from 'react'
import { Plus, Trash2, Search, Package, Edit2, Check, GripVertical } from 'lucide-react'
import { CustomerProject, InvoiceItem, Article } from '@/types'
import { useAuth } from '@/hooks/useAuth'
import { usePriceInput } from '@/hooks/usePriceInput'
import { calculateItemTotalsFromGross, roundTo2Decimals } from '@/lib/utils/priceCalculations'

interface ProjectItemsTabProps {
  formData: Partial<CustomerProject>
  setFormData: React.Dispatch<React.SetStateAction<Partial<CustomerProject>>>
  calculations: {
    netTotal: number
    taxTotal: number
    grossTotal: number
    totalPurchaseNet: number
    profitNet: number
    marginPercent: number
    taxByRate: Record<number, number>
  }
  addItem: () => void
  updateItem: (id: string, updates: Partial<InvoiceItem>) => void
  removeItem: (id: string) => void
  // Article selection
  articles: Article[]
  articleSearchTerm: string
  setArticleSearchTerm: (term: string) => void
  showArticleDropdown: boolean
  setShowArticleDropdown: (show: boolean) => void
  filteredArticles: Article[]
  addArticleAsItem: (article: Article) => void
}

// Separate component for purchase price input to use hook
function PurchasePriceInput({
  item,
  updateItem,
}: {
  item: InvoiceItem
  updateItem: (id: string, updates: Partial<InvoiceItem>) => void
}) {
  const priceInput = usePriceInput({
    initialValue: item.purchasePricePerUnit,
    onValueChange: value => {
      // Wenn leer oder 0, setze undefined (nicht 0), damit es später erfasst werden kann
      updateItem(item.id, { purchasePricePerUnit: value && value > 0 ? value : undefined })
    },
    allowEmpty: true,
    min: 0,
  })

  return (
    <div className="flex items-center justify-end gap-1">
      <input
        {...priceInput}
        type="text"
        className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-right text-sm outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="0,00"
        inputMode="decimal"
        title="Einkaufspreis - wird später bei Lieferantenrechnung erfasst"
      />
      <span className="text-xs text-slate-500">€</span>
    </div>
  )
}

// Separate component for quantity input to use hook
function QuantityInput({
  item,
  updateItem,
}: {
  item: InvoiceItem
  updateItem: (id: string, updates: Partial<InvoiceItem>) => void
}) {
  const quantityInput = usePriceInput({
    initialValue: item.quantity || 1,
    onValueChange: value => {
      const nextQty = value && value > 0 ? value : 1
      // If we have an exact gross-per-unit, keep gross exact when quantity changes.
      if (item.grossPricePerUnit !== undefined && item.grossPricePerUnit !== null) {
        updateItem(item.id, {
          quantity: nextQty,
          grossTotal: nextQty * item.grossPricePerUnit,
        })
      } else {
        updateItem(item.id, { quantity: nextQty })
      }
    },
    allowEmpty: false,
    min: 0.01,
  })

  return (
    <input
      {...quantityInput}
      type="text"
      className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-center text-sm outline-none focus:ring-2 focus:ring-amber-500"
      placeholder="1,00"
      inputMode="decimal"
    />
  )
}

export function ProjectItemsTab({
  formData,
  setFormData,
  calculations,
  addItem,
  updateItem,
  removeItem,
  articles,
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

    // Entferne alle Zeichen außer Ziffern, Komma und Punkt
    let cleaned = value.replace(/[^\d,.-]/g, '')

    // WICHTIG: Tausenderpunkte entfernen BEVOR Komma umgewandelt wird!
    // Deutsche Formatierung: Punkt = Tausender, Komma = Dezimal

    if (cleaned.includes(',')) {
      // Komma vorhanden → Komma ist Dezimal, alle Punkte sind Tausender
      cleaned = cleaned.replace(/\./g, '') // Entferne alle Punkte (Tausender)
      cleaned = cleaned.replace(',', '.') // Komma zu Punkt (für parseFloat)
    } else if (cleaned.includes('.')) {
      // Nur Punkt vorhanden → Prüfe ob Tausenderpunkt oder Dezimalpunkt
      const parts = cleaned.split('.')

      if (parts.length > 2) {
        // Mehrere Punkte → alle sind Tausender (z.B. "1.000.000")
        cleaned = cleaned.replace(/\./g, '')
      } else if (parts.length === 2) {
        // Ein Punkt → Prüfe ob Tausenderpunkt oder Dezimalpunkt
        const afterDot = parts[1]

        // Wenn nach dem Punkt genau 3 Ziffern → wahrscheinlich Tausenderpunkt (z.B. "1.000", "100.000")
        // Wenn nach dem Punkt 1-2 Ziffern → Dezimalpunkt (z.B. "1.5", "1.50")
        if (afterDot.length === 3) {
          // 3 Ziffern → Tausenderpunkt (entfernen)
          cleaned = cleaned.replace(/\./g, '')
        }
        // 1-2 Ziffern → Dezimalpunkt (Punkt bleibt, wird von parseFloat korrekt behandelt)
      }
    }

    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? 0 : parsed
  }

  const handlePriceInput = (itemId: string, value: string, isGross: boolean) => {
    // Speichere den rohen Input-Wert für freie Eingabe
    setPriceInputs(prev => ({ ...prev, [itemId]: value }))

    // Erlaube freie Eingabe während des Tippens
    if (value === '' || value === ',' || value === '.') {
      return // Warte auf vollständige Eingabe
    }

    const numValue = parseNumber(value)
    if (isNaN(numValue) || numValue < 0) return

    const item = formData.items?.find(i => i.id === itemId)
    if (!item) return

    if (isGross && numValue > 0) {
      // Verwende zentrale Utility-Funktion für Brutto-basierte Berechnung
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
      // Netto direkt setzen, auf 2 Dezimalstellen runden
      const roundedNetPrice = roundTo2Decimals(numValue)
      updateItem(itemId, { pricePerUnit: roundedNetPrice, grossPricePerUnit: undefined })
    }
  }

  const handlePriceBlur = (itemId: string, isGross: boolean) => {
    const rawInput = priceInputs[itemId]
    if (!rawInput || rawInput === '') {
      setPriceInputs(prev => {
        const newState = { ...prev }
        delete newState[itemId]
        return newState
      })
      return
    }

    const numValue = parseNumber(rawInput)
    const item = formData.items?.find(i => i.id === itemId)
    if (!item) return

    if (isGross && numValue > 0) {
      // Verwende zentrale Utility-Funktion für Brutto-basierte Berechnung
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
      // Netto direkt setzen, auf 2 Dezimalstellen runden
      const roundedNetPrice = roundTo2Decimals(numValue)
      updateItem(itemId, { pricePerUnit: roundedNetPrice, grossPricePerUnit: undefined })
    }

    // Lösche den rohen Input nach dem Blur
    setPriceInputs(prev => {
      const newState = { ...prev }
      delete newState[itemId]
      return newState
    })
  }

  const getDisplayPrice = (item: InvoiceItem, isGross: boolean, itemId?: string): string => {
    // Wenn gerade bearbeitet wird, zeige den rohen Input
    if (itemId && priceInputs[itemId] !== undefined) {
      return priceInputs[itemId] || ''
    }

    if (isGross) {
      // If user entered a gross price previously, show that exact value
      if (item.grossPricePerUnit !== undefined && item.grossPricePerUnit !== null) {
        return formatNumber(item.grossPricePerUnit, true) || ''
      }
      // Fallback: derive gross-per-unit from persisted grossTotal to keep stable after reload
      if (item.grossTotal && item.quantity) {
        const derived = roundTo2Decimals(item.grossTotal / item.quantity)
        return formatNumber(derived, true) || ''
      }
      if (!item.pricePerUnit) return ''
      const taxRate = (item.taxRate || 20) / 100
      const grossPrice = item.pricePerUnit * (1 + taxRate)
      // Runde auf 2 Dezimalstellen für präzise Anzeige
      const roundedGrossPrice = roundTo2Decimals(grossPrice)
      return formatNumber(roundedGrossPrice, true) || ''
    }
    return formatNumber(item.pricePerUnit, true) || ''
  }

  const startEditing = (itemId: string) => {
    setEditingItemId(itemId)
  }

  const stopEditing = () => {
    setEditingItemId(null)
  }

  const handleAddItem = () => {
    addItem()
    // Setze das neue Item als editing
    const newItems = formData.items || []
    if (newItems.length > 0) {
      setEditingItemId(newItems[newItems.length - 1].id)
    }
  }

  // Drag & Drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null) return

    const items = [...(formData.items || [])]
    if (draggedIndex !== index) {
      const draggedItem = items[draggedIndex]
      items.splice(draggedIndex, 1)
      items.splice(index, 0, draggedItem)

      // Update positions
      const updatedItems = items.map((item, idx) => ({
        ...item,
        position: idx + 1,
      }))

      setFormData({ ...formData, items: updatedItems })
      setDraggedIndex(index)
    }
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const _moveItem = (fromIndex: number, toIndex: number) => {
    const items = [...(formData.items || [])]
    const [moved] = items.splice(fromIndex, 1)
    items.splice(toIndex, 0, moved)

    const updatedItems = items.map((item, idx) => ({
      ...item,
      position: idx + 1,
    }))

    setFormData({ ...formData, items: updatedItems })
  }

  return (
    <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between gap-4">
        <h4 className="text-xl font-black tracking-tight text-slate-900">Angebots-Positionen</h4>
        <div className="flex gap-2">
          {/* Price Mode Toggle */}
          <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setPriceMode('netto')}
              className={`rounded-lg px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${
                priceMode === 'netto'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Netto
            </button>
            <button
              type="button"
              onClick={() => setPriceMode('brutto')}
              className={`rounded-lg px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${
                priceMode === 'brutto'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Brutto
            </button>
          </div>

          {/* Article Selection */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowArticleDropdown(!showArticleDropdown)}
              className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-sm transition-all hover:bg-emerald-600 active:scale-95"
            >
              <Package className="h-3 w-3" /> Artikelstamm
            </button>

            {showArticleDropdown && (
              <>
                <div
                  className="fixed inset-0 z-[9999]"
                  onClick={() => setShowArticleDropdown(false)}
                />
                <div className="absolute right-0 top-full z-[10000] mt-2 w-96 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
                  <div className="border-b border-slate-200 p-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Artikel suchen..."
                        value={articleSearchTerm}
                        onChange={e => setArticleSearchTerm(e.target.value)}
                        className="w-full rounded-lg bg-slate-50 py-2 pl-10 pr-4 text-sm outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-emerald-500"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {filteredArticles.length === 0 ? (
                      <div className="p-4 text-center text-sm text-slate-400">
                        Keine Artikel gefunden
                      </div>
                    ) : (
                      filteredArticles.map(article => (
                        <button
                          key={article.id}
                          type="button"
                          onClick={() => {
                            addArticleAsItem(article)
                            setShowArticleDropdown(false)
                          }}
                          className="w-full border-b border-slate-100 p-3 text-left transition-all last:border-0 hover:bg-slate-50"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="text-sm font-bold text-slate-900">{article.name}</div>
                              <div className="mt-0.5 text-xs text-slate-500">
                                {article.sku} {article.manufacturer && `• ${article.manufacturer}`}
                              </div>
                            </div>
                            <div className="ml-2 text-right">
                              <div className="text-sm font-black text-emerald-600">
                                {formatNumber(article.defaultSalePrice)} €
                              </div>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={handleAddItem}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-900 shadow-sm transition-all hover:bg-amber-600 active:scale-95"
          >
            <Plus className="h-3 w-3" /> Neue Zeile
          </button>
        </div>
      </div>

      {/* Compact Table Layout */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="w-8 px-3 py-3 text-center text-xs font-black uppercase tracking-widest text-slate-500"></th>
                <th className="w-12 px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500">
                  Pos
                </th>
                <th className="w-32 px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500">
                  Modellnummer
                </th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500">
                  Beschreibung
                </th>
                <th className="w-24 px-4 py-3 text-center text-xs font-black uppercase tracking-widest text-slate-500">
                  Menge
                </th>
                <th className="w-20 px-4 py-3 text-center text-xs font-black uppercase tracking-widest text-slate-500">
                  Einheit
                </th>
                <th className="w-32 px-4 py-3 text-right text-xs font-black uppercase tracking-widest text-slate-500">
                  Preis ({priceMode === 'netto' ? 'Netto' : 'Brutto'})
                </th>
                {canViewPurchasePrices && (
                  <th className="w-28 px-4 py-3 text-right text-xs font-black uppercase tracking-widest text-slate-500">
                    EK-Preis
                    <span className="mt-0.5 block text-[9px] font-normal normal-case text-slate-400">
                      (später erfassen)
                    </span>
                  </th>
                )}
                <th className="w-32 px-4 py-3 text-right text-xs font-black uppercase tracking-widest text-slate-500">
                  Gesamt
                </th>
                {canViewMargins && (
                  <th className="w-24 px-4 py-3 text-right text-xs font-black uppercase tracking-widest text-slate-500">
                    Marge
                  </th>
                )}
                <th className="w-20 px-4 py-3 text-center text-xs font-black uppercase tracking-widest text-slate-500">
                  MwSt
                </th>
                <th className="w-20 px-4 py-3 text-center text-xs font-black uppercase tracking-widest text-slate-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(!formData.items || formData.items.length === 0) && (
                <tr>
                  <td
                    colSpan={(() => {
                      if (canViewPurchasePrices && canViewMargins) return 11
                      if (canViewPurchasePrices || canViewMargins) return 10
                      return 9
                    })()}
                    className="px-4 py-12 text-center text-slate-400"
                  >
                    <Package className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    <p className="text-sm font-bold">Noch keine Positionen</p>
                    <p className="mt-1 text-xs">Klicken Sie auf "Neue Zeile" oder "Artikelstamm"</p>
                  </td>
                </tr>
              )}

              {(formData.items || []).map((item, index) => {
                const isEditing = editingItemId === item.id
                const displayPrice = getDisplayPrice(item, priceMode === 'brutto', item.id)
                const quantity = item.quantity || 1
                const pricePerUnit = item.pricePerUnit || 0
                const taxRate = (item.taxRate || 20) / 100

                const totalNet = quantity * pricePerUnit
                // In BRUTTO-Modus: wenn wir einen user-entered Brutto-Preis haben, berechne Gesamt aus dem Brutto-Preis,
                // sonst fallback zur Netto→Brutto-Berechnung.
                const totalGross =
                  priceMode === 'brutto' &&
                  item.grossPricePerUnit !== undefined &&
                  item.grossPricePerUnit !== null
                    ? quantity * item.grossPricePerUnit
                    : Number.isFinite(item.grossTotal) && item.grossTotal > 0
                      ? item.grossTotal
                      : totalNet * (1 + taxRate)

                // Runde auf 2 Dezimalstellen für Anzeige
                const roundedTotalNet = roundTo2Decimals(totalNet)
                const roundedTotalGross = roundTo2Decimals(totalGross)

                return (
                  <tr
                    key={item.id || index}
                    className={`transition-colors hover:bg-slate-50 ${draggedIndex === index ? 'opacity-50' : ''}`}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={e => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                  >
                    <td className="cursor-move px-3 py-3 text-center">
                      <GripVertical className="h-4 w-4 text-slate-400" />
                    </td>

                    <td className="px-4 py-3 text-sm font-bold text-slate-500">{index + 1}</td>

                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          type="text"
                          value={item.modelNumber || ''}
                          onChange={e => updateItem(item.id, { modelNumber: e.target.value })}
                          className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                          placeholder="Modellnummer"
                        />
                      ) : (
                        <span className="text-sm font-medium text-slate-700">
                          {item.modelNumber || '-'}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          type="text"
                          value={item.description || ''}
                          onChange={e => updateItem(item.id, { description: e.target.value })}
                          className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                          placeholder="Beschreibung"
                          autoFocus
                        />
                      ) : (
                        <div className="text-sm font-medium text-slate-900">
                          {item.description || '-'}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <QuantityInput item={item} updateItem={updateItem} />
                      ) : (
                        <span className="text-sm font-medium text-slate-700">
                          {formatNumber(quantity, true)}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <select
                          value={item.unit || 'Stk'}
                          onChange={e => {
                            const unit = e.target.value as InvoiceItem['unit']
                            updateItem(item.id, { unit })
                          }}
                          className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          <option value="Stk">Stk</option>
                          <option value="Pkg">Pkg</option>
                          <option value="Std">Std</option>
                          <option value="Paush">Paush</option>
                          <option value="m">m</option>
                          <option value="lfm">lfm</option>
                          <option value="m²">m²</option>
                        </select>
                      ) : (
                        <span className="text-xs font-medium text-slate-600">
                          {item.unit || 'Stk'}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="text"
                            value={displayPrice}
                            onChange={e => {
                              const val = e.target.value
                              // Erlaube freie Eingabe - keine blockierenden Nullen
                              handlePriceInput(item.id, val, priceMode === 'brutto')
                            }}
                            onBlur={() => {
                              handlePriceBlur(item.id, priceMode === 'brutto')
                            }}
                            className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-right text-sm outline-none focus:ring-2 focus:ring-amber-500"
                            placeholder="0,00"
                            inputMode="decimal"
                          />
                          <span className="text-xs text-slate-500">€</span>
                        </div>
                      ) : (
                        <span className="text-sm font-bold text-slate-900">
                          {displayPrice ? `${displayPrice} €` : '-'}
                        </span>
                      )}
                    </td>

                    {canViewPurchasePrices && (
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <PurchasePriceInput item={item} updateItem={updateItem} />
                        ) : (
                          <span className="text-sm font-medium text-slate-600">
                            {item.purchasePricePerUnit && item.purchasePricePerUnit > 0 ? (
                              `${formatNumber(item.purchasePricePerUnit, true)} €`
                            ) : (
                              <span className="text-xs italic text-slate-400">
                                noch nicht erfasst
                              </span>
                            )}
                          </span>
                        )}
                      </td>
                    )}

                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-black text-slate-900">
                        {formatNumber(roundedTotalGross, true)
                          ? `${formatNumber(roundedTotalGross, true)} €`
                          : '-'}
                      </span>
                    </td>

                    {canViewMargins && (
                      <td className="px-4 py-3 text-right">
                        {(() => {
                          const purchaseTotal = (item.purchasePricePerUnit || 0) * quantity
                          // Marge = Netto-Verkaufspreis - Einkaufspreis (beide Netto!)
                          const saleNetTotal = roundedTotalNet // Netto-Verkaufspreis
                          const margin = saleNetTotal - purchaseTotal
                          // Marge % = (Gewinn / Netto-Verkaufspreis) * 100
                          const marginPercent = saleNetTotal > 0 ? (margin / saleNetTotal) * 100 : 0

                          if (!item.purchasePricePerUnit || item.purchasePricePerUnit === 0) {
                            return (
                              <span
                                className="text-xs italic text-slate-400"
                                title="Marge wird angezeigt, sobald EK-Preis erfasst wurde"
                              >
                                -
                              </span>
                            )
                          }

                          return (
                            <div className="text-right">
                              <div
                                className={`text-xs font-bold ${margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                              >
                                {formatNumber(margin, true)} €
                              </div>
                              <div
                                className={`text-[10px] ${marginPercent >= 0 ? 'text-emerald-500' : 'text-red-500'}`}
                              >
                                {formatNumber(marginPercent, true)}%
                              </div>
                            </div>
                          )
                        })()}
                      </td>
                    )}

                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <select
                          value={item.taxRate || 20}
                          onChange={e =>
                            updateItem(item.id, {
                              taxRate: parseInt(e.target.value) as 10 | 13 | 20,
                            })
                          }
                          className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          <option value={10}>10%</option>
                          <option value={13}>13%</option>
                          <option value={20}>20%</option>
                        </select>
                      ) : (
                        <span className="text-xs font-medium text-slate-600">
                          {item.taxRate || 20}%
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {isEditing ? (
                          <button
                            type="button"
                            onClick={stopEditing}
                            className="rounded bg-emerald-100 p-1.5 transition-colors hover:bg-emerald-200"
                            title="Speichern"
                          >
                            <Check className="h-3.5 w-3.5 text-emerald-700" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEditing(item.id)}
                            className="rounded bg-slate-100 p-1.5 transition-colors hover:bg-slate-200"
                            title="Bearbeiten"
                          >
                            <Edit2 className="h-3.5 w-3.5 text-slate-600" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="rounded bg-red-100 p-1.5 transition-colors hover:bg-red-200"
                          title="Löschen"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      {formData.items && formData.items.length > 0 && (
        <div className="rounded-xl bg-slate-900 p-6 text-white">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <div>
              <div className="mb-1 text-xs font-black uppercase tracking-widest text-slate-400">
                Netto
              </div>
              <div className="text-lg font-black text-white">
                {formatNumber(calculations.netTotal)
                  ? `${formatNumber(calculations.netTotal)} €`
                  : '0,00 €'}
              </div>
            </div>
            {Object.entries(calculations.taxByRate).map(([rate, amount]) => (
              <div key={rate}>
                <div className="mb-1 text-xs font-black uppercase tracking-widest text-slate-400">
                  MwSt. {rate}%
                </div>
                <div className="text-lg font-black text-white">
                  {formatNumber(amount) ? `${formatNumber(amount)} €` : '0,00 €'}
                </div>
              </div>
            ))}
            <div>
              <div className="mb-1 text-xs font-black uppercase tracking-widest text-slate-400">
                Brutto
              </div>
              <div className="text-2xl font-black text-amber-500">
                {formatNumber(calculations.grossTotal)
                  ? `${formatNumber(calculations.grossTotal)} €`
                  : '0,00 €'}
              </div>
            </div>
            {canViewPurchasePrices && (
              <div>
                <div className="mb-1 text-xs font-black uppercase tracking-widest text-slate-400">
                  EK-Gesamt
                </div>
                <div className="text-lg font-black text-slate-300">
                  {formatNumber(calculations.totalPurchaseNet) ? (
                    `${formatNumber(calculations.totalPurchaseNet)} €`
                  ) : (
                    <span className="text-sm italic text-slate-500">noch nicht erfasst</span>
                  )}
                </div>
              </div>
            )}
            {canViewMargins && (
              <div>
                <div className="mb-1 text-xs font-black uppercase tracking-widest text-slate-400">
                  Gewinn
                </div>
                {calculations.totalPurchaseNet > 0 ? (
                  <>
                    <div
                      className={`text-lg font-black ${calculations.profitNet >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                    >
                      {formatNumber(calculations.profitNet)
                        ? `${formatNumber(calculations.profitNet)} €`
                        : '0,00 €'}
                    </div>
                    <div
                      className={`mt-1 text-xs font-bold ${calculations.marginPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                    >
                      Marge: {formatNumber(calculations.marginPercent, true)}%
                    </div>
                  </>
                ) : (
                  <div className="text-sm italic text-slate-500">
                    Wird angezeigt, sobald EK-Preise erfasst wurden
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
