import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { APPLICATION_BADGE, APPLICATION_STATUS } from '../../utils/labels'
import { formatDate } from '../../utils/format'
import { openCv } from '../../utils/cv'
import { LoadingScreen } from '../../components/ui/LoadingScreen'
import InterviewModal from '../../components/interviews/InterviewModal'

const FILTERS = ['ALL', 'APPLIED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW_SCHEDULED', 'SELECTED', 'REJECTED']

export default function ApplicantsPage() {
  const { jobId } = useParams()
  const { session, role } = useAuth()
  const [job, setJob] = useState(null)
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState(null)
  const [interviewing, setInterviewing] = useState(null)

  useEffect(() => {
    if (!session?.user?.id) return
    let active = true
    async function load() {
      const [jobR, appsR] = await Promise.all([
        supabase.from('jobs').select('title, status').eq('id', jobId).single(),
        supabase
          .from('applications')
          .select('*, students(id, student_id, department, batch, cgpa, phone, bio, users(id, name, email)), jobs(title), cvs(id, title, file_path), applicant:users!applications_applicant_user_id_fkey(id, name, email)')
          .eq('job_id', jobId)
          .order('applied_at', { ascending: false }),
      ])
      if (!active) return
      setJob(jobR.data ?? null)
      setApps(appsR.data ?? [])
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [session, jobId])

  const counts = useMemo(() => {
    const m = {}
    for (const a of apps) m[a.status] = (m[a.status] ?? 0) + 1
    return m
  }, [apps])

  const visible = filter === 'ALL' ? apps : apps.filter((a) => a.status === filter)

  async function setStatus(id, status) {
    setBusyId(id)
    setError(null)
    const { error: e } = await supabase.from('applications').update({ status }).eq('id', id)
    setBusyId(null)
    if (e) {
      setError(e.message)
      return
    }
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)))
  }

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">{job?.title ?? 'Applicants'}</h1>
        <div className="mt-1 flex items-center gap-3 text-sm text-base-content/70">
          <span>{apps.length} applicants</span>
          <Link to={role === 'ALUMNI' ? '/alumni/dashboard' : '/recruiter/jobs'} className="link link-primary">
            ← Back to my jobs
          </Link>
        </div>
      </div>

      {error && (
        <div role="alert" className="alert alert-error">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilter(f)}
          >
            {f === 'ALL' ? 'All' : APPLICATION_STATUS[f]}
            {f !== 'ALL' && <span className="badge badge-ghost badge-sm">{counts[f] ?? 0}</span>}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="card bg-base-100 p-10 text-center text-sm text-base-content/60 shadow-sm">
          No applicants in this stage.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((a) => {
            const student = a.students
            const name = student?.users?.name ?? a.applicant?.name ?? 'Applicant'
            const isAlumni = a.applicant != null
            return (
              <div key={a.id} className="card bg-base-100 shadow-sm">
                <div className="card-body">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{name}</span>
                        {isAlumni && <span className="badge badge-ghost badge-sm">Alumni</span>}
                        <span className={`badge badge-sm ${APPLICATION_BADGE[a.status] ?? 'badge-ghost'}`}>
                          {APPLICATION_STATUS[a.status] ?? a.status}
                        </span>
                      </div>
                      <div className="mt-0.5 text-sm text-base-content/60">
                        Applied {formatDate(a.applied_at)}
                        {!isAlumni && student?.department && ` · ${student.department}`}
                        {!isAlumni && student?.batch && ` (Batch ${student.batch})`}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!isAlumni && a.cvs?.file_path && (
                        <button className="btn btn-sm btn-outline" onClick={() => openCv(a.cvs)}>
                          View CV
                        </button>
                      )}
                      <Link to={`/recruiter/applicants/${a.id}`} className="btn btn-sm btn-neutral">
                        Review
                      </Link>
                      {a.status !== 'REJECTED' && (
                        <button
                          className="btn btn-sm btn-outline btn-error"
                          disabled={busyId === a.id}
                          onClick={() => setStatus(a.id, 'REJECTED')}
                        >
                          Reject
                        </button>
                      )}
                      {a.status !== 'INTERVIEW_SCHEDULED' && a.status !== 'SELECTED' && (
                        <button
                          className="btn btn-sm btn-outline btn-success"
                          disabled={busyId === a.id}
                          onClick={() => setStatus(a.id, 'SHORTLISTED')}
                        >
                          Shortlist
                        </button>
                      )}
                      {a.status !== 'INTERVIEW_SCHEDULED' && a.status !== 'SELECTED' && a.status !== 'REJECTED' && (
                        <button className="btn btn-sm btn-primary" disabled={busyId === a.id} onClick={() => setInterviewing(a)}>
                          Schedule interview
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <InterviewModal
        open={Boolean(interviewing)}
        application={interviewing}
        jobTitle={job?.title}
        onClose={() => setInterviewing(null)}
        onScheduled={() => {
          if (interviewing?.id) setStatus(interviewing.id, 'INTERVIEW_SCHEDULED')
          setInterviewing(null)
        }}
      />
    </div>
  )
}