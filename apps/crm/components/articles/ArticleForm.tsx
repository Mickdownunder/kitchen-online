'use client'

import React, { useState } from 'react'
import type { Article } from '@/types'
import { usePriceInput } from '@/hooks/usePriceInput'

interface ArticleFormProps {
  article: Article | null
  onSave: (article: Article) => void
  onCancel: () => void
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
      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right"
      placeholder={placeholder || '0,00'}
      inputMode="decimal"
    />
  )
}

export const ArticleForm: React.FC<ArticleFormProps> = ({
  article: _article,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState<Partial<Article>>(() => {
    const base: Partial<Article> = {
      sku: '',
      manufacturer: '',
      modelNumber: '',
      category: 'Kitchen',
      name: '',
      description: '',
      specifications: {},
      defaultPurchasePrice: 0,
      defaultSalePrice: 0,
      taxRate: 20,
      unit: 'Stk',
      inStock: true,
      stockQuantity: 0,
      isActive: true,
    }
    if (!_article) return base
    return {
      ...base,
      ..._article,
      description: _article.description ?? _article.name ?? '',
    }
  })

  const [specKey, setSpecKey] = useState('')
  const [specValue, setSpecValue] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Name aus erster Zeile der Beschreibung ableiten (Artikelname ist Teil der Beschreibung)
    const desc = (formData.description || '').trim()
    const derivedName = desc
      ? desc.split('\n')[0].trim() || desc
      : (_article?.name || 'Unbenannt')
    const newArticle: Article = {
      id: _article?.id || Date.now().toString(),
      sku: formData.sku!,
      manufacturer: formData.manufacturer,
      modelNumber: formData.modelNumber,
      category: formData.category!,
      name: derivedName,
      description: desc || undefined,
      specifications: formData.specifications || {},
      defaultPurchasePrice: formData.defaultPurchasePrice!,
      defaultSalePrice: formData.defaultSalePrice!,
      taxRate: formData.taxRate!,
      unit: formData.unit!,
      inStock: formData.inStock,
      stockQuantity: formData.stockQuantity,
      isActive: formData.isActive ?? true,
      createdAt: _article?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    onSave(newArticle)
  }

  const addSpecification = () => {
    if (specKey && specValue) {
      setFormData({
        ...formData,
        specifications: { ...formData.specifications, [specKey]: specValue },
      })
      setSpecKey('')
      setSpecValue('')
    }
  }

  const removeSpecification = (key: string) => {
    const newSpecs = { ...formData.specifications }
    delete newSpecs[key]
    setFormData({ ...formData, specifications: newSpecs })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <input
          placeholder="Artikelnummer (SKU) *"
          value={formData.sku}
          onChange={e => setFormData({ ...formData, sku: e.target.value })}
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
          required
        />
        <select
          value={formData.category}
          onChange={e =>
            setFormData({ ...formData, category: e.target.value as Article['category'] })
          }
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
        >
          <option value="Kitchen">Küche</option>
          <option value="Appliance">Gerät</option>
          <option value="Accessory">Zubehör</option>
          <option value="Service">Service</option>
          <option value="Material">Material</option>
          <option value="Other">Sonstiges</option>
        </select>
      </div>

      <textarea
        placeholder="Artikelbeschreibung * (Enter für neue Zeile)"
        value={formData.description ?? ''}
        onChange={e => setFormData({ ...formData, description: e.target.value })}
        onKeyDown={e => {
          if (e.key === 'Enter' && e.target instanceof HTMLTextAreaElement) {
            e.stopPropagation()
          }
        }}
        rows={10}
        className="min-h-[220px] w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-sans text-sm leading-relaxed"
        required
      />

      <div className="grid grid-cols-2 gap-4">
        <input
          placeholder="Hersteller (z.B. Miele, Schüller)"
          value={formData.manufacturer}
          onChange={e => setFormData({ ...formData, manufacturer: e.target.value })}
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
        />
        <input
          placeholder="Modellnummer (z.B. G 7000)"
          value={formData.modelNumber}
          onChange={e => setFormData({ ...formData, modelNumber: e.target.value })}
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
        />
      </div>

      {/* Specifications */}
      <div className="rounded-xl bg-slate-50 p-4">
        <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">
          Spezifikationen (z.B. Breite: 60cm, Farbe: Weiß)
        </p>
        <div className="mb-3 flex gap-2">
          <input
            placeholder="Eigenschaft (z.B. Breite)"
            value={specKey}
            onChange={e => setSpecKey(e.target.value)}
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <input
            placeholder="Wert (z.B. 60cm)"
            value={specValue}
            onChange={e => setSpecValue(e.target.value)}
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={addSpecification}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-slate-900 transition-all hover:bg-amber-600"
          >
            Hinzufügen
          </button>
        </div>
        <div className="space-y-2">
          {Object.entries(formData.specifications || {}).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between rounded-lg bg-white p-2">
              <span className="text-sm">
                <span className="font-bold">{key}:</span> {value}
              </span>
              <button
                type="button"
                onClick={() => removeSpecification(key)}
                className="text-sm font-bold text-red-500 hover:text-red-700"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-400">
            Einkaufspreis (EK)
          </label>
          <ArticlePriceInput
            value={formData.defaultPurchasePrice}
            onChange={value => setFormData({ ...formData, defaultPurchasePrice: value || 0 })}
            placeholder="0,00"
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-400">
            Verkaufspreis (VK)
          </label>
          <ArticlePriceInput
            value={formData.defaultSalePrice}
            onChange={value => setFormData({ ...formData, defaultSalePrice: value || 0 })}
            placeholder="0,00"
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-400">
            MwSt.
          </label>
          <select
            value={formData.taxRate}
            onChange={e =>
              setFormData({ ...formData, taxRate: parseInt(e.target.value) as 10 | 13 | 20 })
            }
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
          >
            <option value={10}>10%</option>
            <option value={13}>13%</option>
            <option value={20}>20%</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-400">
            Einheit
          </label>
          <select
            value={formData.unit}
            onChange={e => setFormData({ ...formData, unit: e.target.value as Article['unit'] })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
          >
            <option value="Stk">Stück</option>
            <option value="Pkg">Paket</option>
            <option value="Std">Stunde</option>
            <option value="Paush">Pauschale</option>
            <option value="m">Meter</option>
            <option value="lfm">Laufmeter</option>
            <option value="m²">Quadratmeter</option>
          </select>
        </div>
        <div>
          <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-400">
            Lagerbestand
          </label>
          <input
            type="number"
            value={formData.stockQuantity}
            onChange={e =>
              setFormData({ ...formData, stockQuantity: parseInt(e.target.value) || 0 })
            }
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
          />
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl bg-slate-100 px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-700 transition-all hover:bg-slate-200"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          className="flex-1 rounded-xl bg-amber-500 px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-900 transition-all hover:bg-amber-600"
        >
          Speichern
        </button>
      </div>
    </form>
  )
}
