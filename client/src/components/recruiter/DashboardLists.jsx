import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { formatDate, todayISO } from '../../utils/format'
import { LoadingScreen } from '../../components/ui/LoadingScreen'
import InterviewModal from '../../components/interviews/InterviewModal'

function InitialsAvatar({ name, className = '' }) {
  const initials = name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  return (
    <div className={`avatar ${className}`}>
      <div className="w-full h-full rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium">
        {initials ?? '?'}
      </div>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="card bg-base-100 p-4 shadow-sm animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-base-200" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 bg-base-200 rounded" />
          <div className="h-3 w-1/2 bg-base-200 rounded" />
          <div className="h-3 w-1/3 bg-base-200 rounded" />
        </div>
        <div className="w-24 h-8 bg-base-200 rounded" />
      </div>
    </div>
  )
}

function ErrorState({ message, onRetry }) {
  return (
    <div role="alert" className="alert alert-error max-w-xl">
      <div className="flex flex-col items-center gap-4 text-center">
        <svg className="w-12 h-12 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3h13.856z" />
        </svg>
        <div>
          <p className="font-bold text-lg">Failed to load</p>
          <p className="text-sm text-base-content/70 mt-1">{message}</p>
        </div>
        <button className="btn btn-primary" onClick={onRetry}>Retry</button>
      </div>
    </div>
  )
}

function EmptyState({ message, icon }) {
  return (
    <div className="card bg-base-100 p-8 text-center text-sm text-base-content/60 shadow-sm">
      {icon && <span className="text-4xl block mb-2">{icon}</span>}
      <p>{message}</p>
    </div>
  )
}

export function ShortlistedCandidates({ jobIds }) {
  const { session } = useAuth()
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [interviewing, setInterviewing] = useState(null)

  useEffect(() => {
    if (!session?.user?.id || !jobIds?.length) {
      setLoading(false)
      return
    }
    let active = true
    async function load() {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          id,
          applied_at,
          status,
          students!left(id, users!left(id, name, email)),
          jobs(id, title)
        `)
        .in('job_id', jobIds)
        .eq('status', 'SHORTLISTED')
        .order('applied_at', { ascending: false })
      if (!active) return
      if (error) setError(error.message)
      else setApps(data ?? [])
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [session, jobIds])

  if (loading) return <SkeletonRow />
  if (error) return <ErrorState message={error} onRetry={() => setError(null)} />
  if (apps.length === 0) return <EmptyState message="No shortlisted candidates yet." icon="🎯" />

  return (
    <div className="flex flex-col gap-3">
      {apps.map((app) => {
        const student = app.students
        const user = student?.users
        const name = user?.name ?? 'Applicant'
        return (
          <div key={app.id} className="card bg-base-100 p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <InitialsAvatar name={name} className="w-10 h-10" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{name}</div>
                <div className="text-sm text-base-content/60">
                  {app.jobs?.title} · Applied {formatDate(app.applied_at)}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to={`/recruiter/applicants/${app.id}`} className="btn btn-sm btn-neutral">
                  View profile
                </Link>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => setInterviewing(app)}
                >
                  Schedule interview
                </button>
              </div>
            </div>
          </div>
        )
      })}
      <InterviewModal
        open={Boolean(interviewing)}
        application={interviewing}
        jobTitle={interviewing?.jobs?.title}
        onClose={() => setInterviewing(null)}
        onScheduled={() => {
          setInterviewing(null)
          setApps((prev) =>
            prev.map((a) => (a.id === interviewing?.id ? { ...a, status: 'INTERVIEW_SCHEDULED' } : a))
          )
        }}
      />
    </div>
  )
}

export function UpcomingInterviews({ jobIds }) {
  const { session } = useAuth()
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!session?.user?.id || !jobIds?.length) {
      setLoading(false)
      return
    }
    let active = true
    async function load() {
      const { data, error } = await supabase
        .from('interviews')
        .select(`
          id,
          interview_date,
          start_time,
          end_time,
          venue,
          meeting_link,
          status,
          application_id,
          applications!inner(
            id,
            students!left(id, users!left(id, name, email)),
            jobs(id, title)
          )
        `)
        .in('applications.job_id', jobIds)
        .eq('status', 'SCHEDULED')
        .gte('interview_date', todayISO())
        .order('interview_date', { ascending: true })
        .order('start_time', { ascending: true })
      if (!active) return
      if (error) setError(error.message)
      else setInterviews(data ?? [])
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [session, jobIds])

  if (loading) return <SkeletonRow />
  if (error) return <ErrorState message={error} onRetry={() => setError(null)} />
  if (interviews.length === 0) return <EmptyState message="No upcoming interviews." icon="📅" />

  return (
    <div className="flex flex-col gap-3">
      {interviews.map((interview) => {
        const app = interview.applications
        const student = app?.students
        const user = student?.users
        const name = user?.name ?? 'Candidate'
        const isOnline = interview.meeting_link && !interview.venue
        return (
          <div key={interview.id} className="card bg-base-100 p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <InitialsAvatar name={name} className="w-10 h-10" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate">{name}</span>
                  <span className="badge badge-sm badge-primary">Scheduled</span>
                </div>
                <div className="text-sm text-base-content/60">{app?.jobs?.title}</div>
                <div className="mt-1 flex flex-wrap gap-3 text-sm text-base-content/60">
                  <span><strong>Date:</strong> {formatDate(interview.interview_date)}</span>
                  <span><strong>Time:</strong> {interview.start_time?.slice(0, 5)}{interview.end_time ? ` – ${interview.end_time.slice(0, 5)}` : ''}</span>
                  {isOnline ? (
                    <span className="flex items-center gap-1">
                      <strong>Online:</strong>
                      {interview.meeting_link && (
                        <a href={interview.meeting_link} target="_blank" rel="noreferrer noopener" className="link link-primary">Join</a>
                      )}
                    </span>
                  ) : interview.venue ? (
                    <span><strong>Venue:</strong> {interview.venue}</span>
                  ) : null}
                </div>
              </div>
              <Link to={`/recruiter/applicants/${app?.id}`} className="btn btn-sm btn-neutral">
                View profile
              </Link>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function DashboardLists({ jobIds }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <section>
        <h2 className="text-lg font-bold mb-3">Shortlisted candidates</h2>
        <ShortlistedCandidates jobIds={jobIds} />
      </section>
      <section>
        <h2 className="text-lg font-bold mb-3">Upcoming interviews</h2>
        <UpcomingInterviews jobIds={jobIds} />
      </section>
    </div>
  )
}