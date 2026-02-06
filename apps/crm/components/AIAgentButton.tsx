'use client'

import React, { useState } from 'react'
import { Sparkles } from 'lucide-react'
import AIAgentSidebar from './AIAgentSidebar'
import { useApp } from '@/app/providers'

const AIAgentButton: React.FC = () => {
  const [isAgentOpen, setIsAgentOpen] = useState(false)
  const { projects, addDocumentToProject } = useApp()

  return (
    <>
      <button
        onClick={() => setIsAgentOpen(true)}
        className="group fixed bottom-10 right-10 z-[100] rounded-3xl border border-slate-800/50 bg-gradient-to-br from-slate-900 to-slate-950 p-6 text-amber-500 shadow-2xl shadow-slate-900/50 transition-all duration-300 hover:scale-110 hover:border-amber-500/30 hover:shadow-amber-500/20 active:scale-95"
      >
        <Sparkles className="h-8 w-8 transition-transform group-hover:rotate-12 group-hover:text-amber-400" />
      </button>

      <AIAgentSidebar
        projects={projects}
        isOpen={isAgentOpen}
        onClose={() => setIsAgentOpen(false)}
        onAddDocument={addDocumentToProject}
      />
    </>
  )
}

export default AIAgentButton
