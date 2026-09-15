import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { INTERVIEW_STATUS, INTERVIEW_STATUS_BADGE } from '../../utils/labels'
import { formatDate } from '../../utils/format'
import { LoadingScreen } from '../../components/ui/LoadingScreen'

export default function AdminInterviewsPage() {
  const { session } = useAuth()
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  useEffect(() => {
    if (!session?.user?.id) return
    let active = true
    supabase
      .from('interviews')
      .select('id, interview_date, start_time, end_time, venue, meeting_link, notes, status, created_at, applications(id, students(id, student_id, users(name, email)), jobs(title, companies(name)), users!applicant_user_id(name, email)), users!scheduled_by(name)')
      .order('interview_date', { ascending: false })
      .then(({ data }) => {
        if (active) {
          setInterviews(data ?? [])
          setLoading(false)
        }
      })
    return () => { active = false }
  }, [session])

  const visible = useMemo(() => {
    return interviews.filter((i) => {
      const applicant = (i.applications?.students?.users?.name ?? i.applications?.users?.name ?? '').toLowerCase()
      const job = (i.applications?.jobs?.title ?? '').toLowerCase()
      const q = query.toLowerCase()
      const matchQ = !q || applicant.includes(q) || job.includes(q)
      const matchS = statusFilter === 'ALL' || i.status === statusFilter
      return matchQ && matchS
    })
  }, [interviews, query, statusFilter])

  const statusCounts = useMemo(() => {
    const map = { ALL: interviews.length }
    for (const i of interviews) {
      map[i.status] = (map[i.status] ?? 0) + 1
    }
    return map
  }, [interviews])

  if (loading) return <LoadingScreen />

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Interview monitoring</h1>
        <p className="mt-1 text-base-content/70">View all scheduled interviews across the platform.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input className="input input-bordered w-full max-w-xs" placeholder="Search applicant, job…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="flex flex-wrap gap-1">
          {['ALL', 'SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].map((s) => (
            <button key={s} className={`btn btn-xs ${statusFilter === s ? 'btn-primary' : 'btn-outline'}`} onClick={() => setStatusFilter(s)}>
              {s === 'ALL' ? 'All' : INTERVIEW_STATUS[s] ?? s}
              <span className="badge badge-ghost badge-xs">{statusCounts[s] ?? 0}</span>
            </button>
          ))}
        </div>
        <span className="ml-auto text-sm text-base-content/60">{visible.length} shown</span>
      </div>

      {visible.length === 0 ? (
        <div className="card bg-base-100 p-10 text-center text-sm text-base-content/60 shadow-sm">No interviews found.</div>
      ) : (
        <div className="overflow-x-auto rounded-box bg-base-100 shadow-sm">
          <table className="table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Job</th>
                <th>Date & time</th>
                <th>Venue</th>
                <th>Scheduled by</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((i) => (
                <tr key={i.id}>
                  <td>
                    <div className="font-medium">{i.applications?.students?.users?.name ?? i.applications?.users?.name ?? 'Unknown'}</div>
                  </td>
                  <td className="text-sm">{i.applications?.jobs?.title ?? '—'}</td>
                  <td className="text-sm">{formatDate(i.interview_date)} · {i.start_time ?? ''}{i.end_time ? ` — ${i.end_time}` : ''}</td>
                  <td className="text-sm text-base-content/70">{i.venue ?? i.meeting_link ?? '—'}</td>
                  <td className="text-sm text-base-content/70">{i.users?.name ?? '—'}</td>
                  <td>
                    <span className={`badge badge-sm ${INTERVIEW_STATUS_BADGE[i.status] ?? 'badge-ghost'}`}>
                      {INTERVIEW_STATUS[i.status] ?? i.status}
                    </span>
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