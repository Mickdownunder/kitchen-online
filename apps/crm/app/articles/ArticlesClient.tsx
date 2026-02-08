'use client'

import { useEffect, useState, useCallback } from 'react'
import ArticleCatalog from '@/components/ArticleCatalog'
import { Article } from '@/types'
import {
  getArticlesPaginated,
  createArticle,
  updateArticle,
  deleteArticle,
  type ArticleSortField,
  type ArticleSortDirection,
} from '@/lib/supabase/services'

const PAGE_SIZE = 50
const SEARCH_DEBOUNCE_MS = 300

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

export default function ArticlesClient() {
  const [articles, setArticles] = useState<Article[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<ArticleSortField>('name')
  const [sortDirection, setSortDirection] = useState<ArticleSortDirection>('asc')

  const searchDebounced = useDebounce(searchTerm, SEARCH_DEBOUNCE_MS)

  const loadArticles = useCallback(async () => {
    setLoading(true)
    const result = await getArticlesPaginated({
      page,
      pageSize: PAGE_SIZE,
      search: searchDebounced || undefined,
      category: categoryFilter,
      sortField,
      sortDirection,
    })
    if (result.ok) {
      setArticles(result.data.data)
      setTotal(result.data.total)
    } else {
      setArticles([])
      setTotal(0)
    }
    setLoading(false)
  }, [page, searchDebounced, categoryFilter, sortField, sortDirection])

  useEffect(() => {
    loadArticles()
  }, [loadArticles])

  const handlePageChange = (newPage: number) => {
    setPage(Math.max(1, newPage))
  }

  const handleSaveArticle = async (article: Article) => {
    const result = article.id && articles.find(a => a.id === article.id)
      ? await updateArticle(article.id, article)
      : await createArticle(article)

    if (!result.ok) {
      alert('Fehler beim Speichern des Artikels')
      return
    }
    await loadArticles()
  }

  const handleDeleteArticle = async (id: string) => {
    const result = await deleteArticle(id)
    if (!result.ok) {
      alert('Fehler beim Löschen des Artikels')
      return
    }
    await loadArticles()
  }

  if (loading && articles.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    )
  }

  const setSearchTermAndResetPage = (v: string) => {
    setSearchTerm(v)
    setPage(1)
  }
  const setCategoryFilterAndResetPage = (v: string) => {
    setCategoryFilter(v)
    setPage(1)
  }

  return (
    <ArticleCatalog
      articles={articles}
      total={total}
      page={page}
      pageSize={PAGE_SIZE}
      loading={loading}
      onPageChange={handlePageChange}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTermAndResetPage}
      categoryFilter={categoryFilter}
      setCategoryFilter={setCategoryFilterAndResetPage}
      sortField={sortField}
      sortDirection={sortDirection}
      onSort={(field) => {
        if (sortField === field) {
          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
        } else {
          setSortField(field)
          setSortDirection('asc')
        }
      }}
      onSelectArticle={() => {}}
      onSaveArticle={handleSaveArticle}
      onDeleteArticle={handleDeleteArticle}
    />
  )
}
