import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useRecruiterProfile } from '../../hooks/useProfiles'
import { APPLICATION_BADGE, APPLICATION_STATUS, JOB_STATUS, JOB_STATUS_BADGE } from '../../utils/labels'
import { formatDate } from '../../utils/format'
import { LoadingScreen } from '../../components/ui/LoadingScreen'
import { DashboardLists } from '../../components/recruiter/DashboardLists'
import {
  PlusIcon,
  Building2Icon,
  BriefcaseIcon,
  UsersIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  MapPinIcon,
  LinkIcon,
  ChevronRightIcon,
  EditIcon,
  SearchIcon,
  FilterIcon,
  BriefcaseIcon as JobIcon,
  UserIcon,
  EyeIcon,
  PencilIcon,
  ExternalLinkIcon,
  MoreHorizontalIcon,
} from 'lucide-react'

const STAT_ICONS = {
  open: BriefcaseIcon,
  applicants: UsersIcon,
  shortlisted: CheckCircleIcon,
  interviews: CalendarIcon,
  closed: XCircleIcon,
}

const STAT_COLORS = {
  open: 'bg-primary/10 text-primary',
  applicants: 'bg-info/10 text-info',
  shortlisted: 'bg-success/10 text-success',
  interviews: 'bg-warning/10 text-warning',
  closed: 'bg-error/10 text-error',
}

const OPEN_STATUSES = ['DRAFT', 'PENDING_APPROVAL', 'PUBLISHED']
const TABS = [
  { key: 'ALL', label: 'All', icon: null },
  { key: 'DRAFT', label: 'Draft', icon: null },
  { key: 'PENDING_APPROVAL', label: 'Pending Approval', icon: null },
  { key: 'PUBLISHED', label: 'Published', icon: null },
  { key: 'CLOSED', label: 'Closed', icon: null },
]

