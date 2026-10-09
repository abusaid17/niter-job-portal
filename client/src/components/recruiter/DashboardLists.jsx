import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { formatDate, todayISO } from '../../utils/format'
import { LoadingScreen } from '../../components/ui/LoadingScreen'
import InterviewModal from '../../components/interviews/InterviewModal'
import {
  TargetIcon,
  CalendarIcon,
  UserIcon,
  ClockIcon,
  MapPinIcon,
  LinkIcon,
  ChevronRightIcon,
  PlusIcon,
} from 'lucide-react'

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

function SectionHeader({ title, icon: Icon, count, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-5 h-5 text-primary" aria-hidden="true" />}
        <h2 className="text-lg font-bold">{title}</h2>
        {count !== undefined && <span className="badge badge-primary badge-sm">{count}</span>}
      </div>
      {action && (
        <Link {...action} className="btn btn-sm btn-outline gap-1">
          View all <ChevronRightIcon className="w-4 h-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  )
}

function EmptyState({ message, icon: Icon, action }) {
  return (
    <div className="card bg-base-100 p-8 text-center text-sm text-base-content/60 shadow-sm">
      {Icon && <Icon className="w-12 h-12 mx-auto mb-3 text-base-content/30" aria-hidden="true" />}
      <p className="font-medium mb-1">No data yet</p>
      <p className="text-xs mb-4">{message}</p>
      {action && (
        <Link {...action} className="btn btn-sm btn-primary gap-1">
          {action.icon} {action.label}
        </Link>
      )}
    </div>
  )
}

function DateBadge({ dateStr }) {
  const date = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (date.getTime() === today.getTime()) {
    return <span className="badge badge-sm badge-primary">Today</span>
  }
  if (date.getTime() === tomorrow.getTime()) {
    return <span className="badge badge-sm badge-info">Tomorrow</span>
  }
  return null
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

  if (loading) return <div className="flex flex-col gap-3">{[1,2,3].map(i => <SkeletonRow key={i} />)}</div>
  if (error) return <ErrorState message={error} onRetry={() => setError(null)} />

  return (
    <section className="card bg-base-100 border border-base-200 shadow-sm">
      <div className="card-body p-0 pt-4 pb-4">
        <SectionHeader
          title="Shortlisted candidates"
          icon={TargetIcon}
          count={apps.length}
          action={{ to: '/recruiter/jobs', className: 'px-4' }}
        />
        <div className="px-4">
          {apps.length === 0 ? (
            <EmptyState
              message="Shortlist candidates from your job applications to see them here."
              icon={TargetIcon}
              action={{
                to: '/recruiter/jobs',
                label: 'View jobs',
                icon: <PlusIcon className="w-3.5 h-3.5" aria-hidden="true" />,
              }}
            />
          ) : (
            <div className="flex flex-col gap-2">
              {apps.map((app) => {
                const student = app.students
                const user = student?.users
                const name = user?.name ?? 'Applicant'
                return (
                  <div key={app.id} className="card bg-base-100 p-3 shadow-sm border border-base-200 hover:shadow-md transition-shadow">
                    <div className="flex flex-wrap items-center gap-3">
                      <InitialsAvatar name={name} className="w-10 h-10" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{name}</div>
                        <div className="flex items-center gap-2 text-sm text-base-content/60 flex-wrap">
                          <span>{app.jobs?.title}</span>
                          <span className="badge badge-sm badge-outline">Applied {formatDate(app.applied_at)}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link
                          to={`/recruiter/applicants/${app.id}`}
                          className="btn btn-sm btn-neutral gap-1 min-w-[120px] justify-center"
                        >
                          <UserIcon className="w-3.5 h-3.5" aria-hidden="true" />
                          View profile
                        </Link>
                        <button
                          className="btn btn-sm btn-primary gap-1 min-w-[120px] justify-center"
                          onClick={() => setInterviewing(app)}
                        >
                          <PlusIcon className="w-3.5 h-3.5" aria-hidden="true" />
                          Schedule
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
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
    </section>
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

  if (loading) return <div className="flex flex-col gap-3">{[1,2,3].map(i => <SkeletonRow key={i} />)}</div>
  if (error) return <ErrorState message={error} onRetry={() => setError(null)} />

  return (
    <section className="card bg-base-100 border border-base-200 shadow-sm">
      <div className="card-body p-0 pt-4 pb-4">
        <SectionHeader
          title="Upcoming interviews"
          icon={CalendarIcon}
          count={interviews.length}
          action={{ to: '/recruiter/jobs', className: 'px-4' }}
        />
        <div className="px-4">
          {interviews.length === 0 ? (
            <EmptyState
              message="Schedule interviews with shortlisted candidates to see them here."
              icon={CalendarIcon}
              action={{
                to: '/recruiter/jobs',
                label: 'View jobs',
                icon: <PlusIcon className="w-3.5 h-3.5" aria-hidden="true" />,
              }}
            />
          ) : (
            <div className="flex flex-col gap-2">
              {interviews.map((interview) => {
                const app = interview.applications
                const student = app?.students
                const user = student?.users
                const name = user?.name ?? 'Candidate'
                const isOnline = interview.meeting_link && !interview.venue
                return (
                  <div key={interview.id} className="card bg-base-100 p-3 shadow-sm border border-base-200 hover:shadow-md transition-shadow">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="relative">
                        <InitialsAvatar name={name} className="w-10 h-10" />
                        <DateBadge dateStr={interview.interview_date} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{name}</span>
                          <span className="badge badge-sm badge-primary">Scheduled</span>
                        </div>
                        <div className="text-sm text-base-content/60 truncate">{app?.jobs?.title}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-base-content/60">
                          <span className="flex items-center gap-1">
                            <ClockIcon className="w-3.5 h-3.5" aria-hidden="true" />
                            {interview.start_time?.slice(0, 5)}{interview.end_time ? ` – ${interview.end_time.slice(0, 5)}` : ''}
                          </span>
                          {isOnline ? (
                            <span className="flex items-center gap-1">
                              <LinkIcon className="w-3.5 h-3.5" aria-hidden="true" />
                              {interview.meeting_link && (
                                <a href={interview.meeting_link} target="_blank" rel="noreferrer noopener" className="link link-primary btn btn-xs btn-ghost p-0 h-auto">Join</a>
                              )}
                            </span>
                          ) : interview.venue ? (
                            <span className="flex items-center gap-1">
                              <MapPinIcon className="w-3.5 h-3.5" aria-hidden="true" />
                              {interview.venue}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <Link
                        to={`/recruiter/applicants/${app?.id}`}
                        className="btn btn-sm btn-neutral gap-1 min-w-[120px] justify-center"
                      >
                        <UserIcon className="w-3.5 h-3.5" aria-hidden="true" />
                        View profile
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export function DashboardLists({ jobIds }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <ShortlistedCandidates jobIds={jobIds} />
      <UpcomingInterviews jobIds={jobIds} />
    </div>
  )
}