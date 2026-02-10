import React from 'react'
import {
  Check,
  Edit2,
  GripVertical,
  Package,
  Plus,
  Search,
  Shield,
  Trash2,
} from 'lucide-react'
import { Article, CustomerProject, InvoiceItem } from '@/types'
import { usePriceInput } from '@/hooks/usePriceInput'
import { roundTo2Decimals } from '@/lib/utils/priceCalculations'
import {
  applyItemMaterialUpdate,
  DELIVERY_STATUS_LABELS,
  getItemMaterialSnapshot,
} from '@/lib/utils/materialTracking'

const DELIVERY_STATUS_CLASSES: Record<NonNullable<InvoiceItem['deliveryStatus']>, string> = {
  not_ordered: 'border-slate-200 bg-slate-100 text-slate-700',
  ordered: 'border-blue-200 bg-blue-50 text-blue-700',
  partially_delivered: 'border-amber-200 bg-amber-50 text-amber-700',
  delivered: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  missing: 'border-red-200 bg-red-50 text-red-700',
}

function formatMaterialDate(date?: string): string | null {
  if (!date) {
    return null
  }
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  return parsed.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
}

function parseQuantityInput(value: string): number {
  if (!value.trim()) {
    return 0
  }
  const normalized = value.replace(',', '.')
  const parsed = Number.parseFloat(normalized)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0
  }
  return parsed
}

interface ItemRowEditorProps {
  item: InvoiceItem
  index: number
  isEditing: boolean
  draggedIndex: number | null
  priceMode: 'netto' | 'brutto'
  canViewPurchasePrices: boolean
  canViewMargins: boolean
  formatNumber: (value: number | undefined | null, showZero?: boolean) => string
  getDisplayPrice: (item: InvoiceItem, isGross: boolean, itemId?: string) => string
  handlePriceInput: (itemId: string, value: string, isGross: boolean) => void
  handlePriceBlur: (itemId: string, isGross: boolean) => void
  updateItem: (id: string, updates: Partial<InvoiceItem>) => void
  removeItem: (id: string) => void
  setApplianceModalItem: (item: InvoiceItem) => void
  onDragStart: (index: number) => void
  onDragOver: (event: React.DragEvent, index: number) => void
  onDragEnd: () => void
  onStartEditing: (itemId: string) => void
  onStopEditing: () => void
}

