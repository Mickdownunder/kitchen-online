'use client'

import React, { useState, useEffect } from 'react'
import { Edit2, Trash2, CheckCircle2, X } from 'lucide-react'
import type { Article } from '@/types'
import { usePriceInput } from '@/hooks/usePriceInput'

interface ArticleRowProps {
  article: Article
  isEditing: boolean
  canViewPurchasePrices: boolean
  searchTerm: string
  categoryLabels: Record<string, string>
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
  onSave: (article: Article) => void
  onCancelEdit: () => void
}

// Highlight search term in text
const highlightText = (text: string, search: string) => {
  if (!search.trim()) return text
  const parts = text.split(new RegExp(`(${search})`, 'gi'))
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === search.toLowerCase() ? (
          <mark key={i} className="bg-amber-200 font-bold text-slate-900">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  )
}

const formatNumber = (value: number | undefined | null, showZero: boolean = false): string => {
  if (value === undefined || value === null || isNaN(value)) return ''
  if (value === 0 && !showZero) return ''
  return value.toFixed(2).replace('.', ',')
}

function ArticlePriceInput({
  value,
  onChange,
  placeholder,
}: {
  value: number | undefined
  onChange: (_value: number | undefined) => void
  placeholder?: string
}) {
  const priceInput = usePriceInput({
    initialValue: value,
    onValueChange: onChange,
    allowEmpty: false,
    min: 0,
  })

  return (
    <input
      {...priceInput}
      type="text"
      className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-right text-sm outline-none focus:ring-2 focus:ring-amber-500"
      placeholder={placeholder || '0,00'}
      inputMode="decimal"
      onClick={e => e.stopPropagation()}
    />
  )
}

