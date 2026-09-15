import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { EVENT_TYPE } from '../../utils/labels'
import { formatDateTime } from '../../utils/format'
import { LoadingScreen } from '../../components/ui/LoadingScreen'

function toLocalInputValue(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromLocalInputValue(v) {
  if (!v) return null
  return new Date(v).toISOString()
}

function EventFormModal({ open, event, onClose, onSaved }) {
  const { session } = useAuth()
  const [form, setForm] = useState({ title: '', event_type: 'CAREER_FAIR', description: '', venue: '', organizer: '', capacity: '', starts_at: '', ends_at: '', registration_deadline: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setForm({
      title: event?.title ?? '',
      event_type: event?.event_type ?? 'CAREER_FAIR',
      description: event?.description ?? '',
      venue: event?.venue ?? '',
      organizer: event?.organizer ?? '',
      capacity: event?.capacity?.toString() ?? '',
      starts_at: toLocalInputValue(event?.starts_at),
      ends_at: toLocalInputValue(event?.ends_at),
      registration_deadline: toLocalInputValue(event?.registration_deadline),
    })
    setError(null)
  }, [open, event])

  if (!open) return null

  async function submit(e) {
    e.preventDefault()
    if (!form.title.trim() || !form.starts_at) { setError('Title and start time required.'); return }
    setSaving(true)
    setError(null)
    const payload = {
      title: form.title.trim(), event_type: form.event_type, description: form.description.trim() || null,
      venue: form.venue.trim() || null, organizer: form.organizer.trim() || null,
      capacity: form.capacity ? Number(form.capacity) : null, starts_at: fromLocalInputValue(form.starts_at),
      ends_at: fromLocalInputValue(form.ends_at), registration_deadline: fromLocalInputValue(form.registration_deadline),
      created_by: session.user.id,
    }
    const res = event
      ? await supabase.from('events').update(payload).eq('id', event.id)
      : await supabase.from('events').insert({ created_by: session.user.id, ...payload }).select('id')
    setSaving(false)
    if (res.error) { setError(res.error.message); return }
    onSaved(); onClose()
  }

  return (
    <dialog className="modal" open>
      <div className="modal-box max-w-lg">
        <h3 className="font-bold text-lg">{event ? 'Edit event' : 'Create event'}</h3>
        {error && <div role="alert" className="alert alert-error mt-3 text-sm">{error}</div>}
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
          <div className="form-control">
            <label className="label"><span className="label-text">Title *</span></label>
            <input className="input input-bordered" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="form-control">
              <label className="label"><span className="label-text">Type</span></label>
              <select className="select select-bordered" value={form.event_type} onChange={(e) => setForm((f) => ({ ...f, event_type: e.target.value }))}>
                {Object.entries(EVENT_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Venue</span></label>
              <input className="input input-bordered" value={form.venue} onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="form-control">
              <label className="label"><span className="label-text">Starts *</span></label>
              <input type="datetime-local" className="input input-bordered" value={form.starts_at} onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))} required />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Ends</span></label>
              <input type="datetime-local" className="input input-bordered" value={form.ends_at} onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="form-control">
              <label className="label"><span className="label-text">Reg. deadline</span></label>
              <input type="datetime-local" className="input input-bordered" value={form.registration_deadline} onChange={(e) => setForm((f) => ({ ...f, registration_deadline: e.target.value }))} />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Capacity</span></label>
              <input type="number" min="0" className="input input-bordered" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} />
            </div>
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Description</span></label>
            <textarea className="textarea textarea-bordered" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="modal-action">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" disabled={saving}>{saving && <span className="loading loading-spinner loading-sm" />}{event ? 'Save' : 'Create'}</button>
          </div>
        </form>
      </div>
    </dialog>
  )
}