function StatTile({ label, value, to, statKey }) {
  const Icon = STAT_ICONS[statKey] || BriefcaseIcon
  const colorClass = STAT_COLORS[statKey] || 'bg-primary/10 text-primary'
  const inner = (
    <div className="card bg-base-100 p-5 shadow-sm hover:shadow-lg transition-shadow rounded-2xl border border-base-200">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-3xl font-extrabold text-base-content">{value}</div>
          <div className="mt-1 text-sm text-base-content/70">{label}</div>
        </div>
        <div className={`${colorClass} p-3 rounded-xl`}>
          <Icon className="w-6 h-6" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
  return to ? <Link to={to}>{inner}</Link> : inner
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

function EmptyState({ message, icon: Icon }) {
  return (
    <div className="card bg-base-100 p-8 text-center text-sm text-base-content/60 shadow-sm">
      {Icon && <Icon className="w-12 h-12 mx-auto mb-3 text-base-content/30" aria-hidden="true" />}
      <p className="font-medium mb-1">No data yet</p>
      <p className="text-xs">{message}</p>
    </div>
  )
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

  const tabCounts = useMemo(() => {
    const counts = { ALL: jobs.length }
    for (const j of jobs) counts[j.status] = (counts[j.status] ?? 0) + 1
    return counts
  }, [jobs])

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
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome back{user.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="mt-1 text-base-content/70">Manage your jobs, applicants, and interviews.</p>
        </div>
        <Link to="/recruiter/jobs/new" className="btn btn-primary gap-2 w-full sm:w-auto justify-center">
          <PlusIcon className="w-4 h-4" aria-hidden="true" />
          Post a job
        </Link>
      </div>

      {!company ? (
        <div role="alert" className="alert alert-warning gap-3">
          <Building2Icon className="w-6 h-6 shrink-0" aria-hidden="true" />
          <div className="flex-1">
            <p className="font-medium">Set up your company profile to start posting jobs.</p>
            <Link to="/recruiter/company" className="btn btn-sm btn-primary mt-2">
              Create company profile
            </Link>
          </div>
        </div>
      ) : (
        <div className="card bg-base-100 shadow-sm border border-base-200">
          <div className="card-body">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="avatar w-16 h-16 bg-primary/10 text-primary rounded-full">
                  <span className="text-2xl font-bold">
                    {company.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="card-title font-bold text-xl">{company.name}</div>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-base-content/70">
                    {company.industry && (
                      <span className="flex items-center gap-1">
                        <BriefcaseIcon className="w-4 h-4" aria-hidden="true" />
                        {company.industry}
                      </span>
                    )}
                    {company.location && (
                      <span className="flex items-center gap-1">
                        <MapPinIcon className="w-4 h-4" aria-hidden="true" />
                        {company.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
                <span className={`badge badge-lg gap-2 ${company.verification_status === 'VERIFIED' ? 'badge-success' : 'badge-warning'}`}>
                  {company.verification_status === 'VERIFIED' ? (
                    <>
                      <CheckCircleIcon className="w-4 h-4" aria-hidden="true" />
                      Verified
                    </>
                  ) : (
                    <>
                      <ClockIcon className="w-4 h-4" aria-hidden="true" />
                      Pending verification
                    </>
                  )}
                </span>
                <Link
                  to="/recruiter/company"
                  className="btn btn-sm btn-outline gap-2 justify-center w-full sm:w-auto"
                  aria-label="Edit company profile"
                >
                  <EditIcon className="w-4 h-4" aria-hidden="true" />
                  Edit company
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatTile label="Open jobs" value={loading ? '…' : stats.open} to="/recruiter/jobs" statKey="open" />
        <StatTile label="Total applicants" value={loading ? '…' : stats.applicants} to="/recruiter/jobs" statKey="applicants" />
        <StatTile label="Shortlisted" value={loading ? '…' : stats.shortlisted} statKey="shortlisted" />
        <StatTile label="Interviews" value={loading ? '…' : stats.interviews} statKey="interviews" />
        <StatTile label="Closed jobs" value={loading ? '…' : stats.closed} statKey="closed" />
      </div>

      {jobs.length > 0 && <DashboardLists jobIds={jobs.map((j) => j.id)} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="card bg-base-100 border border-base-200 shadow-sm">
          <div className="card-body p-0 pt-4 pb-4">
            <SectionHeader
              title="My jobs"
              icon={JobIcon}
              count={jobs.length}
              action={{ to: '/recruiter/jobs', className: 'px-4' }}
            />
            <div className="px-4">
              <div className="flex flex-wrap gap-2 mb-3" role="tablist">
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    role="tab"
                    aria-selected={activeTab === tab.key}
                    className={`btn btn-sm ${activeTab === tab.key ? 'btn-primary' : 'btn-outline'} gap-1.5 px-3 py-1.5 whitespace-nowrap`}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    {tab.label}
                    <span className={`badge badge-sm ${activeTab === tab.key ? 'badge-primary' : 'badge-ghost'}`}>
                      {tabCounts[tab.key] ?? 0}
                    </span>
                  </button>
                ))}
              </div>
              {loading ? (
                <div className="flex justify-center py-4">
                  <span className="loading loading-spinner loading-lg text-primary" />
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {filteredJobs.slice(0, 5).map((j) => {
                    const applicantCount = apps.filter((a) => a.job_id === j.id).length
                    const statusBadge = JOB_STATUS_BADGE[j.status] ?? 'badge-ghost'
                    const statusLabel = JOB_STATUS[j.status] ?? j.status
                    const isPublished = j.status === 'PUBLISHED'
                    const isClosed = j.status === 'CLOSED'
                    return (
                      <article
                        key={j.id}
                        className="card bg-base-100 border border-base-200 shadow-sm hover:shadow-lg transition-shadow duration-200"
                      >
                        <div className="card-body p-4">
                          {/* Row 1: Title + Status */}
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                            <h3 className="font-semibold text-base-content break-words sm:pr-4 flex-1 min-w-0">{j.title}</h3>
                            <span className={`badge badge-md ${statusBadge} whitespace-nowrap shrink-0`}>
                              {statusLabel}
                            </span>
                          </div>

                          {/* Row 2: Posted date + Applicant count */}
                          <div className="flex flex-wrap items-center gap-3 text-sm text-base-content/60 mb-3">
                            <span className="flex items-center gap-1.5 badge badge-sm badge-outline">
                              <CalendarIcon className="w-3.5 h-3.5" aria-hidden="true" />
                              Posted {formatDate(j.created_at)}
                            </span>
                            <span className="flex items-center gap-1.5 badge badge-sm badge-outline">
                              <UserIcon className="w-3.5 h-3.5" aria-hidden="true" />
                              {applicantCount} applicant{applicantCount !== 1 ? 's' : ''}
                            </span>
                          </div>

                          {/* Row 3: Actions */}
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              to={`/recruiter/jobs/${j.id}/applicants`}
                              className="btn btn-sm btn-neutral gap-1.5 px-3 min-w-[100px] justify-center"
                              aria-label={`View applicants for ${j.title}`}
                            >
                              <UserIcon className="w-4 h-4" aria-hidden="true" />
                              <span className="hidden sm:inline">Applicants</span>
                            </Link>
                            <Link
                              to={`/recruiter/jobs/${j.id}/edit`}
                              className="btn btn-sm btn-outline gap-1.5 px-3 min-w-[80px] justify-center"
                              aria-label={`Edit ${j.title}`}
                            >
                              <PencilIcon className="w-4 h-4" aria-hidden="true" />
                              <span className="hidden sm:inline">Edit</span>
                            </Link>
                            {isPublished && (
                              <button
                                className="btn btn-sm btn-outline btn-error gap-1.5 px-3 min-w-[80px] justify-center"
                                disabled={busyId === j.id}
                                onClick={() => handleConfirmAction(j, 'close')}
                                aria-label={`Close ${j.title}`}
                              >
                                <XCircleIcon className="w-4 h-4" aria-hidden="true" />
                                <span className="hidden sm:inline">Close</span>
                                {busyId === j.id && <span className="loading loading-spinner loading-sm" />}
                              </button>
                            )}
                            {isClosed && (
                              <button
                                className="btn btn-sm btn-outline btn-success gap-1.5 px-3 min-w-[80px] justify-center"
                                disabled={busyId === j.id}
                                onClick={() => handleConfirmAction(j, 'reopen')}
                                aria-label={`Reopen ${j.title}`}
                              >
                                <CheckCircleIcon className="w-4 h-4" aria-hidden="true" />
                                <span className="hidden sm:inline">Reopen</span>
                                {busyId === j.id && <span className="loading loading-spinner loading-sm" />}
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="card bg-base-100 border border-base-200 shadow-sm">
          <div className="card-body p-0 pt-4 pb-4">
            <SectionHeader
              title="Recent applicants"
              icon={UserIcon}
              count={apps.length}
              action={{ to: '/recruiter/jobs', className: 'px-4' }}
            />
            <div className="px-4">
              {apps.length === 0 ? (
                <EmptyState message="Share your jobs with students to attract talent and receive applications." icon={UserIcon} />
              ) : (
                <div className="flex flex-col gap-2">
                  {apps.slice(0, 5).map((a) => (
                    <Link
                      key={a.id}
                      to={`/recruiter/applicants/${a.id}`}
                      className="card bg-base-100 p-3 shadow-sm border border-base-200 hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium truncate">{a.jobs?.title ?? 'Job removed'}</span>
                            <span className={`badge badge-sm ${APPLICATION_BADGE[a.status] ?? 'badge-ghost'}`}>
                              {APPLICATION_STATUS[a.status] ?? a.status}
                            </span>
                          </div>
                          <div className="text-xs text-base-content/60 mt-1">Applied {formatDate(a.applied_at)}</div>
                        </div>
                        <EyeIcon className="w-5 h-5 text-base-content/40" aria-hidden="true" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}