import TicketsClient from './TicketsClient'

export default async function TicketsPage() {
  // TODO: Add permission check when ready
  // await requirePermission('menu_tickets')

  return <TicketsClient />
}
