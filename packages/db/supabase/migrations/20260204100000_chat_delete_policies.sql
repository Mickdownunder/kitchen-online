-- Chat-Löschung ermöglichen: Fehlende DELETE-Policies für chat_sessions und chat_messages
-- Ohne diese Policies blockiert RLS jedes DELETE, obwohl GRANT DELETE vorhanden ist.

-- Users können eigene Chat-Sessions löschen
CREATE POLICY "Users can delete own chat sessions"
  ON public.chat_sessions
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Users können Chat-Messages in eigenen Sessions löschen
-- (wird vom Code in chat.ts explizit vor Session-Löschung aufgerufen,
--  obwohl ON DELETE CASCADE das auch automatisch machen würde)
CREATE POLICY "Users can delete chat messages in own sessions"
  ON public.chat_messages
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.chat_sessions s
    WHERE s.id = chat_messages.session_id
    AND s.user_id = (SELECT auth.uid())
  ));
