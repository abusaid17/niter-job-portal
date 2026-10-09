import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useStudentProfile() {
  const { session } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!session) {
      setProfile(null)
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('students')
      .select('*, users(name)')
      .eq('user_id', session.user.id)
      .maybeSingle()
    setProfile(data ?? null)
    setLoading(false)
  }, [session])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { profile, loading, refresh }
}

export function useAlumniProfile() {
  const { session } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!session) {
      setProfile(null)
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('alumni')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle()
    setProfile(data ?? null)
    setLoading(false)
  }, [session])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { profile, loading, refresh }
}

export function useRecruiterProfile() {
  const { session } = useAuth()
  const [recruiter, setRecruiter] = useState(null)
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!session) {
      setRecruiter(null)
      setCompany(null)
      setLoading(false)
      return
    }
    // First, get the recruiter row (always accessible via RLS)
    const { data: recruiterData, error: recruiterError } = await supabase
      .from('recruiters')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (recruiterError) {
      console.error('[useRecruiterProfile] recruiter fetch error:', recruiterError)
    }

    if (recruiterData) {
      setRecruiter(recruiterData)
      // Try to fetch the company separately - this handles RLS issues where the join might fail
      if (recruiterData.company_id) {
        const { data: companyData } = await supabase
          .from('companies')
          .select('*')
          .eq('id', recruiterData.company_id)
          .maybeSingle()
        setCompany(companyData ?? null)
      } else {
        setCompany(null)
      }
    } else {
      setRecruiter(null)
      setCompany(null)
    }
    setLoading(false)
  }, [session])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { recruiter, company, loading, refresh }
}

export function useFacultyProfile() {
  const { session } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!session) {
      setProfile(null)
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('faculty')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle()
    setProfile(data ?? null)
    setLoading(false)
  }, [session])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { profile, loading, refresh }
}

export function useNotifications({ limit = 20 } = {}) {
  const { session, loading: authLoading } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const userId = session?.user?.id
  const channelRef = useRef(null)
  const subscribedRef = useRef(false)
  const channelNameRef = useRef(null)
  const [loadError, setLoadError] = useState(null)

  const refresh = useCallback(async () => {
    if (!userId) {
      setItems([])
      setLoading(false)
      return
    }
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) {
      console.error('[useNotifications] fetch error:', error.message)
      setLoadError(error.message)
    } else {
      setLoadError(null)
    }
    setItems(data ?? [])
    setLoading(false)
  }, [userId, limit])

  useEffect(() => {
    if (authLoading) return
    refresh()
  }, [refresh, authLoading])

  useEffect(() => {
    if (!userId || authLoading) return

    // Prevent duplicate subscriptions
    if (subscribedRef.current && channelRef.current) {
      return
    }

    // Clean up existing channel first
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
      subscribedRef.current = false
    }

    const uniqueSuffix = crypto.randomUUID()
    const channelName = `notifications:${userId}:${uniqueSuffix}`
    channelNameRef.current = channelName

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setItems((prev) => {
              const exists = prev.some((n) => n.id === payload.new.id)
              if (exists) return prev
              return [payload.new, ...prev].slice(0, limit)
            })
          } else if (payload.eventType === 'UPDATE') {
            setItems((prev) =>
              prev.map((n) => (n.id === payload.new.id ? payload.new : n))
            )
          } else if (payload.eventType === 'DELETE') {
            setItems((prev) => prev.filter((n) => n.id !== payload.old.id))
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          subscribedRef.current = true
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          subscribedRef.current = false
        }
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
        subscribedRef.current = false
      }
    }
  }, [userId, authLoading])

  async function markAllRead() {
    if (!userId) return
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .is('is_read', false)
    await refresh()
  }

  async function markRead(id) {
    if (!userId) return
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
    await refresh()
  }

  /**
   * Delete one notification owned by the current user.
   * The `.eq('user_id', userId)` guard plus the database RLS policy
   * ("notifications: delete own", user_id = auth.uid()) together ensure
   * a user can never delete another user's notification. RLS-blocked
   * DELETEs succeed silently with zero rows, so deletion is verified
   * via RETURNING (`select('id')`): on failure the item is restored and
   * an error is returned instead of a false success.
   */
  async function deleteNotification(id) {
    if (!userId) return { error: 'Not authenticated.' }
    const snapshot = items
    setItems((prev) => prev.filter((n) => n.id !== id))
    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select('id')
    if (error || !data || data.length === 0) {
      setItems(snapshot)
      return { error: error?.message ?? 'Delete was not permitted for this notification.' }
    }
    await refresh()
    return { error: null }
  }

  async function remove(id) {
    return deleteNotification(id)
  }

  /**
   * Delete ALL notifications owned by the current user (read and unread).
   * Optimistic clear with rollback + RETURNING verification, same as above.
   */
  async function clearAll() {
    if (!userId) return { error: 'Not authenticated.', count: 0 }
    if (items.length === 0) return { error: null, count: 0 }
    const snapshot = items
    setItems([])
    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId)
      .select('id')
    const deleted = data?.length ?? 0
    if (error || (deleted === 0 && snapshot.length > 0)) {
      setItems(snapshot)
      return { error: error?.message ?? 'Delete was not permitted.', count: 0 }
    }
    await refresh()
    return { error: null, count: deleted }
  }

  const unread = items.filter((n) => !n.is_read).length

  return { items, unread, loading, loadError, refresh, markAllRead, markRead, remove, deleteNotification, clearAll }
}

export function useStudentSkills() {
  const { session } = useAuth()
  const [skills, setSkills] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!session) {
      setSkills([])
      setLoading(false)
      return
    }
    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', session.user.id)
      .maybeSingle()
    if (!student) {
      setSkills([])
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('student_skills')
      .select('skills(name)')
      .eq('student_id', student.id)
    setSkills((data ?? []).map((s) => s.skills?.name).filter(Boolean))
    setLoading(false)
  }, [session])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { skills, loading, refresh }
}