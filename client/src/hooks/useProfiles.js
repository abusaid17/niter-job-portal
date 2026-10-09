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

    const channel = supabase
      .channel(`notifications:${userId}`)
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

  async function remove(id) {
    if (!userId) return
    await supabase.from('notifications').delete().eq('id', id)
    await refresh()
  }

  const unread = items.filter((n) => !n.is_read).length

  return { items, unread, loading, refresh, markAllRead, markRead, remove }
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