'use client'

import React, { useState } from 'react'
import { Article } from '@/types'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { ArticleFilters } from './articles/ArticleFilters'
import { ArticleTable } from './articles/ArticleTable'
import { ArticleForm } from './articles/ArticleForm'

type SortField = 'name' | 'sku' | 'manufacturer' | 'category' | 'purchasePrice' | 'salePrice'
type SortDirection = 'asc' | 'desc'

interface ArticleCatalogProps {
  articles: Article[]
  total: number
  page: number
  pageSize: number
  loading?: boolean
  onPageChange: (page: number) => void
  searchTerm: string
  setSearchTerm: (value: string) => void
  categoryFilter: string
  setCategoryFilter: (value: string) => void
  sortField: SortField
  sortDirection: SortDirection
  onSort: (field: SortField) => void
  onSelectArticle: (_article: Article) => void
  onSaveArticle: (_article: Article) => void
  onDeleteArticle: (_id: string) => void
}

const categoryLabels: Record<string, string> = {
  Kitchen: 'Küche',
  Appliance: 'Gerät',
  Accessory: 'Zubehör',
  Service: 'Service',
  Material: 'Material',
  Other: 'Sonstiges',
}

const ArticleCatalog: React.FC<ArticleCatalogProps> = ({
  articles = [],
  total,
  page,
  pageSize,
  loading = false,
  onPageChange,
  searchTerm,
  setSearchTerm,
  categoryFilter,
  setCategoryFilter,
  sortField,
  sortDirection,
  onSort,
  onSelectArticle,
  onSaveArticle,
  onDeleteArticle,
}) => {
  const { hasPermission } = useAuth()
  const canViewPurchasePrices = hasPermission?.('view_purchase_prices') ?? false

  const [editingArticleId, setEditingArticleId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingArticle, setEditingArticle] = useState<Article | null>(null)

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Artikelstamm</h2>
          <p className="mt-1 text-sm text-slate-500">
            {total === 0
              ? 'Keine Artikel'
              : `Zeige ${from}–${to} von ${total.toLocaleString('de-DE')} ${total === 1 ? 'Artikel' : 'Artikel'}`}
          </p>
        </div>
        <button
          onClick={() => {
            setEditingArticle(null)
            setShowForm(true)
          }}
          className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-900 shadow-sm transition-all hover:bg-amber-600"
        >
          <Plus className="h-4 w-4" /> Neuer Artikel
        </button>
      </div>

      {/* Filters */}
      <ArticleFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
      />

      {/* Table */}
      <div className="relative">
        {loading && articles.length > 0 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/60">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
          </div>
        )}
        <ArticleTable
          articles={articles}
          editingArticleId={editingArticleId}
          canViewPurchasePrices={canViewPurchasePrices}
          searchTerm={searchTerm}
          categoryFilter={categoryFilter}
          sortField={sortField}
          sortDirection={sortDirection}
          categoryLabels={categoryLabels}
          onSelectArticle={onSelectArticle}
          onEditArticle={setEditingArticleId}
          onDeleteArticle={onDeleteArticle}
          onSaveArticle={onSaveArticle}
          onSort={onSort}
        />
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-sm text-slate-500">
            Seite {page} von {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1 || loading}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" /> Zurück
            </button>
            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages || loading}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Weiter <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Article Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-md">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-8">
            <h3 className="mb-6 text-2xl font-black text-slate-900">
              {editingArticle ? 'Artikel bearbeiten' : 'Neuer Artikel'}
            </h3>

            <ArticleForm
              article={editingArticle}
              onSave={article => {
                onSaveArticle(article)
                setShowForm(false)
                setEditingArticle(null)
              }}
              onCancel={() => {
                setShowForm(false)
                setEditingArticle(null)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default ArticleCatalog
