'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Article, InvoiceItem, CustomerProject } from '@/types'
import { getArticlesSearch } from '@/lib/supabase/services'
import { calculateItemTotalsFromGross, roundTo2Decimals } from '@/lib/utils/priceCalculations'

const ARTICLE_SEARCH_DEBOUNCE_MS = 300
const ARTICLE_SEARCH_LIMIT = 50

interface UseArticleSelectionProps {
  formData: Partial<CustomerProject>
  setFormData: React.Dispatch<React.SetStateAction<Partial<CustomerProject>>>
}

interface UseArticleSelectionResult {
  articles: Article[]
  articleSearchTerm: string
  setArticleSearchTerm: React.Dispatch<React.SetStateAction<string>>
  articleSearchLoading: boolean
  showArticleDropdown: boolean
  setShowArticleDropdown: React.Dispatch<React.SetStateAction<boolean>>
  filteredArticles: Article[]
  addArticleAsItem: (article: Article) => void
  selectedArticleForPosition: string | null
  setSelectedArticleForPosition: React.Dispatch<React.SetStateAction<string | null>>
}

/**
 * Hook für Artikel-Suche (server-seitig) und Hinzufügen zu Items.
 * Lädt nur begrenzte Treffer pro Suche, kein voller Artikelstamm.
 */
export function useArticleSelection({
  formData,
  setFormData,
}: UseArticleSelectionProps): UseArticleSelectionResult {
  const [articles, setArticles] = useState<Article[]>([])
  const [articleSearchTerm, setArticleSearchTerm] = useState('')
  const [articleSearchLoading, setArticleSearchLoading] = useState(false)
  const [showArticleDropdown, setShowArticleDropdown] = useState(false)
  const [selectedArticleForPosition, setSelectedArticleForPosition] = useState<string | null>(null)

  const searchArticles = useCallback(async (term: string) => {
    setArticleSearchLoading(true)
    const result = await getArticlesSearch(term, ARTICLE_SEARCH_LIMIT)
    setArticles(result.ok ? result.data : [])
    setArticleSearchLoading(false)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      searchArticles(articleSearchTerm)
    }, ARTICLE_SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [articleSearchTerm, searchArticles])

  // Treffer der Suche (server-seitig)
  const filteredArticles = articles

  const addArticleAsItem = (article: Article): void => {
    const items = formData.items || []
    const quantity = 1
    const taxRate = article.taxRate || 20

    const grossPricePerUnit = article.defaultSalePrice
    const totals = calculateItemTotalsFromGross(quantity, grossPricePerUnit, taxRate)

    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      articleId: article.id,
      position: items.length + 1,
      description: article.name,
      modelNumber: article.modelNumber,
      manufacturer: article.manufacturer,
      specifications: article.specifications,
      quantity: quantity,
      unit: article.unit,
      pricePerUnit: totals.pricePerUnit,
      grossPricePerUnit: grossPricePerUnit,
      purchasePricePerUnit: article.defaultPurchasePrice
        ? roundTo2Decimals(article.defaultPurchasePrice)
        : undefined,
      taxRate: article.taxRate,
      netTotal: totals.netTotal,
      taxAmount: totals.taxAmount,
      grossTotal: totals.grossTotal,
    }

    setFormData({ ...formData, items: [...items, newItem] })
    setShowArticleDropdown(false)
    setArticleSearchTerm('')
  }

  return {
    articles,
    articleSearchTerm,
    setArticleSearchTerm,
    articleSearchLoading,
    showArticleDropdown,
    setShowArticleDropdown,
    filteredArticles,
    addArticleAsItem,
    selectedArticleForPosition,
    setSelectedArticleForPosition,
  }
}
