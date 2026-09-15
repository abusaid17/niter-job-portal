import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useStudentProfile } from '../../hooks/useProfiles'
import { formatDate, todayISO } from '../../utils/format'
import { LoadingScreen } from '../../components/ui/LoadingScreen'

const STATUS_STYLES = {
  SCHEDULED: 'badge-primary',
  COMPLETED: 'badge-success',
  CANCELLED: 'badge-error',
  NO_SHOW: 'badge-warning',
}

const STATUS_LABELS = {
  SCHEDULED: 'Scheduled',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No Show',
}

export default function StudentInterviewsPage() {
  const { profile: student, loading: profileLoading } = useStudentProfile()
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const studentId = student?.id

  useEffect(() => {
    if (!studentId) {
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
          applications (
            id,
            applied_at,
            status,
            jobs (
              id,
              title,
              companies ( name )
            )
          )
        `)
        .eq('applications.student_id', studentId)
        .order('interview_date', { ascending: false })

      if (!active) return
      if (error) {
        setError(error.message)
      } else {
        setInterviews(data ?? [])
      }
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [studentId])

  const upcoming = useMemo(
    () =>
      interviews
        .filter((i) => i.interview_date >= todayISO())
        .sort((a, b) => a.interview_date.localeCompare(b.interview_date)),
    [interviews],
  )

  const past = useMemo(
    () =>
      interviews
        .filter((i) => i.interview_date < todayISO())
        .sort((a, b) => b.interview_date.localeCompare(a.interview_date)),
    [interviews],
  )

  if (profileLoading) {
    return <LoadingScreen />
  }

  if (!student?.id) {
    return (
      <div className="alert alert-warning max-w-xl">
        Complete your student profile to view interviews.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">My Interviews</h1>
        <p className="text-sm text-base-content/70">View and manage your scheduled interviews.</p>
      </div>

      {error && (
        <div role="alert" className="alert alert-error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      ) : interviews.length === 0 ? (
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body text-center text-base-content/70 py-10">
            No interviews scheduled yet.
          </div>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-lg font-bold mb-3">Upcoming</h2>
              <div className="flex flex-col gap-3">
                {upcoming.map((interview) => (
                  <InterviewCard key={interview.id} interview={interview} />
                ))}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h2 className="text-lg font-bold mb-3 mt-6">Past</h2>
              <div className="flex flex-col gap-3">
                {past.map((interview) => (
                  <InterviewCard key={interview.id} interview={interview} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function InterviewCard({ interview }) {
  const job = interview.applications?.jobs
  const company = job?.companies?.name
  const status = interview.status
  const isOnline = interview.meeting_link && !interview.venue

  const statusBadge = STATUS_STYLES[status] ?? 'badge-ghost'
  const statusLabel = STATUS_LABELS[status] ?? status

  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold truncate">{job?.title ?? 'Interview'}</span>
              <span className={`badge badge-sm ${statusBadge}`}>
                {statusLabel}
              </span>
            </div>
            {company && (
              <p className="mt-0.5 text-sm text-base-content/70">{company}</p>
            )}
            <div className="mt-1 flex flex-wrap gap-3 text-sm text-base-content/60">
              <span>
                <strong>Date:</strong> {formatDate(interview.interview_date)}
              </span>
              <span>
                <strong>Time:</strong> {interview.start_time?.slice(0, 5)}
                {interview.end_time ? ` – ${interview.end_time.slice(0, 5)}` : ''}
              </span>
              {isOnline ? (
                <span className="flex items-center gap-1">
                  <strong>Mode:</strong> Online
                  {interview.meeting_link && (
                    <a
                      href={interview.meeting_link}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="link link-primary"
                    >
                      Join
                    </a>
                  )}
                </span>
              ) : interview.venue ? (
                <span>
                  <strong>Venue:</strong> {interview.venue}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}