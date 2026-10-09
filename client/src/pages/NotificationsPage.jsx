import { useMemo, useState } from 'react'
import {
  AlertCircle,
  Bell,
  BellOff,
  Briefcase,
  CalendarClock,
  Check,
  CheckCheck,
  CheckCircle2,
  FileText,
  Info,
  MessageSquare,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react'
import { useNotifications } from '../hooks/useProfiles'
import { useAuth } from '../hooks/useAuth'
import { formatDateTime } from '../utils/format'

const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'UNREAD', label: 'Unread' },
]

/** Icon + tint per notification kind. */
function typeMeta(n) {
  const hay = `${n?.type ?? ''} ${n?.title ?? ''} ${n?.message ?? ''}`.toLowerCase()
  if (/(interview|schedule|reminder)/.test(hay)) return { Icon: CalendarClock, cls: 'bg-violet-500/10 text-violet-600' }
  if (/(application|applied|applicant|shortlist|select|reject)/.test(hay)) return { Icon: FileText, cls: 'bg-sky-500/10 text-sky-600' }
  if (/(job|vacancy|recruit|hire)/.test(hay)) return { Icon: Briefcase, cls: 'bg-amber-500/10 text-amber-600' }
  if (/(message|chat|conversation)/.test(hay)) return { Icon: MessageSquare, cls: 'bg-emerald-500/10 text-emerald-600' }
  if (/(verif|approv|account|profile)/.test(hay)) return { Icon: ShieldCheck, cls: 'bg-primary/10 text-primary' }
  if (/(system|welcome|announcement|event)/.test(hay)) return { Icon: Info, cls: 'bg-slate-500/10 text-slate-500' }
  return { Icon: Bell, cls: 'bg-base-300/60 text-base-content/70' }
}

function timeAgo(value) {
  if (!value) return ''
  const t = new Date(value).getTime()
  if (Number.isNaN(t)) return ''
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000))
  if (s < 60) return 'Just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d === 1) return 'Yesterday'
  if (d < 7) return `${d}d ago`
  return formatDateTime(value)
}

function dayGroup(value) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return 'Earlier'
  const now = new Date()
  const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = startOf(now) - startOf(d)
  if (diff <= 0) return 'Today'
  if (diff <= 86400000) return 'Yesterday'
  return 'Earlier'
}

const GROUP_ORDER = ['Today', 'Yesterday', 'Earlier']

function ConfirmDialog({ open, title, message, confirmLabel, busy, onConfirm, onCancel }) {
  if (!open) return null
  return (
    <dialog className="modal" open>
      <div className="modal-box">
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="mt-2 text-sm text-base-content/70">{message}</p>
        <div className="modal-action">
          <button type="button" className="btn btn-outline" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn btn-error" onClick={onConfirm} disabled={busy}>
            {busy ? <span className="loading loading-spinner loading-sm" /> : confirmLabel}
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={busy ? undefined : onCancel} />
    </dialog>
  )
}

