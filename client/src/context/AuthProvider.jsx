import { useEffect, useState } from 'react'
import { AuthContext } from './AuthContext'
import { supabase } from '../lib/supabase'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const role = profile?.role ?? null

  async function loadProfile(userId) {
    if (!userId) {
      setProfile(null)
      return
    }
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    setProfile(data ?? null)
  }

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      await loadProfile(data.session?.user?.id)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSession(newSession)
      } else {
        setSession(newSession)
      }
      loadProfile(newSession?.user?.id)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  function signUp({ name, email, password, role }) {
    return supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role },
        emailRedirectTo: `${window.location.origin}/login?verified=true`,
      },
    })
  }

  function signIn({ email, password }) {
    return supabase.auth.signInWithPassword({ email, password })
  }

  function signOut() {
    return supabase.auth.signOut()
  }

  function resetPassword(email) {
    return supabase.auth.resetPasswordForEmail(email, {
      emailRedirectTo: `${window.location.origin}/reset-password`,
    })
  }

  function updatePassword(newPassword) {
    return supabase.auth.updateUser({ password: newPassword })
  }

  const value = {
    session,
    profile,
    role,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}