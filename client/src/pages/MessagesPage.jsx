import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useConversations } from '../hooks/useMessages'
import { useAuth } from '../hooks/useAuth'
import { formatDateTime } from '../utils/format'
import { LoadingScreen } from '../components/ui/LoadingScreen'

export default function MessagesPage() {
  const navigate = useNavigate()
  const { role } = useAuth()
  const { items, loading } = useConversations()
  const [query, setQuery] = useState('')

  if (loading) return <LoadingScreen />

  const filtered = items.filter((c) =>
    (c.other_name ?? '').toLowerCase().includes(query.toLowerCase()),
  )

  const fallback = role === 'RECRUITER' || role === 'ADMIN'
    ? '/recruiter/jobs'
    : '/jobs'

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Messages</h1>
          <p className="text-sm text-base-content/60">Conversations with recruiters, students and faculty.</p>
        </div>
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
    </div>
  )
}
