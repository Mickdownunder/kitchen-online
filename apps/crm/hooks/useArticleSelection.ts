'use client'

import { useState, useEffect, useMemo } from 'react'
import type { Article, InvoiceItem, CustomerProject } from '@/types'
import { getArticles } from '@/lib/supabase/services'
import { calculateItemTotalsFromGross, roundTo2Decimals } from '@/lib/utils/priceCalculations'

interface UseArticleSelectionProps {
  formData: Partial<CustomerProject>
  setFormData: React.Dispatch<React.SetStateAction<Partial<CustomerProject>>>
}

/**
 * Hook für Article-Suche, -Filterung und -Hinzufügen zu Items
 */
export function useArticleSelection({ formData, setFormData }: UseArticleSelectionProps) {
  const [articles, setArticles] = useState<Article[]>([])
  const [articleSearchTerm, setArticleSearchTerm] = useState('')
  const [showArticleDropdown, setShowArticleDropdown] = useState(false)
  const [selectedArticleForPosition, setSelectedArticleForPosition] = useState<string | null>(null)

  useEffect(() => {
    loadArticles()
  }, [])

  const loadArticles = async () => {
    try {
      const data = await getArticles()
      setArticles(data)
    } catch (error) {
      console.error('Error loading articles:', error)
    }
  }

  // Filter articles by search term
  const filteredArticles = useMemo(() => {
    if (!articleSearchTerm) return articles
    const term = articleSearchTerm.toLowerCase()
    return articles.filter(
      a =>
        a.name.toLowerCase().includes(term) ||
        a.sku.toLowerCase().includes(term) ||
        (a.manufacturer && a.manufacturer.toLowerCase().includes(term)) ||
        (a.modelNumber && a.modelNumber.toLowerCase().includes(term))
    )
  }, [articles, articleSearchTerm])

  // Add article as new item
  const addArticleAsItem = (article: Article) => {
    const items = formData.items || []
    const quantity = 1
    const taxRate = article.taxRate || 20

    // WICHTIG: Wir gehen davon aus, dass defaultSalePrice der BRUTTO-Preis (VK) ist
    const grossPricePerUnit = article.defaultSalePrice

    // Verwende zentrale Utility-Funktion für Brutto-basierte Berechnung
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
    showArticleDropdown,
    setShowArticleDropdown,
    filteredArticles,
    addArticleAsItem,
    selectedArticleForPosition,
    setSelectedArticleForPosition,
  }
}
