'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { X, Home, FileText, HelpCircle, Package, ChefHat, Calendar, CreditCard } from 'lucide-react'
import LogoutButton from './LogoutButton'

const navigation = [
  { name: 'Übersicht', href: '/portal', icon: Home },
  { name: 'Termine', href: '/portal/termine', icon: Calendar },
  { name: 'Zahlungen', href: '/portal/zahlungen', icon: CreditCard },
  { name: 'Dokumente', href: '/portal/documents', icon: FileText },
  { name: 'Meine Geräte', href: '/portal/appliances', icon: Package },
  { name: 'Hilfe', href: '/portal/service', icon: HelpCircle },
]

interface PortalSidebarProps {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export default function PortalSidebar({ sidebarOpen, setSidebarOpen }: PortalSidebarProps) {
  const pathname = usePathname() || ''

  const isActive = (href: string) => {
    if (href === '/portal') {
      return pathname === '/portal'
    }
    return pathname.startsWith(href)
  }

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white border-r border-slate-200/80">
      {/* Logo / Header */}
      <div className="flex flex-shrink-0 items-center gap-3 px-6 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/25">
          <ChefHat className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">KüchenOnline</h1>
          <p className="text-xs text-slate-500">Kundenportal</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const active = isActive(item.href)
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                    active
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25'
                      : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                  }`}
                >
                  <item.icon className={`h-5 w-5 transition-transform duration-200 ${active ? '' : 'group-hover:scale-110'}`} aria-hidden="true" />
                  {item.name}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Support Card */}
      <div className="mx-4 mb-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
        <p className="text-sm font-medium text-slate-700">Brauchen Sie Hilfe?</p>
        <p className="mt-1 text-xs text-slate-500">Unser Team ist für Sie da.</p>
        <Link 
          href="/portal/service"
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          Kontakt aufnehmen
        </Link>
      </div>

      {/* Logout */}
      <div className="border-t border-slate-200 p-4">
        <LogoutButton />
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile sidebar */}
      <Transition.Root show={sidebarOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 lg:hidden" onClose={setSidebarOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                <Transition.Child
                  as={Fragment}
                  enter="ease-in-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in-out duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                    <button
                      type="button"
                      className="-m-2.5 rounded-full bg-white/80 p-2.5 shadow-lg backdrop-blur"
                      onClick={() => setSidebarOpen(false)}
                    >
                      <span className="sr-only">Sidebar schließen</span>
                      <X className="h-5 w-5 text-slate-600" aria-hidden="true" />
                    </button>
                  </div>
                </Transition.Child>
                {sidebarContent}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        {sidebarContent}
      </div>
    </>
  )
}
