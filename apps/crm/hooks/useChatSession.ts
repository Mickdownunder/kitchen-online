'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  createChatSession,
  getChatMessages,
  saveChatMessage,
  getChatSessions,
  deleteChatSession,
  ChatSession,
  ChatMessage,
} from '@/lib/supabase/services'
import { logger } from '@/lib/utils/logger'

export interface Message {
  role: 'user' | 'model'
  text: string
  id?: string
}

const INITIAL_MESSAGE: Message = {
  role: 'model',
  text: 'Hey Chef! Ich bin bereit. Was steht an? Du kannst mir auch einfach eine AB oder Rechnung rüberschieben.',
}

export function useChatSession() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [showHistory, setShowHistory] = useState(false)

  const loadChatSessions = useCallback(async () => {
    try {
      const sessions = await getChatSessions()
      setChatSessions(sessions)
      if (sessions.length > 0 && !currentSessionId) {
        setCurrentSessionId(sessions[0].id)
      }
    } catch (error) {
      console.error('Error loading chat sessions:', error)
    }
  }, [currentSessionId])

  const loadChatHistory = useCallback(async (sessionId: string) => {
    try {
      const history = await getChatMessages(sessionId)
      const formattedMessages: Message[] = history.map(m => ({
        role: m.role === 'model' ? 'model' : 'user',
        text: m.content,
        id: m.id,
      }))
      if (formattedMessages.length > 0) {
        setMessages(formattedMessages)
      }
    } catch (error) {
      console.error('Error loading chat history:', error)
    }
  }, [])

  // Load chat history when session is selected
  useEffect(() => {
    if (currentSessionId) {
      loadChatHistory(currentSessionId)
    }
  }, [currentSessionId, loadChatHistory])

  const createNewSession = useCallback(
    async (title?: string) => {
      try {
        const session = await createChatSession(title)
        setCurrentSessionId(session.id)
        setMessages([INITIAL_MESSAGE])
        await loadChatSessions()
        setShowHistory(false)
        return session
      } catch (error) {
        console.error('Error creating new session:', error)
        return null
      }
    },
    [loadChatSessions]
  )

  const deleteSession = useCallback(
    async (sessionId: string) => {
      try {
        logger.debug('[Chat] Lösche Session', {
          component: 'useChatSession',
          sessionId,
        })

        // Optimistic UI Update
        setChatSessions(prev => prev.filter(s => s.id !== sessionId))

        if (currentSessionId === sessionId) {
          setCurrentSessionId(null)
          setMessages([INITIAL_MESSAGE])
        }

        await deleteChatSession(sessionId)
        logger.info('[Chat] Session erfolgreich gelöscht', {
          component: 'useChatSession',
          sessionId,
        })

        await loadChatSessions()
        return true
      } catch (error: unknown) {
        console.error('[Chat] Error deleting chat session:', error)
        await loadChatSessions()
        return false
      }
    },
    [currentSessionId, loadChatSessions]
  )

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message])
  }, [])

  const saveUserMessage = useCallback(
    async (content: string) => {
      if (!currentSessionId) return
      try {
        await saveChatMessage(currentSessionId, 'user', content)
      } catch (error) {
        console.error('Error saving user message:', error)
      }
    },
    [currentSessionId]
  )

  const saveModelMessage = useCallback(
    async (
      content: string,
      functionCalls?: Array<{ id: string; name: string; args: Record<string, unknown> }>
    ) => {
      if (!currentSessionId) return
      try {
        await saveChatMessage(currentSessionId, 'model', content, functionCalls)
      } catch (error) {
        console.error('Error saving model message:', error)
      }
    },
    [currentSessionId]
  )

  const getOrCreateSession = useCallback(
    async (firstMessage?: string) => {
      if (currentSessionId) return currentSessionId

      try {
        const session = await createChatSession(firstMessage?.slice(0, 50))
        setCurrentSessionId(session.id)
        await loadChatSessions()
        return session.id
      } catch (error) {
        console.error('Error creating session:', error)
        return null
      }
    },
    [currentSessionId, loadChatSessions]
  )

  const getChatHistoryForContext = useCallback(
    async (limit: number = 10): Promise<ChatMessage[]> => {
      if (!currentSessionId) return []
      try {
        const history = await getChatMessages(currentSessionId)
        return history.slice(-limit)
      } catch (error) {
        console.error('Error loading chat history for context:', error)
        return []
      }
    },
    [currentSessionId]
  )

  return {
    // State
    messages,
    currentSessionId,
    chatSessions,
    showHistory,
    // Actions
    setMessages,
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
  }
}
