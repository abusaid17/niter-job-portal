import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useRecruiterProfile } from '../../hooks/useProfiles'
import { APPLICATION_BADGE, APPLICATION_STATUS, JOB_STATUS, JOB_STATUS_BADGE } from '../../utils/labels'
import { formatDate } from '../../utils/format'
import { LoadingScreen } from '../../components/ui/LoadingScreen'
import { DashboardLists } from '../../components/recruiter/DashboardLists'

const OPEN_STATUSES = ['DRAFT', 'PENDING_APPROVAL', 'PUBLISHED']
const TABS = ['ALL', 'DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'CLOSED']

function StatTile({ label, value, to }) {
  const inner = (
    <div className="card bg-base-100 p-5 text-center shadow-sm transition hover:shadow-md">
      <div className="text-4xl font-extrabold text-primary">{value}</div>
      <div className="mt-1 text-sm text-base-content/70">{label}</div>
    </div>
  )
  return to ? <Link to={to}>{inner}</Link> : inner
}

function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirmText = 'Confirm', variant = 'btn-error' }) {
  if (!open) return null
  return (
    <div className="modal modal-middle" role="dialog">
      <form method="dialog" className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onCancel()}>
        <button>close</button>
      </form>
      <div className="modal-box">
        <h3 className="font-bold text-lg">{title}</h3>
        <p className="mt-2 text-sm text-base-content/70">{message}</p>
        <div className="modal-action mt-4">
          <button className="btn btn-outline" onClick={onCancel}>Cancel</button>
          <button className={`btn ${variant}`} onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  )
}

