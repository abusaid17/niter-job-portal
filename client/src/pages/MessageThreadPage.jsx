import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useMessageThread } from '../hooks/useMessages'
import { useAuth } from '../hooks/useAuth'
import { formatDateTime } from '../utils/format'
import { LoadingScreen } from '../components/ui/LoadingScreen'

const QUICK_TEMPLATES = [
  {
    label: 'Profile update needed',
    body: 'Hi, we noticed your profile needs some updates. Please review and complete the missing information to improve your visibility to recruiters.',
  },
]

export default function MessageThreadPage() {
  const { conversationId } = useParams()
  const { session, role } = useAuth()
  const { messages, loading, sending, error, send } = useMessageThread(conversationId)
  const [otherName, setOtherName] = useState('')
  const [body, setBody] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    let active = true
    async function loadOther() {
      const { data } = await supabase.rpc('my_conversations')
      if (!active) return
      const match = (data ?? []).find((c) => String(c.conversation_id) === String(conversationId))
      setOtherName(match?.other_name ?? '')
    }
    loadOther()
    return () => {
      active = false
    }
  }, [conversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  function applyTemplate(template) {
    setBody(template.body)
  }

  async function submit(e) {
    e.preventDefault()
    if (!body.trim()) return
    await send(body)
    setBody('')
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="mx-auto flex h-[calc(100svh-9rem)] max-w-3xl flex-col gap-3">
      <div className="flex items-center justify-between">
        <Link to="/messages" className="link link-primary text-sm">
          ← Messages
        </Link>
        <h1 className="text-2xl font-bold">{otherName || 'Conversation'}</h1>
        <span className="w-20" />
      </div>

      {error && (
        <div role="alert" className="alert alert-error text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto rounded-box bg-base-100 p-4 shadow-sm">
        {messages.length === 0 ? (
          <p className="m-auto text-sm text-base-content/60">No messages yet. Say hello!</p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === session?.user?.id
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-box px-3 py-2 text-sm ${
                    mine ? 'bg-primary text-primary-content' : 'bg-base-200'
                  }`}
                >
                  <p className="whitespace-pre-wrap break words">{m.body}</p>
                  <span className={`mt-0.5 block text-[10px] ${mine ? 'text-primary-content/70' : 'text-base-content/50'}`}>
                    {formatDateTime(m.created_at)}
                  </span>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={submit} className="flex flex-col gap-2">
        {role === 'ADMIN' && (
          <div className="dropdown dropdown-end">
            <label tabIndex={0} className="btn btn-sm btn-outline btn-ghost">
              Quick templates
              <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
            </label>
            <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-72">
              {QUICK_TEMPLATES.map((t) => (
                <li key={t.label}>
                  <button className="text-sm px-2 py-1" onClick={() => applyTemplate(t)}>
                    {t.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            className="textarea textarea-bordered flex-1"
            rows={2}
            placeholder="Type a message…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit(e)
              }
            }}
          />
          <button className="btn btn-primary" disabled={sending || !body.trim()}>
            {sending && <span className="loading loading-spinner loading-sm" />}
            Send
          </button>
        </div>
      </form>
    </div>
  )
}
