import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useStudentProfile } from '../../hooks/useProfiles'
import { EVENT_TYPE } from '../../utils/labels'
import { formatDate, formatDateTime, todayISO } from '../../utils/format'
import { LoadingScreen } from '../../components/ui/LoadingScreen'

const STATUS_LABEL = {
  REGISTERED: 'Registered',
  CANCELLED: 'Cancelled',
  ATTENDED: 'Attended',
}

const STATUS_BADGE = {
  REGISTERED: 'badge-success',
  CANCELLED: 'badge-error',
  ATTENDED: 'badge-primary',
}

export default function EventsPage() {
  const { profile: student, loading: profileLoading } = useStudentProfile()
  const [events, setEvents] = useState([])
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const studentId = student?.id

  useEffect(() => {
    if (!studentId) {
      setLoading(false)
      return
    }
    let active = true
    async function load() {
      const [eventsR, regsR] = await Promise.all([
        supabase
          .from('events')
          .select('*')
          .gte('starts_at', new Date().toISOString())
          .order('starts_at', { ascending: true }),
        supabase
          .from('event_registrations')
          .select('id, event_id, status')
          .eq('student_id', studentId),
      ])
      if (!active) return
      if (eventsR.error) setError(eventsR.error.message)
      else setEvents(eventsR.data ?? [])
      if (regsR.error) setError(regsR.error.message)
      else setRegistrations(regsR.data ?? [])
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [studentId])

  const regMap = new Map(registrations.map((r) => [r.event_id, r]))

  async function register(eventId) {
    if (busyId === eventId) return
    setBusyId(eventId)
    setError(null)
    const { error } = await supabase.from('event_registrations').insert({
      event_id: eventId,
      student_id: studentId,
      status: 'REGISTERED',
    })
    setBusyId(null)
    if (error) {
      if (error.code === '23505') {
        setError('You are already registered for this event.')
      } else {
        setError(error.message)
      }
      return
    }
    setRegistrations((prev) => [...prev, { id: Date.now(), event_id: eventId, status: 'REGISTERED' }])
  }

  async function cancelRegistration(registrationId, eventId) {
    if (busyId === eventId) return
    setBusyId(eventId)
    setError(null)
    const { error } = await supabase.from('event_registrations').update({ status: 'CANCELLED' }).eq('id', registrationId)
    setBusyId(null)
    if (error) {
      setError(error.message)
      return
    }
    setRegistrations((prev) => prev.map((r) => (r.id === registrationId ? { ...r, status: 'CANCELLED' } : r)))
  }

  if (profileLoading) return <LoadingScreen />
  if (!student?.id) {
    return (
      <div className="alert alert-warning max-w-xl mx-auto">
        Complete your student profile to view and register for events.
      </div>
    )
  }

  const upcoming = events.filter((e) => e.starts_at >= todayISO())
  const past = events.filter((e) => e.starts_at < todayISO())

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Career Events</h1>
        <p className="text-sm text-base-content/70">Browse upcoming events and register to attend.</p>
      </div>

      {error && (
        <div role="alert" className="alert alert-error">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      ) : upcoming.length === 0 && past.length === 0 ? (
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body text-center text-base-content/70 py-10">
            No events scheduled at the moment.
          </div>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-lg font-bold mb-3">Upcoming Events</h2>
              <div className="flex flex-col gap-3">
                {upcoming.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    registration={regMap.get(event.id)}
                    busy={busyId === event.id}
                    onRegister={() => register(event.id)}
                    onCancel={(regId) => cancelRegistration(regId, event.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div className="mt-6">
              <h2 className="text-lg font-bold mb-3">Past Events</h2>
              <div className="flex flex-col gap-3">
                {past.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    registration={regMap.get(event.id)}
                    busy={busyId === event.id}
                    onRegister={() => register(event.id)}
                    onCancel={(regId) => cancelRegistration(regId, event.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function EventCard({ event, registration, busy, onRegister, onCancel }) {
  const isPast = event.starts_at < todayISO()
  const isRegistered = registration?.status === 'REGISTERED'
  const isCancelled = registration?.status === 'CANCELLED'
  const deadlinePassed = event.registration_deadline && new Date(event.registration_deadline) < new Date()

  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold truncate">{event.title}</span>
              <span className={`badge badge-sm ${isPast ? 'badge-ghost' : 'badge-primary'}`}>
                {EVENT_TYPE[event.event_type] ?? event.event_type}
              </span>
              {registration && (
                <span className={`badge badge-sm ${STATUS_BADGE[registration.status] ?? 'badge-ghost'}`}>
                  {STATUS_LABEL[registration.status] ?? registration.status}
                </span>
              )}
            </div>
            {event.description && (
              <p className="mt-1 text-sm text-base-content/70 line-clamp-2">{event.description}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-3 text-sm text-base-content/60">
              <span>
                <strong>Date:</strong> {formatDate(event.starts_at)}
              </span>
              <span>
                <strong>Time:</strong> {formatDateTime(event.starts_at)}
                {event.ends_at ? ` – ${formatDateTime(event.ends_at)}` : ''}
              </span>
              {event.venue && (
                <span>
                  <strong>Venue:</strong> {event.venue}
                </span>
              )}
              {event.organizer && (
                <span>
                  <strong>Organizer:</strong> {event.organizer}
                </span>
              )}
              {event.capacity && (
                <span>
                  <strong>Capacity:</strong> {event.capacity}
                </span>
              )}
              {event.registration_deadline && (
                <span className={deadlinePassed ? 'text-error' : ''}>
                  <strong>Reg. Deadline:</strong> {formatDate(event.registration_deadline)}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:ml-auto">
            {isPast ? (
              <span className="btn btn-sm btn-ghost">Event ended</span>
            ) : isRegistered ? (
              <button
                type="button"
                className="btn btn-sm btn-error"
                disabled={busy}
                onClick={() => onCancel(registration.id)}
              >
                {busy ? <span className="loading loading-spinner loading-xs" /> : 'Cancel registration'}
              </button>
            ) : isCancelled ? (
              <span className="btn btn-sm btn-ghost">Cancelled</span>
            ) : deadlinePassed ? (
              <span className="btn btn-sm btn-ghost">Registration closed</span>
            ) : (
              <button
                type="button"
                className="btn btn-sm btn-primary"
                disabled={busy}
                onClick={onRegister}
              >
                {busy ? <span className="loading loading-spinner loading-xs" /> : 'Register'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}