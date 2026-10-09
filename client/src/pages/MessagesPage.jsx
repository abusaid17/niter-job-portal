import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useConversations } from '../hooks/useMessages'
import { useAuth } from '../hooks/useAuth'
import { startConversation } from '../hooks/useMessages'
import { supabase } from '../lib/supabase'
import { formatDateTime } from '../utils/format'
import { LoadingScreen } from '../components/ui/LoadingScreen'
import { ROLE_LABELS } from '../utils/roles'

export default function MessagesPage() {
  const navigate = useNavigate()
  const { role, session } = useAuth()
  const { items, loading } = useConversations()
  const [query, setQuery] = useState('')
  const [showNewMessage, setShowNewMessage] = useState(false)
  const [userQuery, setUserQuery] = useState('')
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [messagingId, setMessagingId] = useState(null)

  const fallback = role === 'RECRUITER' || role === 'ADMIN'
    ? '/recruiter/jobs'
    : '/jobs'

  async function searchUsers() {
    if (!userQuery.trim()) {
      setUsers([])
      return
    }
    setLoadingUsers(true)
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role')
      .or(`name.ilike.%${userQuery}%,email.ilike.%${userQuery}%`)
      .neq('id', session?.user?.id)
      .limit(20)
    setLoadingUsers(false)
    if (error) {
      console.error('User search error:', error)
      setUsers([])
      return
    }
    setUsers(data ?? [])
  }

  async function startNewMessage(userId, _userName) {
    setMessagingId(userId)
    try {
      const conversationId = await startConversation(userId)
      setShowNewMessage(false)
      setUserQuery('')
      setUsers([])
      navigate(`/messages/${conversationId}`)
    } catch (e) {
      console.error('Start conversation error:', e)
      alert(e.message)
    } finally {
      setMessagingId(null)
    }
  }

  const filtered = items.filter((c) =>
    (c.other_name ?? '').toLowerCase().includes(query.toLowerCase()),
  )

  if (loading) return <LoadingScreen />

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Messages</h1>
          <p className="text-sm text-base-content/60">Conversations with recruiters, students and faculty.</p>
        </div>
        {role === 'ADMIN' && (
          <button className="btn btn-primary" onClick={() => setShowNewMessage(true)}>
            New message
          </button>
        )}
      </div>

      <input
        className="input input-bordered"
        placeholder="Search conversations…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {filtered.length === 0 ? (
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body text-center">
            <p className="text-base-content/70">No conversations yet.</p>
            <Link to={fallback} className="link link-primary text-sm">
              Browse jobs to find people to talk to
            </Link>
          </div>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((c) => (
            <li key={c.conversation_id}>
              <button
                type="button"
                className="card w-full bg-base-100 text-left shadow-sm transition hover:bg-base-200"
                onClick={() => navigate(`/messages/${c.conversation_id}`)}
              >
                <div className="card-body flex-row items-center gap-3 p-4">
                  <div className="avatar placeholder">
                    <div className="w-11 rounded-full bg-primary text-neutral-content">
                      <span className="text-lg">{(c.other_name ?? '?').charAt(0).toUpperCase()}</span>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{c.other_name ?? 'Unknown'}</span>
                      {Number(c.unread_count) > 0 && (
                        <span className="badge badge-error badge-sm">{c.unread_count}</span>
                      )}
                    </div>
                    <p className="truncate text-sm text-base-content/70">{c.last_message || 'No messages yet'}</p>
                  </div>
                  {c.last_message_at && (
                    <span className="shrink-0 text-xs text-base-content/50">{formatDateTime(c.last_message_at)}</span>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {showNewMessage && role === 'ADMIN' && (
        <div className="modal modal-open">
          <div className="modal-box max-w-md">
            <h3 className="font-bold text-lg mb-4">New message</h3>
            <input
              className="input input-bordered w-full mb-4"
              placeholder="Search by name or email…"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
              autoFocus
            />
            <button className="btn btn-sm btn-outline mb-4" onClick={searchUsers} disabled={loadingUsers || !userQuery.trim()}>
              {loadingUsers ? <span className="loading loading-spinner loading-sm" /> : 'Search'}
            </button>
            {userQuery.trim() && users.length === 0 && !loadingUsers && (
              <p className="text-sm text-base-content/60 text-center py-4">No users found</p>
            )}
            <ul className="flex flex-col gap-2 max-h-64 overflow-y-auto">
              {users.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-2 p-2 hover:bg-base-200 rounded">
                  <div className="flex items-center gap-2">
                    <div className="avatar placeholder">
                      <div className="w-8 rounded-full bg-primary text-neutral-content">
                        <span className="text-xs">{(u.name ?? '?').charAt(0).toUpperCase()}</span>
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-sm">{u.name}</div>
                      <div className="flex items-center gap-1 text-xs text-base-content/60">
                        <span>{u.email}</span>
                        <span className="badge badge-xs badge-outline">{ROLE_LABELS[u.role] ?? u.role}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    className="btn btn-sm btn-primary"
                    disabled={messagingId === u.id}
                    onClick={() => startNewMessage(u.id, u.name)}
                  >
                    {messagingId === u.id ? <span className="loading loading-spinner loading-sm" /> : 'Message'}
                  </button>
                </li>
              ))}
            </ul>
            <div className="modal-action mt-4">
              <button className="btn btn-outline" onClick={() => setShowNewMessage(false)}>Cancel</button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop" onClick={() => setShowNewMessage(false)}></form>
        </div>
      )}
    </div>
  )
}
