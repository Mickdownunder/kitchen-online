'use client'

import React from 'react'
import { LayoutDashboard, Users, ReceiptText, Truck, UserCircle } from 'lucide-react'

export type StatisticsTab = 'overview' | 'projects' | 'invoices' | 'deliveries' | 'customers'

interface StatisticsTabsProps {
  activeTab: StatisticsTab
  onTabChange: (tab: StatisticsTab) => void
}

const StatisticsTabs: React.FC<StatisticsTabsProps> = ({ activeTab, onTabChange }) => {
  const tabs: { id: StatisticsTab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Übersicht', icon: LayoutDashboard },
    { id: 'projects', label: 'Aufträge', icon: Users },
    { id: 'invoices', label: 'Rechnungen', icon: ReceiptText },
    { id: 'deliveries', label: 'Lieferscheine', icon: Truck },
    { id: 'customers', label: 'Kunden', icon: UserCircle },
  ]

  return (
    <div className="scrollbar-hide flex items-center gap-2 overflow-x-auto rounded-2xl border border-slate-100 bg-white p-1.5 shadow-inner">
      {tabs.map(tab => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`group relative flex items-center gap-2 whitespace-nowrap rounded-xl px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
              isActive
                ? 'scale-105 bg-slate-900 text-white shadow-lg'
                : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
            }`}
            style={{
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {isActive && (
              <span
                className="absolute inset-0 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 opacity-100"
                style={{
                  animation: 'fadeIn 0.2s ease-in-out',
                }}
              />
            )}
            <Icon
              className={`relative z-10 h-4 w-4 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}
            />
            <span className="relative z-10">{tab.label}</span>
            {isActive && (
              <span
                className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 transform rounded-full bg-amber-500"
                style={{
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                }}
              />
            )}
          </button>
        )
      })}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  )
}

export default StatisticsTabs