function PurchasePriceInput({
  item,
  updateItem,
}: {
  item: InvoiceItem
  updateItem: (id: string, updates: Partial<InvoiceItem>) => void
}) {
  const priceInput = usePriceInput({
    initialValue: item.purchasePricePerUnit,
    onValueChange: (value) => {
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

function QuantityInput({
  item,
  updateItem,
}: {
  item: InvoiceItem
  updateItem: (id: string, updates: Partial<InvoiceItem>) => void
}) {
  const quantityInput = usePriceInput({
    initialValue: item.quantity || 1,
    onValueChange: (value) => {
      const nextQty = value && value > 0 ? value : 1
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

export function ItemRowEditor({
  item,
  index,
  isEditing,
  draggedIndex,
  priceMode,
  canViewPurchasePrices,
  canViewMargins,
  formatNumber,
  getDisplayPrice,
  handlePriceInput,
  handlePriceBlur,
  updateItem,
  removeItem,
  setApplianceModalItem,
  onDragStart,
  onDragOver,
  onDragEnd,
  onStartEditing,
  onStopEditing,
}: ItemRowEditorProps) {
  const displayPrice = getDisplayPrice(item, priceMode === 'brutto', item.id)
  const quantity = item.quantity || 1
  const pricePerUnit = item.pricePerUnit || 0
  const taxRate = (item.taxRate || 20) / 100

  const totalNet = quantity * pricePerUnit
  const totalGross =
    priceMode === 'brutto' && item.grossPricePerUnit !== undefined && item.grossPricePerUnit !== null
      ? quantity * item.grossPricePerUnit
      : Number.isFinite(item.grossTotal) && item.grossTotal > 0
        ? item.grossTotal
        : totalNet * (1 + taxRate)

  const roundedTotalNet = roundTo2Decimals(totalNet)
  const roundedTotalGross = roundTo2Decimals(totalGross)
  const material = getItemMaterialSnapshot(item)

  const updateMaterial = (
    patch: Pick<
      Partial<InvoiceItem>,
      'deliveryStatus' | 'quantityOrdered' | 'quantityDelivered' | 'expectedDeliveryDate' | 'actualDeliveryDate'
    >,
  ) => {
    updateItem(item.id, applyItemMaterialUpdate(item, patch))
  }

  return (
    <tr
      className={`transition-colors hover:bg-slate-50 ${draggedIndex === index ? 'opacity-50' : ''}`}
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(event) => onDragOver(event, index)}
      onDragEnd={onDragEnd}
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
            onChange={(event) => updateItem(item.id, { modelNumber: event.target.value })}
            className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-500"
            placeholder="Modellnummer"
          />
        ) : (
          <span className="text-sm font-medium text-slate-700">{item.modelNumber || '-'}</span>
        )}
      </td>

      <td className="px-4 py-3 align-top">
        {isEditing ? (
          <textarea
            value={item.description || ''}
            onChange={(event) => updateItem(item.id, { description: event.target.value })}
            className="min-h-[60px] w-full resize-y rounded border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-500"
            placeholder="Beschreibung (Enter = neue Zeile)"
            rows={2}
            autoFocus
          />
        ) : (
          <div className="whitespace-pre-line text-sm font-medium text-slate-900">
            {item.description || '-'}
          </div>
        )}
      </td>

      <td className="px-4 py-3 text-center">
        {isEditing ? (
          <QuantityInput item={item} updateItem={updateItem} />
        ) : (
          <span className="text-sm font-medium text-slate-700">{formatNumber(quantity, true)}</span>
        )}
      </td>

      <td className="px-4 py-3 text-center">
        {isEditing ? (
          <select
            value={item.unit || 'Stk'}
            onChange={(event) => updateItem(item.id, { unit: event.target.value as InvoiceItem['unit'] })}
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
          <span className="text-xs font-medium text-slate-600">{item.unit || 'Stk'}</span>
        )}
      </td>

      <td className="min-w-[240px] px-4 py-3 align-top">
        {isEditing ? (
          <div className="space-y-2">
            <select
              value={material.status}
              onChange={(event) =>
                updateMaterial({
                  deliveryStatus: event.target.value as NonNullable<InvoiceItem['deliveryStatus']>,
                })
              }
              className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-500"
            >
              {Object.entries(DELIVERY_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Bestellt
                </span>
                <input
                  type="text"
                  value={material.orderedQuantity > 0 ? formatNumber(material.orderedQuantity, true) : ''}
                  onChange={(event) => {
                    const nextQuantityOrdered = parseQuantityInput(event.target.value)
                    updateMaterial({
                      quantityOrdered: nextQuantityOrdered,
                      deliveryStatus: nextQuantityOrdered > 0 ? material.status : 'not_ordered',
                    })
                  }}
                  placeholder="0,00"
                  className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-amber-500"
                  inputMode="decimal"
                />
              </label>
              <label className="space-y-1">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  ETA
                </span>
                <input
                  type="date"
                  value={material.expectedDeliveryDate || ''}
                  onChange={(event) =>
                    updateMaterial({
                      expectedDeliveryDate: event.target.value || undefined,
                    })
                  }
                  className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-amber-500"
                />
              </label>
            </div>

            <div className="rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-[10px] font-semibold text-slate-600">
              Wareneingang: {formatNumber(material.deliveredQuantity, true) || '0,00'} /{' '}
              {formatNumber(material.quantity, true) || '0,00'}
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <span
              className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wider ${DELIVERY_STATUS_CLASSES[material.status]}`}
            >
              {DELIVERY_STATUS_LABELS[material.status]}
            </span>
            <div className="text-xs font-semibold text-slate-600">
              Bestellt: {formatNumber(material.orderedQuantity, true) || '0,00'} /{' '}
              {formatNumber(material.quantity, true) || '0,00'}
            </div>
            <div className="text-xs font-semibold text-slate-500">
              Wareneingang: {formatNumber(material.deliveredQuantity, true) || '0,00'} /{' '}
              {formatNumber(material.quantity, true) || '0,00'}
            </div>
            {(material.expectedDeliveryDate || material.actualDeliveryDate) && (
              <div className="text-[10px] font-medium text-slate-500">
                {material.expectedDeliveryDate && (
                  <span>ETA {formatMaterialDate(material.expectedDeliveryDate)}</span>
                )}
                {material.actualDeliveryDate && (
                  <span className={material.expectedDeliveryDate ? 'ml-2' : ''}>
                    WE {formatMaterialDate(material.actualDeliveryDate)}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </td>

      <td className="px-4 py-3 text-right">
        {isEditing ? (
          <div className="flex items-center justify-end gap-1">
            <input
              type="text"
              value={displayPrice}
              onChange={(event) => handlePriceInput(item.id, event.target.value, priceMode === 'brutto')}
              onBlur={() => handlePriceBlur(item.id, priceMode === 'brutto')}
              className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-right text-sm outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="0,00"
              inputMode="decimal"
            />
            <span className="text-xs text-slate-500">€</span>
          </div>
        ) : (
          <span className="text-sm font-bold text-slate-900">{displayPrice ? `${displayPrice} €` : '-'}</span>
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
                <span className="text-xs italic text-slate-400">noch nicht erfasst</span>
              )}
            </span>
          )}
        </td>
      )}

      <td className="px-4 py-3 text-right">
        <span className="text-sm font-black text-slate-900">
          {formatNumber(roundedTotalGross, true) ? `${formatNumber(roundedTotalGross, true)} €` : '-'}
        </span>
      </td>

      {canViewMargins && (
        <td className="px-4 py-3 text-right">
          {(() => {
            const purchaseTotal = (item.purchasePricePerUnit || 0) * quantity
            const saleNetTotal = roundedTotalNet
            const margin = saleNetTotal - purchaseTotal
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
                <div className={`text-xs font-bold ${margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatNumber(margin, true)} €
                </div>
                <div className={`text-[10px] ${marginPercent >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
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
            onChange={(event) =>
              updateItem(item.id, {
                taxRate: parseInt(event.target.value) as 10 | 13 | 20,
              })
            }
            className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value={10}>10%</option>
            <option value={13}>13%</option>
            <option value={20}>20%</option>
          </select>
        ) : (
          <span className="text-xs font-medium text-slate-600">{item.taxRate || 20}%</span>
        )}
      </td>

      <td className="px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-1">
          {isEditing ? (
            <button
              type="button"
              onClick={onStopEditing}
              className="rounded bg-emerald-100 p-1.5 transition-colors hover:bg-emerald-200"
              title="Speichern"
            >
              <Check className="h-3.5 w-3.5 text-emerald-700" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onStartEditing(item.id)}
              className="rounded bg-slate-100 p-1.5 transition-colors hover:bg-slate-200"
              title="Bearbeiten"
            >
              <Edit2 className="h-3.5 w-3.5 text-slate-600" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setApplianceModalItem(item)}
            className={`rounded p-1.5 transition-colors ${
              item.showInPortal ? 'bg-amber-100 hover:bg-amber-200' : 'bg-slate-100 hover:bg-slate-200'
            }`}
            title="Geräte-Einstellungen"
          >
            <Shield className={`h-3.5 w-3.5 ${item.showInPortal ? 'text-amber-600' : 'text-slate-400'}`} />
          </button>
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
}

interface ItemsTableProps {
  formData: Partial<CustomerProject>
  onAddItem: () => void
  updateItem: (id: string, updates: Partial<InvoiceItem>) => void
  removeItem: (id: string) => void
  articleSearchTerm: string
  setArticleSearchTerm: (term: string) => void
  showArticleDropdown: boolean
  setShowArticleDropdown: (show: boolean) => void
  filteredArticles: Article[]
  addArticleAsItem: (article: Article) => void
  priceMode: 'netto' | 'brutto'
  setPriceMode: (mode: 'netto' | 'brutto') => void
  editingItemId: string | null
  setEditingItemId: (itemId: string | null) => void
  draggedIndex: number | null
  setDraggedIndex: (index: number | null) => void
  canViewPurchasePrices: boolean
  canViewMargins: boolean
  formatNumber: (value: number | undefined | null, showZero?: boolean) => string
  getDisplayPrice: (item: InvoiceItem, isGross: boolean, itemId?: string) => string
  handlePriceInput: (itemId: string, value: string, isGross: boolean) => void
  handlePriceBlur: (itemId: string, isGross: boolean) => void
  setApplianceModalItem: (item: InvoiceItem) => void
  setFormData: React.Dispatch<React.SetStateAction<Partial<CustomerProject>>>
}

export function ItemsTable({
  formData,
  onAddItem,
  updateItem,
  removeItem,
  articleSearchTerm,
  setArticleSearchTerm,
  showArticleDropdown,
  setShowArticleDropdown,
  filteredArticles,
  addArticleAsItem,
  priceMode,
  setPriceMode,
  editingItemId,
  setEditingItemId,
  draggedIndex,
  setDraggedIndex,
  canViewPurchasePrices,
  canViewMargins,
  formatNumber,
  getDisplayPrice,
  handlePriceInput,
  handlePriceBlur,
  setApplianceModalItem,
  setFormData,
}: ItemsTableProps) {
  const items = formData.items || []

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (event: React.DragEvent, index: number) => {
    event.preventDefault()
    if (draggedIndex === null) {
      return
    }

    const mutableItems = [...items]
    if (draggedIndex !== index) {
      const draggedItem = mutableItems[draggedIndex]
      mutableItems.splice(draggedIndex, 1)
      mutableItems.splice(index, 0, draggedItem)

      const updatedItems = mutableItems.map((item, positionIndex) => ({
        ...item,
        position: positionIndex + 1,
      }))

      setFormData({ ...formData, items: updatedItems })
      setDraggedIndex(index)
    }
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h4 className="text-xl font-black tracking-tight text-slate-900">Angebots-Positionen</h4>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setPriceMode('netto')}
              className={`rounded-lg px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${
                priceMode === 'netto' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Netto
            </button>
            <button
              type="button"
              onClick={() => setPriceMode('brutto')}
              className={`rounded-lg px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${
                priceMode === 'brutto' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Brutto
            </button>
          </div>

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
                <div className="fixed inset-0 z-[9999]" onClick={() => setShowArticleDropdown(false)} />
                <div className="absolute right-0 top-full z-[10000] mt-2 w-96 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
                  <div className="border-b border-slate-200 p-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Artikel suchen..."
                        value={articleSearchTerm}
                        onChange={(event) => setArticleSearchTerm(event.target.value)}
                        className="w-full rounded-lg bg-slate-50 py-2 pl-10 pr-4 text-sm outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-emerald-500"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {filteredArticles.length === 0 ? (
                      <div className="p-4 text-center text-sm text-slate-400">Keine Artikel gefunden</div>
                    ) : (
                      filteredArticles.map((article) => (
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
            onClick={onAddItem}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-900 shadow-sm transition-all hover:bg-amber-600 active:scale-95"
          >
            <Plus className="h-3 w-3" /> Neue Zeile
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="w-8 px-3 py-3 text-center text-xs font-black uppercase tracking-widest text-slate-500"></th>
                <th className="w-12 px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500">Pos</th>
                <th className="w-32 px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500">Modellnummer</th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500">Beschreibung</th>
                <th className="w-24 px-4 py-3 text-center text-xs font-black uppercase tracking-widest text-slate-500">Menge</th>
                <th className="w-20 px-4 py-3 text-center text-xs font-black uppercase tracking-widest text-slate-500">Einheit</th>
                <th className="w-60 px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500">
                  Materialstatus
                </th>
                <th className="w-32 px-4 py-3 text-right text-xs font-black uppercase tracking-widest text-slate-500">
                  Preis ({priceMode === 'netto' ? 'Netto' : 'Brutto'})
                </th>
                {canViewPurchasePrices && (
                  <th className="w-28 px-4 py-3 text-right text-xs font-black uppercase tracking-widest text-slate-500">
                    EK-Preis
                    <span className="mt-0.5 block text-[9px] font-normal normal-case text-slate-400">(später erfassen)</span>
                  </th>
                )}
                <th className="w-32 px-4 py-3 text-right text-xs font-black uppercase tracking-widest text-slate-500">Gesamt</th>
                {canViewMargins && (
                  <th className="w-24 px-4 py-3 text-right text-xs font-black uppercase tracking-widest text-slate-500">Marge</th>
                )}
                <th className="w-20 px-4 py-3 text-center text-xs font-black uppercase tracking-widest text-slate-500">MwSt</th>
                <th className="w-20 px-4 py-3 text-center text-xs font-black uppercase tracking-widest text-slate-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 && (
                <tr>
                  <td
                    colSpan={(() => {
                      if (canViewPurchasePrices && canViewMargins) return 13
                      if (canViewPurchasePrices || canViewMargins) return 12
                      return 11
                    })()}
                    className="px-4 py-12 text-center text-slate-400"
                  >
                    <Package className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    <p className="text-sm font-bold">Noch keine Positionen</p>
                    <p className="mt-1 text-xs">
                      Klicken Sie auf &quot;Neue Zeile&quot; oder &quot;Artikelstamm&quot;
                    </p>
                  </td>
                </tr>
              )}

              {items.map((item, index) => (
                <ItemRowEditor
                  key={item.id || index}
                  item={item}
                  index={index}
                  isEditing={editingItemId === item.id}
                  draggedIndex={draggedIndex}
                  priceMode={priceMode}
                  canViewPurchasePrices={canViewPurchasePrices}
                  canViewMargins={canViewMargins}
                  formatNumber={formatNumber}
                  getDisplayPrice={getDisplayPrice}
                  handlePriceInput={handlePriceInput}
                  handlePriceBlur={handlePriceBlur}
                  updateItem={updateItem}
                  removeItem={removeItem}
                  setApplianceModalItem={setApplianceModalItem}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  onStartEditing={setEditingItemId}
                  onStopEditing={() => setEditingItemId(null)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
