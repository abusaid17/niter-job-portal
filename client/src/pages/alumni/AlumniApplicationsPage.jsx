import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { APPLICATION_BADGE, APPLICATION_STATUS } from '../../utils/labels'
import { formatDate } from '../../utils/format'
import { LoadingScreen } from '../../components/ui/LoadingScreen'

const FILTERS = ['ALL', 'APPLIED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW_SCHEDULED', 'SELECTED', 'REJECTED', 'WITHDRAWN']

export default function AlumniApplicationsPage() {
  const { session } = useAuth()
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [error, setError] = useState(null)
  const [busyId, setBusyId] = useState(null)

  async function load() {
    const { data, error } = await supabase
      .from('applications')
      .select('*, jobs(id, title, status, companies(name))')
      .eq('applicant_user_id', session.user.id)
      .order('applied_at', { ascending: false })
    setApps(data ?? [])
    setError(error?.message ?? null)
    setLoading(false)
  }

  useEffect(() => {
    if (!session?.user?.id) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  const counts = useMemo(() => {
    const m = {}
    for (const a of apps) m[a.status] = (m[a.status] ?? 0) + 1
    return m
  }, [apps])

  const visible = filter === 'ALL' ? apps : apps.filter((a) => a.status === filter)

  async function withdraw(id) {
    setBusyId(id)
    const { error: e } = await supabase.from('applications').update({ status: 'WITHDRAWN' }).eq('id', id)
    setBusyId(null)
    if (e) {
      setError(e.message)
      return
    }
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'WITHDRAWN' } : a)))
  }

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">My applications</h1>
          <p className="mt-1 text-base-content/70">Track the jobs you have applied to.</p>
        </div>
        <Link to="/jobs" className="btn btn-primary">
          Browse more jobs
        </Link>
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
          {filter === 'ALL' ? (
            <>
              You have not applied to any jobs yet.
              <Link to="/jobs" className="link link-primary">
                Browse the job board
              </Link>
            </>
          ) : (
            'No applications in this stage.'
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((a) => (
            <div key={a.id} className="card bg-base-100 shadow-sm">
              <div className="card-body">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <Link to={`/jobs/${a.jobs?.id}`} className="font-semibold link">
                      {a.jobs?.title ?? 'Job closed'}
                    </Link>
                    <div className="mt-0.5 text-sm text-base-content/60">
                      {a.jobs?.companies?.name ?? 'Company'} · Applied {formatDate(a.applied_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge badge-sm ${APPLICATION_BADGE[a.status] ?? 'badge-ghost'}`}>
                      {APPLICATION_STATUS[a.status] ?? a.status}
                    </span>
                    {a.status !== 'WITHDRAWN' && a.status !== 'REJECTED' && a.status !== 'SELECTED' && (
                      <button className="btn btn-sm btn-outline btn-error" disabled={busyId === a.id} onClick={() => withdraw(a.id)}>
                        Withdraw
                      </button>
                    )}
                  </div>
                </div>
                {a.cover_letter && <p className="mt-3 whitespace-pre-wrap text-sm text-base-content/70">{a.cover_letter}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}