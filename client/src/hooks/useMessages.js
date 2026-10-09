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
  const channelRef = useRef(null)

  const refresh = useCallback(async () => {
    if (!session) {
      setItems([])
      setLoading(false)
      return
    }
    const { data, error } = await supabase.rpc('my_conversations')
    if (error) {
      console.error('[useConversations] refresh error:', error)
    }
    setItems(data ?? [])
    setLoading(false)
  }, [session])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!session) return undefined

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    const channel = supabase
      .channel(freshTopic('conversations-' + session.user.id))
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=neq.${session.user.id}`,
        },
        () => refresh(),
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_members',
          filter: `user_id=eq.${session.user.id}`,
        },
        () => refresh(),
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[useConversations] Realtime subscribed')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[useConversations] Realtime channel error')
        }
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [session, refresh])

  const unread = items.reduce((sum, c) => sum + (Number(c.unread_count) || 0), 0)

  return { items, unread, loading, refresh }
}

export async function startConversation(otherUserId) {
  const { data, error } = await supabase.rpc('start_conversation', { p_other_user: otherUserId })
  if (error) throw error
  return data
}

export function useMessageThread(conversationId) {
  const { session } = useAuth()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const idRef = useRef(conversationId)
  const hasMarkedReadRef = useRef(false)

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

  const markRead = useCallback(async () => {
    const id = idRef.current
    if (!id || !session) return
    const { data, error: e } = await supabase.rpc('mark_conversation_read', { p_conversation_id: id })
    if (e) console.error('[useMessageThread] mark_read error:', e)
    // data is the number of rows updated (0 or 1)
    if (data === 0) {
      console.warn('[useMessageThread] mark_conversation_read: no rows updated (RLS may have blocked)')
    }
  }, [session])

  useEffect(() => {
    setMessages([])
    setLoading(true)
    setError(null)
    hasMarkedReadRef.current = false
    load()
    if (session && !hasMarkedReadRef.current) {
      hasMarkedReadRef.current = true
      markRead()
    }
  }, [conversationId, session, load, markRead])

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
          const newMsg = payload.new
          setMessages((prev) => [...prev, newMsg])
          // If the message is from someone else, mark conversation as read immediately
          if (newMsg.sender_id !== session?.user?.id) {
            markRead()
          }
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, session, markRead])

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
