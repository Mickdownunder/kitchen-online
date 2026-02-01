'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Sparkles, X, History, Volume2, VolumeX, Minimize2, Maximize2 } from 'lucide-react'
import { CustomerProject, ProjectDocument } from '@/types'
import { logger } from '@/lib/utils/logger'
import { useAISpeech } from '@/hooks/useAISpeech'
import { useChatSession, Message } from '@/hooks/useChatSession'
import { ChatMessages } from './ai/ChatMessages'
import { ChatInput } from './ai/ChatInput'
import { ChatHistory } from './ai/ChatHistory'
import { ProactiveSuggestions } from './ai/ProactiveSuggestions'

interface AIAgentSidebarProps {
  projects: CustomerProject[]
  onFunctionCall: (
    name: string,
    args: Record<string, unknown>
  ) => Promise<string | void> | string | void
  onAddDocument: (projectId: string, doc: ProjectDocument) => void
  isOpen: boolean
  onClose: () => void
}

const AIAgentSidebar: React.FC<AIAgentSidebarProps> = ({
  projects,
  onFunctionCall,
  onAddDocument,
  isOpen,
  onClose,
}) => {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [attachedFile, setAttachedFile] = useState<{
    base64: string
    name: string
    type: string
  } | null>(null)
  const [streamingText, setStreamingText] = useState('')
  const [isMinimized, setIsMinimized] = useState(false)

  const abortControllerRef = useRef<AbortController | null>(null)

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

  // Optimize project data for API calls
  // NOTE: Invoice data is now loaded separately from the invoices table
  // Legacy fields (partialPayments, finalInvoice) are no longer included
  const optimizeProjectsForAPI = useCallback((projectList: CustomerProject[]) => {
    return projectList.map(p => ({
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
      items:
        p.items?.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          grossTotal: item.grossTotal,
          grossPricePerUnit: item.grossPricePerUnit,
          modelNumber: item.modelNumber || undefined,
          position: item.position,
        })) || [],
      notes: p.notes?.slice(-300) || '',
      complaints:
        p.complaints?.map(c => ({ description: c.description?.slice(0, 200) || '' })) || [],
      documentsCount: p.documents?.length || 0,
      isMeasured: p.isMeasured,
      isOrdered: p.isOrdered,
      isInstallationAssigned: p.isInstallationAssigned,
      orderDate: p.orderDate,
      measurementDate: p.measurementDate,
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

      // Stream response
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
      let functionCalls: Array<{ id: string; name: string; args: Record<string, unknown> }> = []

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                if (data.type === 'token' && data.text) {
                  fullText += data.text
                  setStreamingText(fullText)
                } else if (data.type === 'functionCalls') {
                  functionCalls = data.functionCalls || []
                  if (functionCalls.length > 0 && !fullText) {
                    const functionNames = functionCalls.map(fc => fc.name).join(', ')
                    setStreamingText(`Ich erledige das für dich... (${functionNames})`)
                  }
                } else if (data.type === 'error') {
                  throw new Error(data.error)
                }
              } catch {
                // Ignore JSON parse errors
              }
            }
          }
        }
      }

      // Save and display response
      if (sessionId && fullText) {
        await saveModelMessage(fullText, functionCalls.length > 0 ? functionCalls : undefined)
      }

      let finalText = fullText.trim()
      if (!finalText) {
        finalText =
          functionCalls.length > 0
            ? `Ich erledige das für dich... (${functionCalls.map(fc => fc.name).join(', ')})`
            : 'Ich bearbeite deine Anfrage...'
      }

      addMessage({ role: 'model', text: finalText })
      setStreamingText('')

      if (isTTSEnabled && finalText) speakText(finalText)

      // Handle function calls
      if (functionCalls.length > 0) {
        await handleFunctionCalls(functionCalls, sessionId, file)
      }
    } catch (error: unknown) {
      console.error('Agent Error:', error)
      const err = error as { name?: string; message?: string }
      const errorMessage =
        err.name === 'AbortError'
          ? 'Die Anfrage wurde abgebrochen.'
          : err.message
            ? `Fehler: ${err.message}`
            : 'Sorry Chef, da gab es einen Fehler in der Leitung.'

      addMessage({ role: 'model', text: errorMessage })
      setStreamingText('')
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  const handleFunctionCalls = async (
    functionCalls: Array<{ id: string; name: string; args: Record<string, unknown> }>,
    sessionId: string | null,
    file: { base64: string; name: string; type: string } | null
  ) => {
    const functionResponses = []
    const MAX_RETRIES = 3

    for (const fc of functionCalls) {
      let result: string | void = undefined
      let retryCount = 0
      let success = false

      while (retryCount < MAX_RETRIES && !success) {
        try {
          result = await onFunctionCall(fc.name, fc.args)

          if (result && typeof result === 'string') {
            if (result.startsWith('✅')) {
              success = true
            } else if (result.startsWith('❌') && retryCount < MAX_RETRIES - 1) {
              retryCount++
              await new Promise(resolve => setTimeout(resolve, 1000))
              continue
            } else {
              success = !result.startsWith('❌')
            }
          } else {
            success = true
          }
        } catch (error: unknown) {
          if (retryCount < MAX_RETRIES - 1) {
            retryCount++
            await new Promise(resolve => setTimeout(resolve, 1000))
            continue
          } else {
            result = `❌ Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
          }
        }
      }

      // Handle document archiving (Erfolg = Ergebnis beginnt mit ✅, Best Practice)
      if (
        fc.name === 'archiveDocument' &&
        typeof result === 'string' &&
        result.startsWith('✅') &&
        file
      ) {
        const newDoc: ProjectDocument = {
          id: 'ai-' + Date.now(),
          name: ((fc.args.documentType as string) || 'Dokument') + '_' + file.name,
          mimeType: file.type,
          data: `data:${file.type};base64,${file.base64}`,
          uploadedAt: new Date().toLocaleDateString('de-DE'),
        }
        onAddDocument(fc.args.projectId as string, newDoc)
      }

      functionResponses.push({
        id: fc.id,
        name: fc.name,
        response: { result: result || (success ? 'Erfolgreich ausgeführt.' : 'Fehlgeschlagen.') },
      })
    }

    // Follow-up with function results (chatHistory für Kontext, Best Practice)
    const chatHistoryForFollowUp = await getChatHistoryForContext(10)
    const followUpRes = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `INFO: Aktionen ausgeführt. Rückmeldung: ${JSON.stringify(functionResponses)}. Bitte antworte dem Nutzer.`,
        projects: optimizeProjectsForAPI(projects),
        sessionId,
        chatHistory: chatHistoryForFollowUp.map(m => ({ role: m.role, content: m.content })),
      }),
    })

    if (followUpRes.ok) {
      const followUpReader = followUpRes.body?.getReader()
      const decoder = new TextDecoder()
      let followUpText = ''

      if (followUpReader) {
        while (true) {
          const { done, value } = await followUpReader.read()
          if (done) break

          const chunk = decoder.decode(value)
          for (const line of chunk.split('\n')) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                if (data.type === 'token' && data.text) {
                  followUpText += data.text
                  setStreamingText(followUpText)
                }
              } catch {
                // Ignore
              }
            }
          }
        }
      }

      if (sessionId && followUpText) await saveModelMessage(followUpText)

      const finalFollowUp = followUpText || 'Aktionen erfolgreich ausgeführt.'
      addMessage({ role: 'model', text: finalFollowUp })
      setStreamingText('')

      if (isTTSEnabled && finalFollowUp) speakText(finalFollowUp)
    }
  }

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
              <h3 className="text-xl font-black tracking-tight text-white">Dein Assistent</h3>
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
          <ChatMessages
            messages={messages}
            streamingText={streamingText}
            isLoading={isLoading}
            isSpeaking={isSpeaking}
          />

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
