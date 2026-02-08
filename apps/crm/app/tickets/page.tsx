import TicketsClient from './TicketsClient'

export default async function TicketsPage() {
  // NOTE: Permission check will be added when role-based access is fully implemented
  // await requirePermission('menu_tickets')

  return <TicketsClient />
}
