import { requirePermission } from '@/lib/auth/requirePermission'
import ArticlesClient from './ArticlesClient'

export default async function ArticlesPage() {
  await requirePermission('menu_articles')

  return <ArticlesClient />
}
