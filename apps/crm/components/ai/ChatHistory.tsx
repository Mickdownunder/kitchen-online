'use client'

import React from 'react'
import { Trash2 } from 'lucide-react'
import type { ChatSession } from '@/lib/supabase/services'

interface ChatHistoryProps {
  sessions: ChatSession[]
  currentSessionId: string | null
  onSelectSession: (sessionId: string) => void
  onDeleteSession: (sessionId: string) => void
  onCreateSession: () => void
  onClose: () => void
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onDeleteSession,
  onCreateSession,
  onClose,
}) => {
  return (
    <div className="mt-4 max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-slate-900/50 p-4">
      <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">
        Chat-Verlauf
      </h4>
      <div className="space-y-2">
        {sessions.map(session => (
          <div
            key={session.id}
            className={`group relative w-full rounded-lg text-sm transition-colors ${
              currentSessionId === session.id
                ? 'bg-amber-500/20'
                : 'bg-slate-800/50 hover:bg-slate-800'
            }`}
          >
            <button
              onClick={e => {
                const target = e.target as HTMLElement
                if (target.closest('button[title="Chat löschen"]')) {
                  return
                }
                onSelectSession(session.id)
                onClose()
              }}
              className="w-full p-2 pr-10 text-left"
            >
              <p className="truncate font-medium text-slate-300">{session.title || 'Neuer Chat'}</p>
              <p className="mt-1 text-xs text-slate-500">
                {new Date(session.updatedAt).toLocaleDateString('de-DE')}
              </p>
            </button>
            <button
              type="button"
              onMouseDown={e => {
                e.preventDefault()
                e.stopPropagation()
              }}
              onClick={async e => {
                e.preventDefault()
                e.stopPropagation()
                e.nativeEvent.stopImmediatePropagation()

                if (
                  window.confirm(
                    `Möchten Sie den Chat "${session.title || 'Neuer Chat'}" wirklich löschen?`
                  )
                ) {
                  onDeleteSession(session.id)
                }
              }}
              className="pointer-events-auto absolute right-2 top-1/2 z-30 -translate-y-1/2 rounded-lg bg-slate-700/50 p-1.5 text-slate-400 opacity-0 transition-all hover:bg-red-500/20 hover:text-red-400 group-hover:opacity-100"
              title="Chat löschen"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <button
          onClick={onCreateSession}
          className="w-full rounded-lg bg-slate-800/50 p-2 text-left text-sm text-slate-300 transition-colors hover:bg-slate-800"
        >
          + Neuer Chat
        </button>
      </div>
    </div>
  )
}
