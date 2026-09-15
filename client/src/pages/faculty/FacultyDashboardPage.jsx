import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { EVENT_TYPE } from '../../utils/labels'
import { formatDate, formatDateTime } from '../../utils/format'
import { LoadingScreen } from '../../components/ui/LoadingScreen'

function StatTile({ label, value, to }) {
  const inner = (
    <div className="card bg-base-100 p-5 text-center shadow-sm transition hover:shadow-md">
      <div className="text-4xl font-extrabold text-primary">{value}</div>
      <div className="mt-1 text-sm text-base-content/70">{label}</div>
    </div>
  )
  return to ? <Link to={to}>{inner}</Link> : inner
}

export default function FacultyDashboardPage() {
  const { session, profile: user } = useAuth()
  const [students, setStudents] = useState([])
  const [placements, setPlacements] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session?.user?.id) return
    let active = true
    Promise.all([
      supabase.from('students').select('id, student_id, department, batch, users(id, name, email, is_verified)').order('id'),
      supabase.from('placements').select('id, offer_date, salary, companies(name), students(id, users(name))').order('offer_date', { ascending: false }).limit(10),
      supabase.from('recommendations').select('*, students(id, users(name)), jobs(title)').eq('faculty_id', user.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('events').select('*').gte('starts_at', new Date().toISOString()).order('starts_at', { ascending: false }).limit(3),
    ]).then(([stR, plR, recR, evR]) => {
      if (!active) return
      setStudents(stR.data ?? [])
      setPlacements(plR.data ?? [])
      setRecommendations(recR.data ?? [])
      setEvents(evR.data ?? [])
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [session, user])

  const stats = useMemo(() => {
    const verified = students.filter((s) => s.users?.is_verified).length
    const pending = students.length - verified
    return {
      students: students.length,
      verified,
      pending,
      placements: placements.length,
      recommendations: recommendations.length,
      events: events.length,
    }
  }, [students, placements, recommendations, events])

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome{user.name ? `, ${user.name.split(' ')[0]}` : ''} 👋
          </h1>
          <p className="mt-1 text-base-content/70">Verify students, guide them, and track placement outcomes.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/faculty/events" className="btn btn-outline">
            Career events
          </Link>
          <Link to="/faculty/students" className="btn btn-primary">
            Verify students
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatTile label="Total students" value={stats.students} />
        <StatTile label="Verified" value={stats.verified} to="/faculty/students" />
        <StatTile label="Pending verification" value={stats.pending} to="/faculty/students" />
        <StatTile label="Placement records" value={stats.placements} to="/faculty/reports" />
        <StatTile label="Upcoming events" value={stats.events} to="/faculty/events" />
      </div>

      {stats.pending > 0 && (
        <div role="alert" className="alert alert-info">
          <span>{stats.pending} student profile{stats.pending === 1 ? '' : 's'} awaiting verification.</span>
          <Link to="/faculty/students" className="btn btn-sm btn-primary">
            Review now
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Recent placements</h2>
            <Link to="/faculty/reports" className="link link-primary text-sm">
              Reports
            </Link>
          </div>
          {placements.length === 0 ? (
            <div className="card mt-3 bg-base-100 p-6 text-center text-sm text-base-content/60 shadow-sm">
              No placement records yet.
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              {placements.map((p) => (
                <div key={p.id} className="card bg-base-100 p-4 shadow-sm">
                  <div className="text-sm font-medium">{p.students?.users?.name ?? 'Student'}</div>
                  <div className="text-sm text-base-content/60">
                    {p.companies?.name ?? 'Company'} · {formatDate(p.offer_date)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">My recommendations</h2>
            <span className="text-sm text-base-content/60">{stats.recommendations}</span>
          </div>
          {recommendations.length === 0 ? (
            <div className="card mt-3 bg-base-100 p-6 text-center text-sm text-base-content/60 shadow-sm">
              You have not written any recommendations yet.
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              {recommendations.map((r) => (
                <div key={r.id} className="card bg-base-100 p-4 shadow-sm">
                  <div className="text-sm font-medium">
                    {r.students?.users?.name ?? 'Student'} → {r.jobs?.title ?? 'General'}
                  </div>
                  {r.message && <p className="mt-1 text-sm text-base-content/70">{r.message}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-lg font-bold">Upcoming events</h2>
          {events.length === 0 ? (
            <div className="card mt-3 bg-base-100 p-6 text-center text-sm text-base-content/60 shadow-sm">
              No upcoming events. Manage them from the events page.
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              {events.map((ev) => (
                <div key={ev.id} className="card bg-base-100 p-4 shadow-sm">
                  <div className="card-title text-base">{ev.title}</div>
                  <p className="text-sm text-base-content/70">{EVENT_TYPE[ev.event_type] ?? ev.event_type}</p>
                  <p className="text-sm text-base-content/70">
                    {formatDateTime(ev.starts_at)}
                    {ev.venue ? ` · ${ev.venue}` : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}