export const ArticleRow: React.FC<ArticleRowProps> = ({
  article,
  isEditing,
  canViewPurchasePrices,
  searchTerm,
  categoryLabels,
  onSelect,
  onEdit,
  onDelete,
  onSave,
  onCancelEdit,
}) => {
  // Lokaler State für die Bearbeitung - wird erst beim Speichern übertragen
  const [editData, setEditData] = useState<Article>(article)
  
  // Reset editData wenn article sich ändert oder Bearbeitung beginnt
  useEffect(() => {
    setEditData(article)
  }, [article, isEditing])

  const handleSave = () => {
    onSave(editData)
    onCancelEdit()
  }

  const handleCancel = () => {
    setEditData(article) // Reset
    onCancelEdit()
  }

  if (isEditing) {
    return (
      <tr className="bg-amber-50 transition-colors">
        <td className="px-4 py-3">
          <input
            type="text"
            value={editData.sku}
            onChange={e => setEditData({ ...editData, sku: e.target.value })}
            className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-500"
            onClick={e => e.stopPropagation()}
            autoFocus
          />
        </td>
        <td className="px-4 py-3">
          <input
            type="text"
            value={editData.name}
            onChange={e => setEditData({ ...editData, name: e.target.value })}
            className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-500"
            onClick={e => e.stopPropagation()}
          />
        </td>
        <td className="px-4 py-3">
          <input
            type="text"
            value={editData.manufacturer || ''}
            onChange={e => setEditData({ ...editData, manufacturer: e.target.value })}
            className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-500"
            onClick={e => e.stopPropagation()}
          />
        </td>
        <td className="px-4 py-3">
          <input
            type="text"
            value={editData.modelNumber || ''}
            onChange={e => setEditData({ ...editData, modelNumber: e.target.value })}
            className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-500"
            onClick={e => e.stopPropagation()}
          />
        </td>
        <td className="px-4 py-3">
          <select
            value={editData.category}
            onChange={e => setEditData({ ...editData, category: e.target.value as Article['category'] })}
            className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-500"
            onClick={e => e.stopPropagation()}
          >
            <option value="Kitchen">Küche</option>
            <option value="Appliance">Gerät</option>
            <option value="Accessory">Zubehör</option>
            <option value="Service">Service</option>
            <option value="Material">Material</option>
            <option value="Other">Sonstiges</option>
          </select>
        </td>
        {canViewPurchasePrices && (
          <td className="px-4 py-3 text-right">
            <ArticlePriceInput
              value={editData.defaultPurchasePrice}
              onChange={value => setEditData({ ...editData, defaultPurchasePrice: value || 0 })}
              placeholder="0,00"
            />
          </td>
        )}
        <td className="px-4 py-3 text-right">
          <ArticlePriceInput
            value={editData.defaultSalePrice}
            onChange={value => setEditData({ ...editData, defaultSalePrice: value || 0 })}
            placeholder="0,00"
          />
        </td>
        <td className="px-4 py-3 text-center">
          <select
            value={editData.taxRate}
            onChange={e =>
              setEditData({ ...editData, taxRate: parseInt(e.target.value) as 10 | 13 | 20 })
            }
            className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-500"
            onClick={e => e.stopPropagation()}
          >
            <option value={10}>10%</option>
            <option value={13}>13%</option>
            <option value={20}>20%</option>
          </select>
        </td>
        <td className="px-4 py-3 text-center">
          <select
            value={editData.unit}
            onChange={e => setEditData({ ...editData, unit: e.target.value as Article['unit'] })}
            className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-500"
            onClick={e => e.stopPropagation()}
          >
            <option value="Stk">Stk</option>
            <option value="Pkg">Pkg</option>
            <option value="Std">Std</option>
            <option value="Paush">Paush</option>
            <option value="m">m</option>
            <option value="lfm">lfm</option>
            <option value="m²">m²</option>
          </select>
        </td>
        <td className="px-4 py-3 text-center">
          <input
            type="number"
            value={editData.stockQuantity || 0}
            onChange={e => setEditData({ ...editData, stockQuantity: parseInt(e.target.value) || 0 })}
            className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-center text-sm outline-none focus:ring-2 focus:ring-amber-500"
            onClick={e => e.stopPropagation()}
          />
        </td>
        <td className="px-4 py-3">
          <div
            className="flex items-center justify-center gap-2"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={handleCancel}
              className="rounded bg-slate-100 p-1.5 transition-all hover:bg-slate-200"
              title="Abbrechen"
            >
              <X className="h-4 w-4 text-slate-600" />
            </button>
            <button
              onClick={handleSave}
              className="rounded bg-emerald-50 p-1.5 transition-all hover:bg-emerald-100"
              title="Speichern"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className="cursor-pointer transition-colors hover:bg-slate-50" onClick={onSelect}>
      <td className="px-4 py-3">
        <span className="text-sm font-bold text-slate-700">
          {highlightText(article.sku, searchTerm)}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm font-medium text-slate-900">
          {highlightText(article.name, searchTerm)}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-slate-600">
          {article.manufacturer ? highlightText(article.manufacturer, searchTerm) : '-'}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-slate-600">{article.modelNumber || '-'}</span>
      </td>
      <td className="px-4 py-3">
        <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
          {categoryLabels[article.category] || article.category}
        </span>
      </td>
      {canViewPurchasePrices && (
        <td className="px-4 py-3 text-right">
          <span className="text-sm font-medium text-slate-600">
            {formatNumber(article.defaultPurchasePrice, true)} €
          </span>
        </td>
      )}
      <td className="px-4 py-3 text-right">
        <span className="text-sm font-black text-slate-900">
          {formatNumber(article.defaultSalePrice, true)} €
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <span className="text-xs font-medium text-slate-600">{article.taxRate}%</span>
      </td>
      <td className="px-4 py-3 text-center">
        <span className="text-xs font-medium text-slate-600">{article.unit}</span>
      </td>
      <td className="px-4 py-3 text-center">
        <span
          className={`text-xs font-medium ${
            (article.stockQuantity || 0) > 0 ? 'text-emerald-600' : 'text-slate-400'
          }`}
        >
          {article.stockQuantity || 0}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-center gap-2" onClick={e => e.stopPropagation()}>
          <button
            onClick={onEdit}
            className="rounded bg-slate-100 p-1.5 transition-all hover:bg-slate-200"
            title="Bearbeiten"
          >
            <Edit2 className="h-4 w-4 text-slate-600" />
          </button>
          <button
            onClick={e => {
              e.stopPropagation()
              if (confirm(`Artikel "${article.name}" wirklich löschen?`)) {
                onDelete()
              }
            }}
            className="rounded bg-red-50 p-1.5 transition-all hover:bg-red-100"
            title="Löschen"
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </button>
        </div>
      </td>
    </tr>
  )
}
