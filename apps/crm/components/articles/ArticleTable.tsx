'use client'

import React from 'react'
import { Package, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import type { Article } from '@/types'
import { ArticleRow } from './ArticleRow'

type SortField = 'name' | 'sku' | 'manufacturer' | 'category' | 'purchasePrice' | 'salePrice'
type SortDirection = 'asc' | 'desc'

interface ArticleTableProps {
  articles: Article[]
  editingArticleId: string | null
  canViewPurchasePrices: boolean
  searchTerm: string
  categoryFilter: string
  sortField: SortField
  sortDirection: SortDirection
  categoryLabels: Record<string, string>
  onSelectArticle: (article: Article) => void
  onEditArticle: (id: string | null) => void
  onDeleteArticle: (id: string) => void
  onSaveArticle: (article: Article) => void
  onSort: (field: SortField) => void
}

const SortIcon = ({
  field,
  sortField,
  sortDirection,
}: {
  field: SortField
  sortField: SortField
  sortDirection: SortDirection
}) => {
  if (sortField !== field) {
    return <ArrowUpDown className="h-3 w-3 text-slate-400" />
  }
  return sortDirection === 'asc' ? (
    <ArrowUp className="h-3 w-3 text-amber-500" />
  ) : (
    <ArrowDown className="h-3 w-3 text-amber-500" />
  )
}

export const ArticleTable: React.FC<ArticleTableProps> = ({
  articles,
  editingArticleId,
  canViewPurchasePrices,
  searchTerm,
  categoryFilter,
  sortField,
  sortDirection,
  categoryLabels,
  onSelectArticle,
  onEditArticle,
  onDeleteArticle,
  onSaveArticle,
  onSort,
}) => {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th
                className="cursor-pointer px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500 transition-colors hover:bg-slate-100"
                onClick={() => onSort('sku')}
              >
                <div className="flex items-center gap-2">
                  SKU
                  <SortIcon field="sku" sortField={sortField} sortDirection={sortDirection} />
                </div>
              </th>
              <th
                className="cursor-pointer px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500 transition-colors hover:bg-slate-100"
                onClick={() => onSort('name')}
              >
                <div className="flex items-center gap-2">
                  Name
                  <SortIcon field="name" sortField={sortField} sortDirection={sortDirection} />
                </div>
              </th>
              <th
                className="cursor-pointer px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500 transition-colors hover:bg-slate-100"
                onClick={() => onSort('manufacturer')}
              >
                <div className="flex items-center gap-2">
                  Hersteller
                  <SortIcon
                    field="manufacturer"
                    sortField={sortField}
                    sortDirection={sortDirection}
                  />
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500">
                Modell
              </th>
              <th
                className="cursor-pointer px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-500 transition-colors hover:bg-slate-100"
                onClick={() => onSort('category')}
              >
                <div className="flex items-center gap-2">
                  Kategorie
                  <SortIcon field="category" sortField={sortField} sortDirection={sortDirection} />
                </div>
              </th>
              {canViewPurchasePrices && (
                <th
                  className="cursor-pointer px-4 py-3 text-right text-xs font-black uppercase tracking-widest text-slate-500 transition-colors hover:bg-slate-100"
                  onClick={() => onSort('purchasePrice')}
                >
                  <div className="flex items-center justify-end gap-2">
                    EK-Preis
                    <SortIcon
                      field="purchasePrice"
                      sortField={sortField}
                      sortDirection={sortDirection}
                    />
                  </div>
                </th>
              )}
              <th
                className="cursor-pointer px-4 py-3 text-right text-xs font-black uppercase tracking-widest text-slate-500 transition-colors hover:bg-slate-100"
                onClick={() => onSort('salePrice')}
              >
                <div className="flex items-center justify-end gap-2">
                  VK-Preis
                  <SortIcon field="salePrice" sortField={sortField} sortDirection={sortDirection} />
                </div>
              </th>
              <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-widest text-slate-500">
                MwSt.
              </th>
              <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-widest text-slate-500">
                Einheit
              </th>
              <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-widest text-slate-500">
                Lager
              </th>
              <th className="w-24 px-4 py-3 text-center text-xs font-black uppercase tracking-widest text-slate-500">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {articles.length === 0 ? (
              <tr>
                <td
                  colSpan={canViewPurchasePrices ? 11 : 10}
                  className="px-4 py-12 text-center text-slate-400"
                >
                  <Package className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                  <p className="text-sm font-bold">Keine Artikel gefunden</p>
                  <p className="mt-1 text-xs">
                    {searchTerm || categoryFilter !== 'all'
                      ? 'Versuchen Sie andere Suchbegriffe oder Filter'
                      : 'Erstellen Sie den ersten Artikel'}
                  </p>
                </td>
              </tr>
            ) : (
              articles.map(article => (
                <ArticleRow
                  key={article.id}
                  article={article}
                  isEditing={editingArticleId === article.id}
                  canViewPurchasePrices={canViewPurchasePrices}
                  searchTerm={searchTerm}
                  categoryLabels={categoryLabels}
                  onSelect={() => onSelectArticle(article)}
                  onEdit={() => onEditArticle(article.id)}
                  onDelete={() => onDeleteArticle(article.id)}
                  onSave={onSaveArticle}
                  onCancelEdit={() => onEditArticle(null)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
