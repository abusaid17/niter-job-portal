import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { JOB_STATUS, JOB_STATUS_BADGE, EMPLOYMENT_TYPE } from '../../utils/labels'
import { formatDate } from '../../utils/format'
import { LoadingScreen } from '../../components/ui/LoadingScreen'

export default function AdminJobsPage() {
  const { session } = useAuth()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    if (!session?.user?.id) return
    let active = true
    supabase
      .from('jobs')
      .select('id, title, status, employment_type, location, salary_min, salary_max, vacancy_count, created_at, deadline, companies(name), users!posted_by(name, email)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (active) {
          setJobs(data ?? [])
          setLoading(false)
        }
      })
    return () => { active = false }
  }, [session])

  const visible = useMemo(() => {
    return jobs.filter((j) => {
      const q = query.toLowerCase()
      const matchQ = !q || j.title?.toLowerCase().includes(q) || j.companies?.name?.toLowerCase().includes(q) || j.location?.toLowerCase().includes(q)
      const matchS = statusFilter === 'ALL' || j.status === statusFilter
      return matchQ && matchS
    })
  }, [jobs, query, statusFilter])

  const statusCounts = useMemo(() => {
    const map = { ALL: jobs.length }
    for (const j of jobs) {
      map[j.status] = (map[j.status] ?? 0) + 1
    }
    return map
  }, [jobs])

  async function updateStatus(jobId, status) {
    setBusyId(jobId)
    setError(null)
    setNotice(null)
    const { error: e } = await supabase.from('jobs').update({ status }).eq('id', jobId)
    setBusyId(null)
    if (e) {
      setError(e.message)
      return
    }
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status } : j)))
    setNotice({ type: 'success', text: `Job ${status === 'PUBLISHED' ? 'published' : status.toLowerCase()}.` })
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Job management</h1>
        <p className="mt-1 text-base-content/70">Review, approve and manage all job listings.</p>
      </div>

      {error && <div role="alert" className="alert alert-error">{error}</div>}
      {notice && <div role="alert" className={`alert alert-${notice.type}`}>{notice.text}</div>}

      <div className="flex flex-wrap items-center gap-3">
        <input className="input input-bordered w-full max-w-xs" placeholder="Search title, company, location…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="flex flex-wrap gap-1">
          {['ALL', 'PENDING_APPROVAL', 'PUBLISHED', 'REJECTED', 'CLOSED'].map((s) => (
            <button key={s} className={`btn btn-xs ${statusFilter === s ? 'btn-primary' : 'btn-outline'}`} onClick={() => setStatusFilter(s)}>
              {s === 'ALL' ? 'All' : JOB_STATUS[s] ?? s}
              <span className="badge badge-ghost badge-xs">{statusCounts[s] ?? 0}</span>
            </button>
          ))}
        </div>
        <span className="ml-auto text-sm text-base-content/60">{visible.length} shown</span>
      </div>

      {visible.length === 0 ? (
        <div className="card bg-base-100 p-10 text-center text-sm text-base-content/60 shadow-sm">No jobs found.</div>
      ) : (
        <div className="overflow-x-auto rounded-box bg-base-100 shadow-sm">
          <table className="table">
            <thead>
              <tr>
                <th>Job</th>
                <th>Company</th>
                <th>Type</th>
                <th>Status</th>
                <th>Deadline</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((j) => (
                <tr key={j.id}>
                  <td>
                    <div className="font-medium">{j.title}</div>
                    <div className="text-xs text-base-content/60">{j.location ?? 'Remote'}</div>
                  </td>
                  <td className="text-sm">{j.companies?.name ?? '—'}</td>
                  <td><span className="badge badge-sm badge-ghost">{EMPLOYMENT_TYPE[j.employment_type] ?? j.employment_type}</span></td>
                  <td><span className={`badge badge-sm ${JOB_STATUS_BADGE[j.status] ?? 'badge-ghost'}`}>{JOB_STATUS[j.status] ?? j.status}</span></td>
                  <td className="text-sm text-base-content/70">{formatDate(j.deadline)}</td>
                  <td className="text-right">
                    <div className="flex justify-end gap-1">
                      {j.status === 'PENDING_APPROVAL' && (
                        <>
                          <button className="btn btn-sm btn-success" disabled={busyId === j.id} onClick={() => updateStatus(j.id, 'PUBLISHED')}>
                            {busyId === j.id ? <span className="loading loading-spinner loading-sm" /> : 'Publish'}
                          </button>
                          <button className="btn btn-sm btn-outline btn-error" disabled={busyId === j.id} onClick={() => updateStatus(j.id, 'REJECTED')}>
                            Reject
                          </button>
                        </>
                      )}
                      {j.status === 'PUBLISHED' && (
                        <button className="btn btn-sm btn-outline btn-error" disabled={busyId === j.id} onClick={() => updateStatus(j.id, 'CLOSED')}>
                          Close
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}