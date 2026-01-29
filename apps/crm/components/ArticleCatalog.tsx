'use client'

import React, { useState, useMemo } from 'react'
import { Article } from '@/types'
import { Plus } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { ArticleFilters } from './articles/ArticleFilters'
import { ArticleTable } from './articles/ArticleTable'
import { ArticleForm } from './articles/ArticleForm'

interface ArticleCatalogProps {
  articles: Article[]
  onSelectArticle: (_article: Article) => void
  onSaveArticle: (_article: Article) => void
  onDeleteArticle: (_id: string) => void
}

type SortField = 'name' | 'sku' | 'manufacturer' | 'category' | 'purchasePrice' | 'salePrice'
type SortDirection = 'asc' | 'desc'

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
  onSelectArticle,
  onSaveArticle,
  onDeleteArticle,
}) => {
  const { hasPermission } = useAuth()
  const canViewPurchasePrices = hasPermission?.('view_purchase_prices') ?? false

  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingArticle, setEditingArticle] = useState<Article | null>(null)
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const filteredAndSortedArticles = useMemo(() => {
    if (!articles || !Array.isArray(articles)) return []

    const filtered = articles.filter(a => {
      if (!a || !a.isActive) return false

      const matchesSearch =
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.modelNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesCategory = categoryFilter === 'all' || a.category === categoryFilter

      return matchesSearch && matchesCategory
    })

    filtered.sort((a, b) => {
      let aVal: string | number
      let bVal: string | number

      switch (sortField) {
        case 'name':
          aVal = a.name.toLowerCase()
          bVal = b.name.toLowerCase()
          break
        case 'sku':
          aVal = a.sku.toLowerCase()
          bVal = b.sku.toLowerCase()
          break
        case 'manufacturer':
          aVal = (a.manufacturer || '').toLowerCase()
          bVal = (b.manufacturer || '').toLowerCase()
          break
        case 'category':
          aVal = a.category
          bVal = b.category
          break
        case 'purchasePrice':
          aVal = a.defaultPurchasePrice || 0
          bVal = b.defaultPurchasePrice || 0
          break
        case 'salePrice':
          aVal = a.defaultSalePrice || 0
          bVal = b.defaultSalePrice || 0
          break
        default:
          return 0
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [articles, searchTerm, categoryFilter, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Artikelstamm</h2>
          <p className="mt-1 text-sm text-slate-500">
            {filteredAndSortedArticles.length}{' '}
            {filteredAndSortedArticles.length === 1 ? 'Artikel' : 'Artikel'}
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
      <ArticleTable
        articles={filteredAndSortedArticles}
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
        onSort={handleSort}
      />

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
