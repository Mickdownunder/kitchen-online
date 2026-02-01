import { supabase } from '../client'
import { getCurrentUser } from './auth'
import { logger } from '@/lib/utils/logger'

export interface ChatSession {
  id: string
  userId: string
  title: string | null
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  id: string
  sessionId: string
  role: 'user' | 'model' | 'system'
  content: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  functionCalls?: Array<{ id: string; name: string; args: Record<string, any> }>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>
  createdAt: string
}

export async function createChatSession(title?: string): Promise<ChatSession> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({
      user_id: user.id,
      title: title || null,
    })
    .select()
    .single()

  if (error) throw error
  const d = data as { id: string; user_id: string; title: string | null; created_at: string; updated_at: string }
  return {
    id: d.id,
    userId: d.user_id,
    title: d.title,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  }
}

export async function getChatSessions(): Promise<ChatSession[]> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) throw error
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((s: any) => ({
    id: s.id,
    userId: s.user_id,
    title: s.title,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  }))
}

export async function getChatMessages(sessionId: string): Promise<ChatMessage[]> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')

  // Verify session belongs to user
  const { data: session } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (!session) throw new Error('Session not found or access denied')

  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (error) throw error
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((m: any) => ({
    id: m.id,
    sessionId: m.session_id,
    role: m.role,
    content: m.content,
    functionCalls: m.function_calls,
    metadata: m.metadata,
    createdAt: m.created_at,
  }))
}

export async function saveChatMessage(
  sessionId: string,
  role: 'user' | 'model' | 'system',
  content: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  functionCalls?: Array<{ id: string; name: string; args: Record<string, any> }>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>
): Promise<ChatMessage> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')

  // Verify session belongs to user
  const { data: session } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (!session) throw new Error('Session not found or access denied')

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      session_id: sessionId,
      role,
      content,
      function_calls: functionCalls || null,
      metadata: metadata || null,
    })
    .select()
    .single()

  if (error) throw error

  // Update session updated_at
  await supabase
    .from('chat_sessions')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', sessionId)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any
  return {
    id: d.id,
    sessionId: d.session_id,
    role: d.role,
    content: d.content,
    functionCalls: d.function_calls,
    metadata: d.metadata,
    createdAt: d.created_at,
  }
}

export async function updateChatSessionTitle(sessionId: string, title: string): Promise<void> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('chat_sessions')
    .update({ title })
    .eq('id', sessionId)
    .eq('user_id', user.id)

  if (error) throw error
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')

  logger.debug('[deleteChatSession] Starte Löschung für Session', {
    component: 'chat',
    sessionId,
    userId: user.id,
  })

  // Prüfe ob Session dem User gehört
  const { data: session, error: sessionError } = await supabase
    .from('chat_sessions')
    .select('id, user_id')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (sessionError) {
    console.error('[deleteChatSession] Session nicht gefunden:', sessionError)
    throw new Error(`Session nicht gefunden oder Zugriff verweigert: ${sessionError.message}`)
  }

  if (!session) {
    throw new Error('Session nicht gefunden oder Zugriff verweigert')
  }

  logger.debug('[deleteChatSession] Session gefunden, lösche Messages', {
    component: 'chat',
    sessionId,
  })

  // Lösche zuerst alle Messages (falls Foreign Key nicht CASCADE ist)
  const { error: messagesError } = await supabase
    .from('chat_messages')
    .delete()
    .eq('session_id', sessionId)

  if (messagesError) {
    console.warn(
      '[deleteChatSession] Fehler beim Löschen der Messages (möglicherweise CASCADE):',
      messagesError
    )
    // Nicht abbrechen, versuche Session trotzdem zu löschen
  }

  // Lösche dann die Session
  const { error } = await supabase
    .from('chat_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', user.id)

  if (error) {
    console.error('[deleteChatSession] Fehler beim Löschen der Session:', error)
    throw new Error(`Fehler beim Löschen der Session: ${error.message}`)
  }

  logger.info('[deleteChatSession] Session erfolgreich gelöscht', { component: 'chat', sessionId })
}