export default function NotificationsPage() {
  const { loading: authLoading } = useAuth()
  const { items, unread, loading, loadError, refresh, markAllRead, markRead, deleteNotification, clearAll } = useNotifications({ limit: 100 })
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [flash, setFlash] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [clearing, setClearing] = useState(false)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((n) => {
      if (filter === 'UNREAD' && n.is_read) return false
      if (!q) return true
      return (`${n.title ?? ''} ${n.message ?? ''}`).toLowerCase().includes(q)
    })
  }, [items, query, filter])

  const grouped = useMemo(() => {
    const buckets = { Today: [], Yesterday: [], Earlier: [] }
    for (const n of visible) buckets[dayGroup(n.created_at)].push(n)
    return GROUP_ORDER.map((label) => ({ label, rows: buckets[label] })).filter((g) => g.rows.length > 0)
  }, [visible])

  async function onMarkRead(id) {
    setBusyId(id)
    await markRead(id)
    setBusyId(null)
  }

  async function onMarkAllRead() {
    await markAllRead()
    setFlash({ type: 'success', text: 'All notifications marked as read.' })
  }

  async function onDelete() {
    if (confirmId == null) return
    setBusyId(confirmId)
    const { error } = await deleteNotification(confirmId)
    setBusyId(null)
    setConfirmId(null)
    if (error) {
      setFlash({ type: 'error', text: `Could not delete the notification: ${error}` })
    } else {
      setFlash({ type: 'success', text: 'Notification deleted.' })
    }
  }

  async function onClearAll() {
    setClearing(true)
    const { error, count } = await clearAll()
    setClearing(false)
    setConfirmClear(false)
    if (error) {
      setFlash({ type: 'error', text: `Could not clear notifications: ${error}` })
    } else {
      setFlash({ type: 'success', text: count > 0 ? `${count} notification${count === 1 ? '' : 's'} deleted.` : 'Nothing to clear.' })
    }
  }

  if (authLoading || loading) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 sm:gap-5" aria-label="Loading notifications">
        <div className="flex items-center gap-3">
          <div className="skeleton h-11 w-11 shrink-0 rounded-xl" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="skeleton h-6 w-1/2" />
            <div className="skeleton h-4 w-2/3" />
          </div>
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="card border border-base-200 bg-base-100 shadow-sm">
            <div className="card-body flex-row items-center gap-3 p-4">
              <div className="skeleton h-10 w-10 shrink-0 rounded-xl" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="skeleton h-4 w-1/2" />
                <div className="skeleton h-3 w-3/4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (loadError && items.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <div role="alert" className="alert alert-error shadow-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm">Could not load notifications: {loadError}</span>
          <button type="button" className="btn btn-sm btn-outline ml-auto min-h-10" onClick={() => refresh()}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 sm:gap-5">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <Bell className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Notifications</h1>
            <p className="mt-0.5 text-sm text-base-content/60">
              Updates on your applications, interviews and account.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge badge-outline badge-sm">{items.length} total</span>
          {unread > 0 ? (
            <span className="badge badge-primary badge-sm">{unread} unread</span>
          ) : (
            <span className="badge badge-ghost badge-sm">All caught up</span>
          )}
        </div>
      </div>

      {flash && (
        <div role="alert" className={`alert shadow-sm ${flash.type === 'error' ? 'alert-error' : 'alert-success'} text-sm`}>
          {flash.type === 'error'
            ? <AlertCircle className="h-5 w-5 shrink-0" />
            : <CheckCircle2 className="h-5 w-5 shrink-0" />}
          <span>{flash.text}</span>
          <button
            type="button"
            className="btn btn-ghost btn-circle h-10 min-h-10 w-10 ml-auto shrink-0"
            onClick={() => setFlash(null)}
            aria-label="Dismiss message"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* search + filters + bulk actions */}
      <div className="flex flex-col gap-3">
        <label className="input input-bordered flex items-center gap-2">
          <Search className="h-4 w-4 shrink-0 text-base-content/50" />
          <input
            className="grow bg-transparent outline-none"
            placeholder="Search notifications…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search notifications"
          />
          {query && (
            <button
              type="button"
              className="btn btn-ghost btn-circle h-10 min-h-10 w-10 shrink-0"
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <div className="join" role="tablist" aria-label="Filter notifications">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={filter === f.key}
                className={`btn btn-sm join-item min-h-10 ${filter === f.key ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
                {f.key === 'UNREAD' && unread > 0 && (
                  <span className="badge badge-sm ml-1">{unread}</span>
                )}
              </button>
            ))}
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            {unread > 0 && (
              <button type="button" className="btn btn-sm btn-outline min-h-10" onClick={onMarkAllRead}>
                <CheckCheck className="h-4 w-4" />
                Mark all as read
              </button>
            )}
            {items.length > 0 && (
              <button
                type="button"
                className="btn btn-sm btn-ghost text-error min-h-10"
                onClick={() => setConfirmClear(true)}
                aria-label="Delete all notifications"
              >
                <Trash2 className="h-4 w-4" />
                Clear all
              </button>
            )}
          </div>
        </div>
      </div>

      {/* list */}
      {items.length === 0 ? (
        <div className="card border border-base-200 bg-base-100 shadow-sm">
          <div className="card-body items-center py-10 text-center">
            <div className="rounded-full bg-base-200 p-4 text-base-content/50">
              <BellOff className="h-7 w-7" />
            </div>
            <p className="mt-2 font-semibold">You&apos;re all caught up</p>
            <p className="max-w-sm text-sm text-base-content/60">
              Application updates, interview invites and account alerts will show up here.
            </p>
          </div>
        </div>
      ) : visible.length === 0 ? (
        <div className="card border border-base-200 bg-base-100 shadow-sm">
          <div className="card-body items-center py-10 text-center">
            <div className="rounded-full bg-base-200 p-4 text-base-content/50">
              <Search className="h-7 w-7" />
            </div>
            <p className="mt-2 font-semibold">Nothing matches</p>
            <p className="max-w-sm text-sm text-base-content/60">
              Try a different search term or filter.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {grouped.map((g) => (
            <section key={g.label} aria-label={`Notifications from ${g.label}`}>
              <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-base-content/50">
                {g.label}
              </h2>
              <ul className="flex flex-col gap-2">
                {g.rows.map((n) => {
                  const { Icon, cls } = typeMeta(n)
                  const busy = busyId === n.id
                  return (
                    <li
                      key={n.id}
                      className={`card border bg-base-100 shadow-sm transition hover:border-primary/20 ${
                        n.is_read ? 'border-base-200' : 'border-primary/30 bg-primary/[0.02]'
                      }`}
                    >
                      <div className="card-body flex-row items-start gap-3 p-4">
                        <div className={`rounded-xl p-2.5 shrink-0 ${cls}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        {!n.is_read && (
                          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold">{n.title}</span>
                            {!n.is_read && <span className="badge badge-primary badge-sm">New</span>}
                          </div>
                          {n.message && (
                            <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-base-content/70">
                              {n.message}
                            </p>
                          )}
                          <span className="mt-1 block text-xs text-base-content/40" title={formatDateTime(n.created_at)}>
                            {timeAgo(n.created_at)}
                          </span>
                        </div>
                        <div className="flex shrink-0 flex-row gap-1">
                          {!n.is_read && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-circle h-10 min-h-10 w-10"
                              onClick={() => onMarkRead(n.id)}
                              disabled={busy}
                              aria-label={`Mark notification "${n.title}" as read`}
                              title="Mark as read"
                            >
                              {busy
                                ? <span className="loading loading-spinner loading-sm" />
                                : <Check className="h-5 w-5" />}
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-ghost btn-circle h-10 min-h-10 w-10 text-error"
                            onClick={() => setConfirmId(n.id)}
                            disabled={busy}
                            aria-label={`Delete notification "${n.title}"`}
                            title="Delete notification"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmId != null}
        title="Delete this notification?"
        message="This notification will be permanently removed from your list. This cannot be undone."
        confirmLabel="Delete"
        busy={confirmId != null && busyId === confirmId}
        onConfirm={onDelete}
        onCancel={() => setConfirmId(null)}
      />
      <ConfirmDialog
        open={confirmClear}
        title="Delete all notifications?"
        message="Delete all notifications? This can't be undone."
        confirmLabel="Clear all"
        busy={clearing}
        onConfirm={onClearAll}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  )
}
