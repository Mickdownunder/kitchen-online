export default function PortalLoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Login page has no sidebar/navigation - standalone layout
  return <>{children}</>
}
