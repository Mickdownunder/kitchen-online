'use client'

import React, { useRef, useEffect } from 'react'
import { Loader2 } from 'lucide-react'

export interface Message {
  role: 'user' | 'model'
  text: string
  id?: string
}

interface ChatMessagesProps {
  messages: Message[]
  streamingText: string
  isLoading: boolean
  isSpeaking: boolean
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  streamingText,
  isLoading,
  isSpeaking,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight)
  }, [messages, streamingText])

  return (
    <div ref={scrollRef} className="custom-scrollbar flex-1 space-y-8 overflow-y-auto p-8">
      {messages.map((m, i) => (
        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div
            className={`max-w-[90%] whitespace-pre-wrap rounded-[2.5rem] p-6 text-sm font-medium leading-relaxed shadow-sm ${
              m.role === 'user'
                ? 'rounded-tr-none bg-amber-500 text-slate-900'
                : 'rounded-tl-none border border-white/5 bg-slate-800 text-slate-100'
            }`}
          >
            {m.text}
          </div>
        </div>
      ))}

      {isLoading && (
        <div className="flex justify-start">
          <div className="flex items-center gap-3 rounded-[2.5rem] rounded-tl-none border border-white/5 bg-slate-800 p-6">
            <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
            <span className="animate-pulse text-xs font-bold uppercase tracking-widest text-slate-400">
              Ich denke nach...
            </span>
          </div>
        </div>
      )}

      {streamingText && (
        <div className="flex justify-start">
          <div className="whitespace-pre-wrap rounded-[2.5rem] rounded-tl-none border border-white/5 bg-slate-800 p-6 text-sm font-medium leading-relaxed">
            {streamingText}
            <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-amber-500"></span>
          </div>
        </div>
      )}

      {isSpeaking && (
        <div className="flex justify-start">
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
            <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500"></div>
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
              Sprachausgabe aktiv...
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
