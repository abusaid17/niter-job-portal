import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { APPLICATION_STATUS, APPLICATION_BADGE } from '../../utils/labels'
import { formatDate } from '../../utils/format'
import { LoadingScreen } from '../../components/ui/LoadingScreen'

export default function AdminApplicationsPage() {
  const { session } = useAuth()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  useEffect(() => {
    if (!session?.user?.id) return
    let active = true
    supabase
      .from('applications')
      .select('id, status, applied_at, cover_letter, students(id, student_id, department, users(name, email)), jobs(id, title, companies(name)), users!applicant_user_id(name, email)')
      .order('applied_at', { ascending: false })
      .then(({ data }) => {
        if (active) {
          setApplications(data ?? [])
          setLoading(false)
        }
      })
    return () => { active = false }
  }, [session])

  const visible = useMemo(() => {
    return applications.filter((a) => {
      const name = (a.students?.users?.name ?? a.users?.name ?? '').toLowerCase()
      const jobTitle = (a.jobs?.title ?? '').toLowerCase()
      const company = (a.jobs?.companies?.name ?? '').toLowerCase()
      const q = query.toLowerCase()
      const matchQ = !q || name.includes(q) || jobTitle.includes(q) || company.includes(q)
      const matchS = statusFilter === 'ALL' || a.status === statusFilter
      return matchQ && matchS
    })
  }, [applications, query, statusFilter])

  const statusCounts = useMemo(() => {
    const map = { ALL: applications.length }
    for (const a of applications) {
      map[a.status] = (map[a.status] ?? 0) + 1
    }
    return map
  }, [applications])

  if (loading) return <LoadingScreen />

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Application monitoring</h1>
        <p className="mt-1 text-base-content/70">Track all job applications across the platform.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input className="input input-bordered w-full max-w-xs" placeholder="Search applicant, job, company…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="flex flex-wrap gap-1">
          {['ALL', 'APPLIED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW_SCHEDULED', 'SELECTED', 'REJECTED'].map((s) => (
            <button key={s} className={`btn btn-xs ${statusFilter === s ? 'btn-primary' : 'btn-outline'}`} onClick={() => setStatusFilter(s)}>
              {s === 'ALL' ? 'All' : APPLICATION_STATUS[s] ?? s}
              <span className="badge badge-ghost badge-xs">{statusCounts[s] ?? 0}</span>
            </button>
          ))}
        </div>
        <span className="ml-auto text-sm text-base-content/60">{visible.length} shown</span>
      </div>

      {visible.length === 0 ? (
        <div className="card bg-base-100 p-10 text-center text-sm text-base-content/60 shadow-sm">No applications found.</div>
      ) : (
        <div className="overflow-x-auto rounded-box bg-base-100 shadow-sm">
          <table className="table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Job</th>
                <th>Status</th>
                <th>Applied</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div className="font-medium">{a.students?.users?.name ?? a.users?.name ?? 'Unknown'}</div>
                    <div className="text-xs text-base-content/60">{a.students?.student_id ?? 'Alumni'} · {a.students?.department ?? ''}</div>
                  </td>
                  <td>
                    <div className="text-sm font-medium">{a.jobs?.title ?? '—'}</div>
                    <div className="text-xs text-base-content/60">{a.jobs?.companies?.name ?? ''}</div>
                  </td>
                  <td>
                    <span className={`badge badge-sm ${APPLICATION_BADGE[a.status] ?? 'badge-ghost'}`}>
                      {APPLICATION_STATUS[a.status] ?? a.status}
                    </span>
                  </td>
                  <td className="text-sm text-base-content/70">{formatDate(a.applied_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}