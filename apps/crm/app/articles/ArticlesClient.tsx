'use client'

import { useEffect, useState } from 'react'
import ArticleCatalog from '@/components/ArticleCatalog'
import { Article } from '@/types'
import { getArticles, createArticle, updateArticle, deleteArticle } from '@/lib/supabase/services'

export default function ArticlesClient() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadArticles()
  }, [])

  const loadArticles = async () => {
    try {
      const data = await getArticles()
      if (Array.isArray(data)) {
        setArticles(data)
      } else {
        setArticles([])
      }
    } catch (error: unknown) {
      console.error('[ArticlesPage] Error loading articles:', error)
      setArticles([])
    } finally {
      setLoading(false)
    }
  }

  const handleSaveArticle = async (article: Article) => {
    try {
      if (article.id && articles.find(a => a.id === article.id)) {
        await updateArticle(article.id, article)
      } else {
        await createArticle(article)
      }
      await loadArticles()
    } catch (error) {
      console.error('Error saving article:', error)
      alert('Fehler beim Speichern des Artikels')
    }
  }

  const handleDeleteArticle = async (id: string) => {
    try {
      await deleteArticle(id)
      await loadArticles()
    } catch (error) {
      console.error('Error deleting article:', error)
      alert('Fehler beim Löschen des Artikels')
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <ArticleCatalog
      articles={articles}
      onSelectArticle={article => {
        // Article selected
      }}
      onSaveArticle={handleSaveArticle}
      onDeleteArticle={handleDeleteArticle}
    />
  )
}
