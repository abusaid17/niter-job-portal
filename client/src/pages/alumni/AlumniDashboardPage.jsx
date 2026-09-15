import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useAlumniProfile } from '../../hooks/useProfiles'
import { EVENT_TYPE, JOB_STATUS, JOB_STATUS_BADGE } from '../../utils/labels'
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

export default function AlumniDashboardPage() {
  const { profile: user } = useAuth()
  const { profile: alumni, loading: profileLoading } = useAlumniProfile()
  const [jobs, setJobs] = useState([])
  const [applications, setApplications] = useState([])
  const [referrals, setReferrals] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    if (!user?.id) return
    let active = true
    async function load() {
      const [jobsR, eventsR] = await Promise.all([
        supabase.from('jobs').select('*').eq('posted_by', user.id).order('created_at', { ascending: false }),
        supabase.from('events').select('*').gte('starts_at', new Date().toISOString()).order('starts_at', { ascending: false }).limit(3),
      ])
      if (!active) return
      setJobs(jobsR.data ?? [])
      setEvents(eventsR.data ?? [])
      if (jobsR.data?.length) {
        const { data: ai } = await supabase.from('applications').select('id, job_id')
        setApplications(ai ?? [])
      }
      const { data: refs } = await supabase.from('referrals').select('*').eq('alumni_id', user.id).order('created_at', { ascending: false }).limit(5)
      setReferrals(refs ?? [])
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [user])

  const appCounts = useMemo(() => {
    const m = {}
    for (const a of applications) m[a.job_id] = (m[a.job_id] ?? 0) + 1
    return m
  }, [applications])

  const stats = useMemo(() => {
    const byStatus = {}
    for (const j of jobs) byStatus[j.status] = (byStatus[j.status] ?? 0) + 1
    return {
      total: jobs.length,
      published: byStatus.PUBLISHED ?? 0,
      pending: (byStatus.PENDING_APPROVAL ?? 0) + (byStatus.DRAFT ?? 0),
      referrals: referrals.length,
      applications: applications.length,
    }
  }, [jobs, referrals, applications])

  async function submitForApproval(id) {
    setBusyId(id)
    setMessage(null)
    const { error } = await supabase.from('jobs').update({ status: 'PENDING_APPROVAL' }).eq('id', id)
    setBusyId(null)
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status: 'PENDING_APPROVAL' } : j)))
      setMessage({ type: 'success', text: 'Job submitted for admin approval.' })
    }
  }

  if (profileLoading || loading) {
    return <LoadingScreen />
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome{user.name ? `, ${user.name.split(' ')[0]}` : ''} 👋
          </h1>
          <p className="mt-1 text-base-content/70">
            Lead with your experience, share opportunities, and grow the NITER network.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/jobs" className="btn btn-outline">
            Browse jobs
          </Link>
          <Link to="/alumni/jobs/new" className="btn btn-primary">
            Post a job
          </Link>
        </div>
      </div>

      {message && (
        <div role="alert" className={`alert alert-${message.type === 'success' ? 'success' : 'error'}`}>
          {message.text}
        </div>
      )}

      {!alumni && (
        <div role="alert" className="alert alert-warning">
          <span>Set up your alumni profile to participate in job posts, referrals, and networking.</span>
          <Link to="/alumni/profile" className="btn btn-sm btn-primary">
            Complete profile
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatTile label="Jobs posted" value={stats.total} />
        <StatTile label="Published" value={stats.published} />
        <StatTile label="Pending approval" value={stats.pending} />
        <StatTile label="My applications" value={stats.applications} to="/alumni/applications" />
        <StatTile label="Referrals sent" value={stats.referrals} to="/alumni/referrals" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">My job posts</h2>
            <Link to="/alumni/jobs/new" className="link link-primary text-sm">
              Post a new job
            </Link>
          </div>
          {jobs.length === 0 ? (
            <div className="card mt-3 bg-base-100 p-6 text-center text-sm text-base-content/60 shadow-sm">
              You have not posted any jobs yet.
            </div>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-box bg-base-100 shadow-sm">
              <table className="table">
                <thead>
                  <tr>
                    <th>Job</th>
                    <th>Applicants</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((j) => (
                    <tr key={j.id}>
                      <td className="font-medium">
                        {j.title}
                        <div className="text-xs text-base-content/60">
                          {j.location ?? 'Location not specified'} · {formatDate(j.created_at)}
                        </div>
                      </td>
                      <td className="text-sm text-base-content/70">
                        <Link to={`/alumni/jobs/${j.id}/applicants`} className="link">
                          {appCounts[j.id] ?? 0} applicant{appCounts[j.id] === 1 ? '' : 's'}
                        </Link>
                      </td>
                      <td>
                        <span className={`badge badge-sm ${JOB_STATUS_BADGE[j.status] ?? 'badge-ghost'}`}>
                          {JOB_STATUS[j.status] ?? j.status}
                        </span>
                      </td>
                      <td>
                        {j.status === 'DRAFT' && (
                          <button className="btn btn-sm btn-outline" disabled={busyId === j.id} onClick={() => submitForApproval(j.id)}>
                            Submit for approval
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h2 className="mt-8 text-lg font-bold">Recent referrals</h2>
          {referrals.length === 0 ? (
            <div className="card mt-3 bg-base-100 p-6 text-center text-sm text-base-content/60 shadow-sm">
              No referrals sent yet.{' '}
              <Link to="/alumni/referrals" className="link link-primary">
                Refer a student
              </Link>
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              {referrals.map((r) => (
                <div key={r.id} className="card bg-base-100 p-4 text-sm shadow-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">Referral · #{r.id}</span>
                    <span className="badge badge-sm">{r.status}</span>
                  </div>
                  {r.message && <p className="mt-1 text-base-content/70">{r.message}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-lg font-bold">Upcoming events</h2>
          {events.length === 0 ? (
            <div className="card mt-3 bg-base-100 p-6 text-center text-sm text-base-content/60 shadow-sm">
              No upcoming events.
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

          {(alumni?.current_company || alumni?.current_position) && (
            <div className="card mt-6 bg-base-100 p-4 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-base-content/60">Currently</h3>
              {alumni.current_position && <div className="mt-1">{alumni.current_position}</div>}
              {alumni.current_company && <div className="text-sm text-base-content/70">{alumni.current_company}</div>}
              {alumni.department && <div className="text-sm text-base-content/70">{alumni.department}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}