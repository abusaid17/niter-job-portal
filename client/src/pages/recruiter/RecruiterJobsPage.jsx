import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useRecruiterProfile } from '../../hooks/useProfiles'
import { JOB_STATUS, JOB_STATUS_BADGE } from '../../utils/labels'
import { formatDate } from '../../utils/format'
import { LoadingScreen } from '../../components/ui/LoadingScreen'

export default function RecruiterJobsPage() {
  const { session } = useAuth()
  const { recruiter, loading: profileLoading } = useRecruiterProfile()
  const [jobs, setJobs] = useState([])
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    if (!session?.user?.id) return
    let active = true
    async function load() {
      const [jobsR, appsR] = await Promise.all([
        supabase.from('jobs').select('id, title, employment_type, location, status, deadline, created_at').eq('posted_by', session.user.id).order('created_at', { ascending: false }),
        supabase.from('applications').select('id, job_id'),
      ])
      if (!active) return
      setJobs(jobsR.data ?? [])
      setApps(appsR.data ?? [])
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [session])

  const counts = useMemo(() => {
    const m = {}
    for (const a of apps) m[a.job_id] = (m[a.job_id] ?? 0) + 1
    return m
  }, [apps])

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

  async function closeJob(id) {
    setBusyId(id)
    setMessage(null)
    const { error } = await supabase.from('jobs').update({ status: 'CLOSED' }).eq('id', id)
    setBusyId(null)
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status: 'CLOSED' } : j)))
      setMessage({ type: 'success', text: 'Job closed.' })
    }
  }

  if (profileLoading || loading) {
    return <LoadingScreen />
  }

  if (!recruiter) {
    return (
      <div className="flex max-w-xl flex-col items-start gap-3">
        <h1 className="text-2xl font-bold">My Jobs</h1>
        <div role="alert" className="alert alert-warning">
          <span>Set up your company profile first.</span>
          <Link to="/recruiter/company" className="btn btn-sm btn-primary">
            Create company
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">My Jobs</h1>
          <p className="mt-1 text-base-content/70">Jobs are reviewed by an admin before being published.</p>
        </div>
        <Link to="/recruiter/jobs/new" className="btn btn-primary">
          Post a job
        </Link>
      </div>

      {message && (
        <div role="alert" className={`alert alert-${message.type === 'success' ? 'success' : 'error'}`}>
          {message.text}
        </div>
      )}

      {jobs.length === 0 ? (
        <div className="card bg-base-100 p-10 text-center text-sm text-base-content/60 shadow-sm">
          No jobs yet. Post your first opening to start receiving applications.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {jobs.map((j) => (
            <div key={j.id} className="card bg-base-100 shadow-sm">
              <div className="card-body flex-row items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{j.title}</span>
                    <span className={`badge badge-sm ${JOB_STATUS_BADGE[j.status] ?? 'badge-ghost'}`}>
                      {JOB_STATUS[j.status] ?? j.status}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-base-content/60">
                    {[j.employment_type, j.location].filter(Boolean).join(' · ') || '—'} · Posted {formatDate(j.created_at)} ·{' '}
                    <span className={`${counts[j.id] ? 'font-medium text-base-content' : ''}`}>
                      {counts[j.id] ?? 0} applicant{counts[j.id] === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>
                <div className="hidden shrink-0 gap-2 lg:flex">
                  <Link to={`/recruiter/jobs/${j.id}/applicants`} className="btn btn-sm btn-neutral">
                    Applicants
                  </Link>
                  <Link to={`/recruiter/jobs/${j.id}/edit`} className="btn btn-sm btn-outline">
                    Edit
                  </Link>
                  {j.status === 'DRAFT' && (
                    <button className="btn btn-sm btn-primary" disabled={busyId === j.id} onClick={() => submitForApproval(j.id)}>
                      {busyId === j.id ? <span className="loading loading-spinner loading-sm" /> : 'Submit for approval'}
                    </button>
                  )}
                  {j.status === 'PUBLISHED' && (
                    <button className="btn btn-sm btn-outline" disabled={busyId === j.id} onClick={() => closeJob(j.id)}>
                      Close
                    </button>
                  )}
                </div>
                <div className="dropdown lg:hidden">
                  <div tabIndex={0} role="button" className="btn btn-sm">
                    Actions
                  </div>
                  <ul tabIndex={0} className="dropdown-content menu rounded-box z-10 w-52 bg-base-100 p-2 shadow">
                    <li>
                      <Link to={`/recruiter/jobs/${j.id}/applicants`}>Applicants</Link>
                    </li>
                    <li>
                      <Link to={`/recruiter/jobs/${j.id}/edit`}>Edit</Link>
                    </li>
                    {j.status === 'DRAFT' && (
                      <li>
                        <button onClick={() => submitForApproval(j.id)}>Submit for approval</button>
                      </li>
                    )}
                    {j.status === 'PUBLISHED' && (
                      <li>
                        <button onClick={() => closeJob(j.id)}>Close job</button>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}