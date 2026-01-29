'use client'

import React, { useRef } from 'react'
import { Send, Paperclip, Mic, MicOff, FileText, X, AlertTriangle } from 'lucide-react'

interface AttachedFile {
  base64: string
  name: string
  type: string
}

interface ChatInputProps {
  input: string
  setInput: (value: string) => void
  attachedFile: AttachedFile | null
  setAttachedFile: (file: AttachedFile | null) => void
  isLoading: boolean
  isListening: boolean
  isSpeechSupported: boolean
  speechError: string | null
  interimTranscript: string
  onSend: () => void
  onToggleListening: () => void
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  attachedFile,
  setAttachedFile,
  isLoading,
  isListening,
  isSpeechSupported,
  speechError,
  interimTranscript,
  onSend,
  onToggleListening,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = re => {
      const dataUrl = re.target?.result as string
      const base64 = dataUrl.split(',')[1]
      setAttachedFile({ base64, name: file.name, type: file.type })
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-6 border-t border-white/5 bg-slate-800/40 p-8">
      {attachedFile && (
        <div className="animate-in slide-in-from-bottom-3 flex items-center gap-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5">
          <div className="rounded-xl bg-amber-500/20 p-3">
            <FileText className="h-6 w-6 text-amber-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-black uppercase tracking-widest text-amber-200">
              {attachedFile.name}
            </p>
            <p className="text-[10px] font-bold text-amber-500/60">Datei bereit zum Senden</p>
          </div>
          <button
            onClick={() => setAttachedFile(null)}
            className="rounded-lg bg-slate-900 p-2 text-amber-500 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {isListening && (
        <div className="animate-in slide-in-from-bottom-3 flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
          <div className="h-3 w-3 animate-pulse rounded-full bg-red-500"></div>
          <p className="text-xs font-bold uppercase tracking-widest text-red-400">
            Ich höre zu... Sprechen Sie jetzt
          </p>
        </div>
      )}

      {speechError && (
        <div className="animate-in slide-in-from-bottom-3 flex items-center gap-3 rounded-2xl border border-red-500/50 bg-red-500/20 p-4">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <p className="text-xs font-medium text-red-300">{speechError}</p>
        </div>
      )}

      <div className="flex items-end gap-3">
        <div className="relative flex-1">
          <textarea
            rows={1}
            placeholder={isListening ? '🎤 Sprechen Sie jetzt...' : 'Frag mich was, Chef...'}
            className={`max-h-32 min-h-[56px] w-full resize-none rounded-2xl border-none bg-slate-900 py-4 pl-6 pr-4 text-base text-white outline-none ring-1 transition-all placeholder:text-slate-600 ${
              isListening
                ? 'ring-2 ring-red-500 focus:ring-2 focus:ring-red-500'
                : 'ring-white/10 focus:ring-2 focus:ring-amber-500'
            }`}
            value={input + (interimTranscript ? ' ' + interimTranscript : '')}
            onChange={e => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`
            }}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), onSend())}
            disabled={isListening}
            style={{ height: 'auto', minHeight: '56px' }}
          />
          {interimTranscript && (
            <div className="absolute bottom-2 left-6 text-xs italic text-slate-500">
              {interimTranscript}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileUpload}
            accept="image/*,application/pdf"
          />
          {isSpeechSupported && (
            <button
              onClick={onToggleListening}
              disabled={isLoading}
              className={`shrink-0 rounded-xl p-3 transition-all ${
                isListening
                  ? 'animate-pulse bg-red-500 text-white shadow-2xl shadow-red-500/30'
                  : 'bg-slate-800/50 text-slate-500 hover:bg-slate-800 hover:text-amber-500'
              }`}
              title={isListening ? 'Aufnahme stoppen' : 'Sprach-zu-Text aktivieren'}
            >
              {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 rounded-xl bg-slate-800/50 p-3 text-slate-500 transition-colors hover:bg-slate-800 hover:text-amber-500"
            title="Datei anhängen"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <button
            onClick={onSend}
            disabled={isLoading || isListening || !input.trim()}
            className="shrink-0 rounded-xl bg-amber-500 p-3 text-slate-900 shadow-xl shadow-amber-500/20 transition-all hover:bg-amber-600 active:scale-90 disabled:cursor-not-allowed disabled:opacity-50"
            title="Senden"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
