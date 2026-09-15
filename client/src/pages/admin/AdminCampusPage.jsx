import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { formatDateTime } from '../../utils/format'
import { LoadingScreen } from '../../components/ui/LoadingScreen'

const STATUS_BADGE = { PENDING: 'badge-warning', APPROVED: 'badge-success', REJECTED: 'badge-error' }

export default function AdminCampusPage() {
  const { session } = useAuth()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    if (!session?.user?.id) return
    let active = true
    supabase
      .from('campus_recruitment')
      .select('*, companies(name, location), users!requested_by(name)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (active) {
          setRequests(data ?? [])
          setLoading(false)
        }
      })
    return () => { active = false }
  }, [session])

  async function updateStatus(id, status) {
    setBusyId(id)
    setError(null)
    setNotice(null)
    const { error: e } = await supabase.from('campus_recruitment').update({ status }).eq('id', id)
    setBusyId(null)
    if (e) {
      setError(e.message)
      return
    }
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
    setNotice({ type: 'success', text: `Campus recruitment ${status === 'APPROVED' ? 'approved' : 'rejected'}.` })
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Campus recruitment</h1>
        <p className="mt-1 text-base-content/70">Review and approve company campus recruitment requests.</p>
      </div>

      {error && <div role="alert" className="alert alert-error">{error}</div>}
      {notice && <div role="alert" className={`alert alert-${notice.type}`}>{notice.text}</div>}

      {requests.length === 0 ? (
        <div className="card bg-base-100 p-10 text-center text-sm text-base-content/60 shadow-sm">No campus recruitment requests.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {requests.map((r) => {
            const e = r.eligibility ?? {}
            return (
              <div key={r.id} className="card bg-base-100 shadow-sm">
                <div className="card-body">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="card-title text-base">{r.companies?.name ?? 'Company'}</div>
                      <div className="text-sm text-base-content/60">
                        {[r.companies?.location, r.users?.name, formatDateTime(r.created_at)].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <span className={`badge badge-sm ${STATUS_BADGE[r.status] ?? 'badge-ghost'}`}>{r.status}</span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                    {e.department && <span className="badge badge-outline">Dept: {e.department}</span>}
                    {e.batch && <span className="badge badge-outline">Batch: {e.batch}</span>}
                    {e.min_cgpa != null && <span className="badge badge-outline">CGPA ≥ {Number(e.min_cgpa).toFixed(2)}</span>}
                    {e.graduation_year && <span className="badge badge-outline">Class of {e.graduation_year}</span>}
                    {(e.skills ?? []).length > 0 && (
                      <span className="badge badge-outline">Skills: {(e.skills ?? []).join(', ')}</span>
                    )}
                  </div>

                  <div className="card-actions mt-3 justify-end">
                    {r.status === 'PENDING' && (
                      <>
                        <button className="btn btn-sm btn-success" disabled={busyId === r.id} onClick={() => updateStatus(r.id, 'APPROVED')}>
                          {busyId === r.id ? <span className="loading loading-spinner loading-sm" /> : 'Approve'}
                        </button>
                        <button className="btn btn-sm btn-outline btn-error" disabled={busyId === r.id} onClick={() => updateStatus(r.id, 'REJECTED')}>
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
