import { useEffect, useState, useCallback } from 'react'
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
    const { data } = await supabase
      .from('recruiters')
      .select('*, companies(*)')
      .eq('user_id', session.user.id)
      .maybeSingle()
    if (data) {
      setRecruiter(data)
      setCompany(data.companies ?? null)
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
  const { session } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!session) {
      setItems([])
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(limit)
    setItems(data ?? [])
    setLoading(false)
  }, [session, limit])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!session) return undefined

    const channel = supabase
      .channel(`notifications:${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${session.user.id}`,
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
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session, limit])

  async function markAllRead() {
    if (!session) return
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', session.user.id)
      .is('is_read', false)
    await refresh()
  }

  async function markRead(id) {
    if (!session) return
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
    await refresh()
  }

  async function remove(id) {
    if (!session) return
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