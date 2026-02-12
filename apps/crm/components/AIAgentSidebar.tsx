'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Sparkles, X, History, Volume2, VolumeX, Minimize2, Maximize2 } from 'lucide-react'
import { CustomerProject, ProjectDocument } from '@/types'
import { logger } from '@/lib/utils/logger'
import { useAISpeech } from '@/hooks/useAISpeech'
import { useChatSession, Message } from '@/hooks/useChatSession'
import { useApp } from '@/app/providers'
import { ChatMessages } from './ai/ChatMessages'
import { ChatInput } from './ai/ChatInput'
import { ChatHistory } from './ai/ChatHistory'
import { ProactiveSuggestions } from './ai/ProactiveSuggestions'
import { EmailConfirmationCard } from './ai/EmailConfirmationCard'
import type { PendingEmailAction } from '@/app/providers/ai/types/pendingEmail'

interface AIAgentSidebarProps {
  projects: CustomerProject[]
  onAddDocument: (projectId: string, doc: ProjectDocument) => void
  isOpen: boolean
  onClose: () => void
}

interface PendingEmailState {
  pending: PendingEmailAction
}

const AIAgentSidebar: React.FC<AIAgentSidebarProps> = ({
  projects,
  onAddDocument,
  isOpen,
  onClose,
}) => {
  void onAddDocument
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [attachedFile, setAttachedFile] = useState<{
    base64: string
    name: string
    type: string
  } | null>(null)
  const [streamingText, setStreamingText] = useState('')
  const [isMinimized, setIsMinimized] = useState(false)
  const [pendingEmail, setPendingEmail] = useState<PendingEmailState | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)
  const { refreshProjects } = useApp()

  // Use extracted hooks
  const {
    isListening,
    isSpeechSupported,
    isTTSEnabled,
    isSpeaking,
    speechError,
    interimTranscript,
    toggleListening,
    speakText,
    stopSpeaking,
    toggleTTS,
  } = useAISpeech({
    onTranscript: text => setInput(prev => prev + (prev ? ' ' : '') + text),
  })

  const {
    messages,
    currentSessionId,
    chatSessions,
    showHistory,
    setShowHistory,
    setCurrentSessionId,
    loadChatSessions,
    createNewSession,
    deleteSession,
    addMessage,
    saveUserMessage,
    saveModelMessage,
    getOrCreateSession,
    getChatHistoryForContext,
  } = useChatSession()

  // Load sessions when sidebar opens
  useEffect(() => {
    if (isOpen) {
      loadChatSessions()
    }
  }, [isOpen, loadChatSessions])

  // Optimize project data for API calls - minimize token usage
  const optimizeProjectsForAPI = useCallback((projectList: CustomerProject[]) => {
    // Only send active projects (not archived/cancelled) to save tokens
    // Include recently completed projects (last 30 days) for reference
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const activeProjects = projectList.filter(p => {
      if (p.status === 'Abgeschlossen') {
        // Include completed projects from last 30 days
        const updatedAt = p.updatedAt ? new Date(p.updatedAt) : null
        return updatedAt && updatedAt >= thirtyDaysAgo
      }
      // Always include non-completed projects
      return true
    })

    return activeProjects.map(p => ({
      id: p.id,
      customerName: p.customerName,
      status: p.status,
      orderNumber: p.orderNumber,
      totalAmount: p.totalAmount,
      netAmount: p.netAmount,
      taxAmount: p.taxAmount,
      isDepositPaid: p.isDepositPaid,
      isFinalPaid: p.isFinalPaid,
      salespersonName: p.salespersonName,
      // Limit items to max 20 per project (enough for context)
      items:
        p.items?.slice(0, 20).map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          grossTotal: item.grossTotal,
          grossPricePerUnit: item.grossPricePerUnit,
          modelNumber: item.modelNumber || undefined,
          position: item.position,
        })) || [],
      notes: p.notes?.slice(-200) || '',
      complaints:
        p.complaints?.map(c => ({ description: c.description?.slice(0, 100) || '' })) || [],
      isMeasured: p.isMeasured,
      isOrdered: p.isOrdered,
      isInstallationAssigned: p.isInstallationAssigned,
      orderDate: p.orderDate,
      measurementDate: p.measurementDate,
      deliveryDate: p.deliveryDate,
      installationDate: p.installationDate,
    }))
  }, [])

  const handleSend = async () => {
    if ((!input.trim() && !attachedFile) || isLoading) return

    const userMsg = input
    const file = attachedFile

    // Get or create session
    const sessionId = await getOrCreateSession(userMsg)

    // Save user message
    if (sessionId) {
      await saveUserMessage(file ? `[Datei: ${file.name}] ${userMsg}` : userMsg)
    }

    setInput('')
    setAttachedFile(null)
    setStreamingText('')

    const userMessage: Message = {
      role: 'user',
      text: file ? `[Datei hochgeladen: ${file.name}] ${userMsg}` : userMsg,
    }
    addMessage(userMessage)
    setIsLoading(true)

    try {
      let prompt = userMsg

      // Analyze file if attached
      if (file) {
        const analysisRes = await fetch('/api/analyze-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64Data: file.base64,
            mimeType: file.type,
            prompt: userMsg || 'Analysiere das Dokument.',
          }),
        })
        const analysisData = await analysisRes.json()
        const analysis = analysisData.analysis || analysisData.error || 'Analyse fehlgeschlagen.'
        prompt = `DER NUTZER HAT EINE DATEI (${file.name}) HOCHGELADEN. HIER IST DIE ANALYSE: ${analysis}\nNUTZER-ANFRAGE DAZU: ${userMsg || 'Was sagst du dazu?'}`
      }

      const chatHistory = await getChatHistoryForContext(10)
      const optimizedProjects = optimizeProjectsForAPI(projects)

      logger.debug('[Chat] Sende optimierte Projekte', {
        component: 'AIAgentSidebar',
        optimizedCount: optimizedProjects.length,
      })

      // Stream response with server-side function execution
      abortControllerRef.current = new AbortController()
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          projects: optimizedProjects,
          sessionId,
          chatHistory: chatHistory.slice(-10),
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) throw new Error(`API error: ${response.status}`)

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      let hadFunctionCalls = false
      let lastFunctionResult = ''
      let hadPendingEmailThisTurn = false
      let updatedProjectIds: string[] = []

      if (reader) {
        let buffer = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          // Keep incomplete line in buffer
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            try {
              const data = JSON.parse(line.slice(6))

              switch (data.type) {
                case 'token':
                  if (data.text) {
                    fullText += data.text
                    setStreamingText(fullText)
                  }
                  break

                case 'functionCalls':
                  // Server is executing these - show progress to user (only if no streamed text yet)
                  hadFunctionCalls = true
                  if (data.functionCalls?.length > 0) {
                    const names = data.functionCalls.map((fc: { name: string }) => fc.name).join(', ')
                    setStreamingText(prev => prev || `Führe Aktionen aus: ${names}...`)
                  }
                  break

                case 'functionResult':
                  // Show individual function results as they complete
                  if (data.result) {
                    const resultLine = `${data.functionName}: ${data.result}`
                    lastFunctionResult = resultLine
                    setStreamingText(prev => {
                      if (prev.includes('Führe Aktionen aus:') || (prev.endsWith('...') && prev.length < 80)) {
                        return resultLine
                      }
                      return prev + '\n' + resultLine
                    })
                  }
                  break

                case 'pendingEmail':
                  // Human-in-the-loop: Show email confirmation
                  if (data.email) {
                    hadPendingEmailThisTurn = true
                    setPendingEmail({
                      pending: {
                        type: 'pendingEmail',
                        functionName: data.email.functionName,
                        to: data.email.to,
                        subject: data.email.subject,
                        bodyPreview: data.email.bodyPreview,
                        api: data.email.api,
                        payload: data.email.payload,
                        functionCallId: '',
                        projectId: data.email.projectId,
                        reminderType: data.email.reminderType,
                      },
                    })
                  }
                  break

                case 'done':
                  updatedProjectIds = data.updatedProjectIds || []
                  break

                case 'error':
                  throw new Error(data.error)
              }
            } catch (e) {
              // Only throw if it was an explicit error event
              if (e instanceof Error && !e.message.includes('JSON')) throw e
            }
          }
        }
      }

      // If projects were modified, refresh them
      if (updatedProjectIds.length > 0) {
        refreshProjects(true, true)
      }

      // Save and display final response
      const functionCallsForSave = hadFunctionCalls ? [{ id: 'server', name: 'server-executed', args: {} }] : undefined
      if (sessionId && fullText) {
        await saveModelMessage(fullText, functionCallsForSave)
      }

      let finalText = fullText.trim()
      if (!finalText) {
        if (hadFunctionCalls) {
          // Zeige letzten Funktions-Ergebnis (z. B. "sendEmail: E-Mail-Versand erfordert Bestätigung...") statt nur "Aktion ausgeführt"
          finalText =
            lastFunctionResult ||
            'Aktionen erfolgreich ausgeführt. Bitte ggf. Bestätigung unten nutzen.'
        } else {
          finalText = 'Ich bearbeite deine Anfrage...'
        }
      }
      if (hadPendingEmailThisTurn) {
        finalText = `${finalText}\n\n📧 Bitte E-Mail-Versand unten mit „Senden“ bestätigen.`
      }

      addMessage({ role: 'model', text: finalText })
      setStreamingText('')

      if (isTTSEnabled && finalText) speakText(finalText)
    } catch (error: unknown) {
      logger.error('Agent Error', { component: 'AIAgentSidebar' }, error instanceof Error ? error : new Error(String(error)))
      const err = error as { name?: string; message?: string }
      const errorMessage =
        err.name === 'AbortError'
          ? 'Die Anfrage wurde abgebrochen.'
          : err.message
            ? `Fehler: ${err.message}`
            : 'Es ist ein Fehler aufgetreten.'

      addMessage({ role: 'model', text: errorMessage })
      setStreamingText('')
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  const handleEmailConfirm = useCallback(async () => {
    if (!pendingEmail) return

    const { pending } = pendingEmail

    try {
      const res = await fetch(pending.api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pending.payload),
      })

      const data = await res.json().catch(() => ({}))
      const success = res.ok
      const resultMsg = success
        ? data.message || `✅ E-Mail erfolgreich an ${pending.to} versendet: "${pending.subject}"`
        : `❌ ${data.error || 'Fehler beim Versenden'}`

      setPendingEmail(null)
      addMessage({ role: 'model', text: resultMsg })

      if (success && pending.projectId) {
        refreshProjects(true, true)
      }
    } catch (err) {
      setPendingEmail(null)
      const errMsg = err instanceof Error ? err.message : 'Unbekannter Fehler beim Versenden'
      addMessage({ role: 'model', text: `❌ ${errMsg}` })
    }
  }, [pendingEmail, refreshProjects, addMessage])

  const handleEmailCancel = useCallback(() => {
    if (!pendingEmail) return
    setPendingEmail(null)
    addMessage({ role: 'model', text: 'E-Mail-Versand abgebrochen.' })
  }, [pendingEmail, addMessage])

  if (!isOpen) return null

  return (
    <div
      className={`animate-in slide-in-from-right fixed right-0 top-0 z-[150] flex flex-col border-l border-white/10 bg-slate-900 shadow-[-30px_0_60px_rgba(0,0,0,0.6)] duration-300 ${isMinimized ? 'h-auto w-[320px]' : 'h-full w-[480px]'}`}
    >
      {/* Header */}
      <div className="border-b border-white/5 bg-gradient-to-br from-indigo-950 to-slate-900 p-8">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-[1.2rem] bg-amber-500 p-3 shadow-xl shadow-amber-500/30">
              <Sparkles className="h-6 w-6 text-slate-900" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-white">June</h3>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500"></span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Online & Mitdenkend
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {'speechSynthesis' in (typeof window !== 'undefined' ? window : {}) && (
              <button
                onClick={isSpeaking ? stopSpeaking : toggleTTS}
                className={`p-2 transition-colors ${
                  isTTSEnabled
                    ? isSpeaking
                      ? 'text-red-500 hover:text-red-400'
                      : 'text-amber-500 hover:text-amber-400'
                    : 'text-slate-500 hover:text-white'
                }`}
                title={
                  isSpeaking
                    ? 'Sprachausgabe stoppen'
                    : isTTSEnabled
                      ? 'Sprachausgabe deaktivieren'
                      : 'Sprachausgabe aktivieren'
                }
              >
                {isSpeaking ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
            )}
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="p-2 text-slate-500 transition-colors hover:text-white"
              title="Chat-Verlauf"
            >
              <History className="h-5 w-5" />
            </button>
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-2 text-slate-500 transition-colors hover:text-white"
              title={isMinimized ? 'Maximieren' : 'Minimieren'}
            >
              {isMinimized ? <Maximize2 className="h-5 w-5" /> : <Minimize2 className="h-5 w-5" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-500 transition-colors hover:text-white"
            >
              <X className="h-7 w-7" />
            </button>
          </div>
        </div>

        <ProactiveSuggestions projects={projects} onSelectSuggestion={setInput} />

        {showHistory && (
          <ChatHistory
            sessions={chatSessions}
            currentSessionId={currentSessionId}
            onSelectSession={setCurrentSessionId}
            onDeleteSession={deleteSession}
            onCreateSession={() => createNewSession()}
            onClose={() => setShowHistory(false)}
          />
        )}
      </div>

      {/* Main Content */}
      {!isMinimized && (
        <>
          <div className="flex min-h-0 flex-1 flex-col">
            <ChatMessages
              messages={messages}
              streamingText={streamingText}
              isLoading={isLoading}
              isSpeaking={isSpeaking}
            />

            {pendingEmail && (
              <div className="sticky bottom-0 z-10 shrink-0 border-t border-amber-500/20 bg-slate-900/95 px-8 py-4 backdrop-blur-sm">
                <EmailConfirmationCard
                  pending={pendingEmail.pending}
                  functionCallId={pendingEmail.pending.functionCallId}
                  onConfirm={handleEmailConfirm}
                  onCancel={handleEmailCancel}
                />
              </div>
            )}
          </div>

          <ChatInput
            input={input}
            setInput={setInput}
            attachedFile={attachedFile}
            setAttachedFile={setAttachedFile}
            isLoading={isLoading}
            isListening={isListening}
            isSpeechSupported={isSpeechSupported}
            speechError={speechError}
            interimTranscript={interimTranscript}
            onSend={handleSend}
            onToggleListening={toggleListening}
          />
        </>
      )}
    </div>
  )
}

export default AIAgentSidebar
