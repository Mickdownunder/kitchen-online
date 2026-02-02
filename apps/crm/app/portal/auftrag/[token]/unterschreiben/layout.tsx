/**
 * Minimales Layout für die Auftrags-Unterschriften-Seite (kein Login, keine Sidebar)
 */
export default function OrderSignLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/20 py-12">
      {children}
    </div>
  )
}
