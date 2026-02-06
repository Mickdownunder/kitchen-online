import { CustomerProject, Invoice, PlanningAppointment } from '@/types'

export interface DashboardProps {
  projects: CustomerProject[]
  appointments: PlanningAppointment[]
  openInvoices: Invoice[]
  ticketStats: TicketStats
}

export interface TicketStats {
  total: number
  open: number
  inProgress: number
  closed: number
}

export interface ActionBarItem {
  label: string
  count: number
  icon: React.ComponentType<{ className?: string }>
  href: string
  color: string
}

export interface KPICardData {
  label: string
  value: number | string
  icon: React.ComponentType<{ className?: string }>
  href: string
  color: string
  bgColor: string
  isCurrency?: boolean
  isAlert?: boolean
}

export interface ActivityItem {
  id: string
  type: 'project' | 'complaint' | 'payment' | 'appointment'
  text: string
  timestamp: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}
