import { CheckCircle2, DollarSign, Package, Percent } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { StatCard } from '@/components/ui'
import { ProjectListStatsData, ProjectListTab } from './projectList.types'

interface ProjectListStatsProps {
  activeTab: ProjectListTab
  statsData: ProjectListStatsData
}

export function ProjectListStats({ activeTab, statsData }: ProjectListStatsProps) {
  if (activeTab !== 'orders' || statsData.projectCount === 0) {
    return null
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        icon={DollarSign}
        iconColor="blue"
        value={`${formatCurrency(statsData.totalRevenue)} €`}
        label="Verkaufter Umsatz"
        subtitle={`${statsData.projectCount} Projekt${statsData.projectCount !== 1 ? 'e' : ''}`}
        tint="blue"
      />
      <StatCard
        icon={Package}
        iconColor="amber"
        value={statsData.projectCount}
        label="Projekte"
        subtitle={`Ø ${formatCurrency(statsData.averageAmount)} €`}
        tint="amber"
      />
      <StatCard
        icon={Percent}
        iconColor="emerald"
        value={statsData.marginPercent != null ? `${statsData.marginPercent.toFixed(1)}%` : '—'}
        label="Durchschnittliche Marge"
        subtitle={
          statsData.marginPercent != null ? `${formatCurrency(statsData.margin)} €` : 'EK erfassen'
        }
        tint="emerald"
      />
      <StatCard
        icon={CheckCircle2}
        iconColor="purple"
        value={statsData.completedCount}
        label="Abgeschlossen"
        subtitle={`${statsData.completedPercent}%`}
        tint="purple"
      />
    </div>
  )
}