export default function RecruiterDashboardPage() {
  const { profile: user } = useAuth()
  const { recruiter: _recruiter, company, loading: companyLoading } = useRecruiterProfile()
  const [jobs, setJobs] = useState([])
  const [apps, setApps] = useState([])
  const [interviewCount, setInterviewCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('ALL')
  const [busyId, setBusyId] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState(null)

  useEffect(() => {
    if (!user?.id) return
    let active = true
    async function load() {
      const [recruiterR, jobsR, interR] = await Promise.all([
        supabase.from('recruiters').select('company_id').eq('user_id', user.id).single(),
        supabase.from('jobs').select('id, title, status, created_at').eq('posted_by', user.id).order('created_at', { ascending: false }),
        supabase.from('interviews').select('id', { count: 'exact', head: true }),
      ])
      if (!active) return
      const companyId = recruiterR.data?.company_id
      let appsData = []
      if (companyId) {
        const { data } = await supabase
          .from('applications')
          .select('id, status, applied_at, job_id, jobs(title)')
          .eq('jobs.company_id', companyId)
          .order('applied_at', { ascending: false })
        appsData = data ?? []
      }
      setJobs(jobsR.data ?? [])
      setApps(appsData)
      setInterviewCount(interR.count ?? 0)
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [user])

  const stats = useMemo(() => {
    const byStatus = {}
    for (const a of apps) byStatus[a.status] = (byStatus[a.status] ?? 0) + 1
    const open = jobs.filter((j) => OPEN_STATUSES.includes(j.status)).length
    const closed = jobs.filter((j) => j.status === 'CLOSED').length
    return {
      open,
      closed,
      applicants: apps.length,
      shortlisted: (byStatus.SHORTLISTED ?? 0) + (byStatus.INTERVIEW_SCHEDULED ?? 0) + (byStatus.SELECTED ?? 0),
      interviews: interviewCount,
    }
  }, [jobs, apps, interviewCount])

  const filteredJobs = useMemo(() => {
    if (activeTab === 'ALL') return jobs
    return jobs.filter((j) => j.status === activeTab)
  }, [jobs, activeTab])

  async function closeJob(id) {
    setBusyId(id)
    const { error } = await supabase.from('jobs').update({ status: 'CLOSED' }).eq('id', id)
    setBusyId(null)
    if (error) {
      alert(error.message)
    } else {
      setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status: 'CLOSED' } : j)))
    }
  }

  async function reopenJob(id) {
    setBusyId(id)
    const { error } = await supabase.from('jobs').update({ status: 'PUBLISHED' }).eq('id', id)
    setBusyId(null)
    if (error) {
      alert(error.message)
    } else {
      setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status: 'PUBLISHED' } : j)))
    }
  }

  function handleConfirmAction(job, action) {
    if (action === 'close') {
      setConfirmDialog({
        title: 'Close this job?',
        message: 'Students will no longer be able to apply.',
        onConfirm: () => closeJob(job.id),
        onCancel: () => setConfirmDialog(null),
        confirmText: 'Close job',
        variant: 'btn-error',
      })
    } else if (action === 'reopen') {
      setConfirmDialog({
        title: 'Reopen this job?',
        message: 'Students will be able to apply again.',
        onConfirm: () => reopenJob(job.id),
        onCancel: () => setConfirmDialog(null),
        confirmText: 'Reopen',
        variant: 'btn-success',
      })
    }
  }

  if (companyLoading) {
    return <LoadingScreen />
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome{user.name ? `, ${user.name.split(' ')[0]}` : ''} 👋
          </h1>
          <p className="mt-1 text-base-content/70">Manage your jobs, applicants, and interviews.</p>
        </div>
        <Link to="/recruiter/jobs/new" className="btn btn-primary">
          Post a job
        </Link>
      </div>

      {!company ? (
        <div role="alert" className="alert alert-warning">
          <span>Set up your company profile to start posting jobs.</span>
          <Link to="/recruiter/company" className="btn btn-sm btn-primary">
            Create company profile
          </Link>
        </div>
      ) : (
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="card-title">{company.name}</div>
                <div className="text-sm text-base-content/70">
                  {[company.industry, company.location].filter(Boolean).join(' · ') || '—'}
                </div>
              </div>
              <span className={`badge badge-lg ${company.verification_status === 'VERIFIED' ? 'badge-success' : 'badge-warning'}`}>
                {company.verification_status === 'VERIFIED' ? 'Verified' : 'Pending verification'}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatTile label="Open jobs" value={loading ? '…' : stats.open} to="/recruiter/jobs" />
        <StatTile label="Total applicants" value={loading ? '…' : stats.applicants} to="/recruiter/jobs" />
        <StatTile label="Shortlisted" value={loading ? '…' : stats.shortlisted} />
        <StatTile label="Interviews" value={loading ? '…' : stats.interviews} />
        <StatTile label="Closed jobs" value={loading ? '…' : stats.closed} />
      </div>

      {jobs.length > 0 && <DashboardLists jobIds={jobs.map((j) => j.id)} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">My jobs</h2>
            <Link to="/recruiter/jobs" className="link link-primary text-sm">
              Manage jobs
            </Link>
          </div>
          <div className="flex flex-wrap gap-1 mt-2 mb-3" role="tablist">
            {TABS.map((tab) => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                className={`btn btn-sm ${activeTab === tab ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'PENDING_APPROVAL' ? 'Pending approval' : tab}
              </button>
            ))}
          </div>
          {loading ? (
            <div className="mt-4 flex justify-center">
              <span className="loading loading-spinner loading-lg text-primary" />
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="card mt-3 bg-base-100 p-6 text-center text-sm text-base-content/60 shadow-sm">
              No jobs in this category.
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              {filteredJobs.slice(0, 5).map((j) => (
                <div key={j.id} className="card bg-base-100 p-4 shadow-sm transition hover:shadow-md">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{j.title}</div>
                      <div className="text-xs text-base-content/60">{formatDate(j.created_at)}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`badge badge-sm ${JOB_STATUS_BADGE[j.status] ?? 'badge-ghost'}`}>
                        {JOB_STATUS[j.status] ?? j.status}
                      </span>
                      {j.status === 'PUBLISHED' && (
                        <button
                          className="btn btn-sm btn-outline btn-error"
                          disabled={busyId === j.id}
                          onClick={() => handleConfirmAction(j, 'close')}
                        >
                          {busyId === j.id ? <span className="loading loading-spinner loading-sm" /> : 'Close'}
                        </button>
                      )}
                      {j.status === 'CLOSED' && (
                        <button
                          className="btn btn-sm btn-outline btn-success"
                          disabled={busyId === j.id}
                          onClick={() => handleConfirmAction(j, 'reopen')}
                        >
                          {busyId === j.id ? <span className="loading loading-spinner loading-sm" /> : 'Reopen'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-lg font-bold">Recent applicants</h2>
          {apps.length === 0 ? (
            <div className="card mt-3 bg-base-100 p-6 text-center text-sm text-base-content/60 shadow-sm">
              No applications yet. Share your jobs with students to attract talent.
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              {apps.slice(0, 5).map((a) => (
                <Link key={a.id} to={`/recruiter/applicants/${a.id}`} className="card bg-base-100 p-4 shadow-sm transition hover:shadow-md">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">{a.jobs?.title ?? 'Job removed'}</div>
                      <div className="text-xs text-base-content/60">Applied {formatDate(a.applied_at)}</div>
                    </div>
                    <span className={`badge badge-sm ${APPLICATION_BADGE[a.status] ?? 'badge-ghost'}`}>
                      {APPLICATION_STATUS[a.status] ?? a.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}