export default function AdminEventsPage() {
  const { session } = useAuth()
  const [events, setEvents] = useState([])
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [registrationsFor, setRegistrationsFor] = useState(null)
  const [filter, setFilter] = useState('ALL')

  useEffect(() => {
    if (!session?.user?.id) return
    let active = true
    async function load() {
      const [evR, rgR] = await Promise.all([
        supabase.from('events').select('*').order('starts_at', { ascending: false }),
        supabase.from('event_registrations').select('id, event_id, status, created_at, students(id, student_id, users(name, email))').order('created_at', { ascending: false }),
      ])
      if (!active) return
      setEvents(evR.data ?? [])
      setRegistrations(rgR.data ?? [])
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [session])

  const regByEvent = useMemo(() => {
    const map = {}
    for (const r of registrations) { (map[r.event_id] ??= []).push(r) }
    return map
  }, [registrations])

  const visible = useMemo(() => {
    const now = Date.now()
    return events.map((ev) => ({ ev, upcoming: new Date(ev.starts_at).getTime() > now }))
      .filter(({ upcoming }) => filter === 'ALL' || (filter === 'UPCOMING') === upcoming)
  }, [events, filter])

  async function removeEvent(ev) {
    if (!window.confirm(`Delete "${ev.title}"?`)) return
    setError(null)
    const { error: e } = await supabase.from('events').delete().eq('id', ev.id)
    if (e) { setError(e.message); return }
    setEvents((prev) => prev.filter((x) => x.id !== ev.id))
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Event management</h1>
          <p className="mt-1 text-base-content/70">Create, edit and monitor career events.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true) }}>New event</button>
      </div>

      {error && <div role="alert" className="alert alert-error">{error}</div>}

      <div className="flex gap-2">
        {['ALL', 'UPCOMING', 'PAST'].map((f) => (
          <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilter(f)}>
            {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="card bg-base-100 p-10 text-center text-sm text-base-content/60 shadow-sm">No events.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map(({ ev, upcoming }) => {
            const regs = regByEvent[ev.id] ?? []
            return (
              <div key={ev.id} className="card bg-base-100 shadow-sm">
                <div className="card-body">
                  <div className="card-title text-base">
                    {ev.title}
                    <span className={`badge badge-sm ${upcoming ? 'badge-primary' : 'badge-ghost'}`}>{EVENT_TYPE[ev.event_type] ?? ev.event_type}</span>
                  </div>
                  <div className="flex flex-col gap-1 text-sm text-base-content/70">
                    <span>{formatDateTime(ev.starts_at)}{ev.ends_at ? ` — ${formatDateTime(ev.ends_at)}` : ''}</span>
                    {ev.venue && <span>{ev.venue}</span>}
                    {ev.capacity != null && <span>{regs.length} / {ev.capacity} registered</span>}
                  </div>
                  <div className="card-actions mt-2">
                    <button className="btn btn-sm btn-neutral" onClick={() => setRegistrationsFor(ev)}>
                      Registrations ({regs.length})
                    </button>
                    <div className="flex-1" />
                    <button className="btn btn-sm btn-outline" onClick={() => { setEditing(ev); setShowForm(true) }}>Edit</button>
                    <button className="btn btn-sm btn-ghost text-error" onClick={() => removeEvent(ev)}>Delete</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <EventFormModal open={showForm} event={editing} onClose={() => setShowForm(false)} onSaved={() => { window.location.reload() }} />

      <dialog className="modal" open={registrationsFor != null}>
        <div className="modal-box max-w-lg">
          <h3 className="font-bold text-lg">Registrations · {registrationsFor?.title}</h3>
          {(regByEvent[registrationsFor?.id] ?? []).length === 0 ? (
            <p className="mt-4 text-sm text-base-content/60">No registrations.</p>
          ) : (
            <div className="mt-4 flex flex-col gap-2">
              {(regByEvent[registrationsFor?.id] ?? []).map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-box bg-base-200 p-3 text-sm">
                  <div>
                    <div className="font-medium">{r.students?.users?.name ?? 'Student'}</div>
                    <div className="text-xs text-base-content/60">{r.students?.student_id ?? ''} · {r.students?.users?.email ?? ''}</div>
                  </div>
                  <span className="badge badge-sm badge-ghost">{r.status}</span>
                </div>
              ))}
            </div>
          )}
          <div className="modal-action">
            <button className="btn" onClick={() => setRegistrationsFor(null)}>Close</button>
          </div>
        </div>
      </dialog>
    </div>
  )
}