'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Fragment } from 'react'
import { Dialog, Transition, Listbox } from '@headlessui/react'
import { X, Home, FileText, HelpCircle, Package, Calendar, CreditCard, ChevronDown, Check, Briefcase } from 'lucide-react'
import Image from 'next/image'
import LogoutButton from './LogoutButton'
import { useProject } from '../context/ProjectContext'

const LOGO_URL = 'https://tdpyouguwmdrvhwkpdca.supabase.co/storage/v1/object/public/Bilder/8105_%20web%20logo_%20CMYK-02%20schwarz.png'

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
  const { projects, selectedProject, selectProject, hasMultipleProjects, isLoading } = useProject()

  const isActive = (href: string) => {
    if (href === '/portal') {
      return pathname === '/portal'
    }
    return pathname.startsWith(href)
  }

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white border-r border-slate-200/80">
      {/* Logo / Header */}
      <div className="flex flex-shrink-0 items-center px-6 py-6">
        <Image
          src={LOGO_URL}
          alt="KüchenOnline"
          width={180}
          height={50}
          className="h-10 w-auto"
          unoptimized
        />
      </div>

      {/* Projekt-Switcher - nur anzeigen wenn mehrere Projekte */}
      {!isLoading && selectedProject && (
        <div className="px-4 pb-4">
          {hasMultipleProjects ? (
            <Listbox value={selectedProject.id} onChange={selectProject}>
              <div className="relative">
                <Listbox.Button className="relative w-full rounded-xl bg-slate-100 py-3 pl-4 pr-10 text-left text-sm font-medium text-slate-900 transition-colors hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
                  <span className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-slate-500" />
                    <span className="truncate">
                      {selectedProject.orderNumber || 'Auftrag'}: {selectedProject.name}
                    </span>
                  </span>
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <ChevronDown className="h-4 w-4 text-slate-500" />
                  </span>
                </Listbox.Button>
                <Transition
                  as={Fragment}
                  leave="transition ease-in duration-100"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl bg-white py-1 text-sm shadow-lg ring-1 ring-black/5 focus:outline-none">
                    {projects.map((project) => (
                      <Listbox.Option
                        key={project.id}
                        value={project.id}
                        className={({ active }) =>
                          `relative cursor-pointer select-none py-3 pl-10 pr-4 ${
                            active ? 'bg-emerald-50 text-emerald-900' : 'text-slate-900'
                          }`
                        }
                      >
                        {({ selected }) => (
                          <>
                            <span className={`block truncate ${selected ? 'font-semibold' : 'font-normal'}`}>
                              {project.orderNumber || 'Auftrag'}: {project.name}
                            </span>
                            <span className="block truncate text-xs text-slate-500">
                              Status: {project.status}
                            </span>
                            {selected && (
                              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-emerald-600">
                                <Check className="h-4 w-4" />
                              </span>
                            )}
                          </>
                        )}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </Transition>
              </div>
            </Listbox>
          ) : (
            // Nur ein Projekt - einfache Anzeige ohne Dropdown
            <div className="rounded-xl bg-slate-100 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                <Briefcase className="h-4 w-4 text-slate-500" />
                <span className="truncate">
                  {selectedProject.orderNumber || 'Auftrag'}: {selectedProject.name}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

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
