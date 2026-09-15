import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

let realtimeChannelSeq = 0

function freshTopic(base) {
  realtimeChannelSeq += 1
  return `${base}-${realtimeChannelSeq}`
}

export function useConversations() {
  const { session } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!session) {
      setItems([])
      setLoading(false)
      return
    }
    const { data } = await supabase.rpc('my_conversations')
    setItems(data ?? [])
    setLoading(false)
  }, [session])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!session) return undefined
    const channel = supabase
      .channel(freshTopic('conversations-' + session.user.id))
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => refresh(),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [session, refresh])

  const unread = items.reduce((sum, c) => sum + (Number(c.unread_count) || 0), 0)

  return { items, unread, loading, refresh }
}

export function useMessageThread(conversationId) {
  const { session } = useAuth()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const idRef = useRef(conversationId)

  useEffect(() => {
    idRef.current = conversationId
  }, [conversationId])

  const load = useCallback(async () => {
    const id = idRef.current
    if (!id) {
      setMessages([])
      setLoading(false)
      return
    }
    const { data, error: e } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })
    if (e) setError(e.message)
    setMessages(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    setMessages([])
    setLoading(true)
    setError(null)
    load()
    if (session) {
      supabase.rpc('mark_conversation_read', { p_conversation_id: conversationId })
    }
  }, [conversationId, session, load])

  useEffect(() => {
    if (!conversationId) return undefined
    const channel = supabase
      .channel(freshTopic('thread-' + conversationId))
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new])
          if (session) {
            supabase.rpc('mark_conversation_read', { p_conversation_id: conversationId })
          }
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, session])

  async function send(body) {
    if (!session || !conversationId || !body?.trim()) return null
    setSending(true)
    setError(null)
    const { data, error: e } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: session.user.id,
        body: body.trim(),
      })
      .select('*')
      .single()
    setSending(false)
    if (e) {
      setError(e.message)
      return null
    }
    setMessages((prev) => [...prev, data])
    return data
  }

  return { messages, loading, sending, error, send, clearError: () => setError(null) }
}
