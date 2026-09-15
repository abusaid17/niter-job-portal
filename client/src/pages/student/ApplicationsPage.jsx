import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useStudentProfile } from '../../hooks/useProfiles'
import { APPLICATION_BADGE, APPLICATION_COLORS, APPLICATION_STATUS } from '../../utils/labels'
import { formatDate } from '../../utils/format'
import { LoadingScreen } from '../../components/ui/LoadingScreen'

const STATUSES = ['ALL', ...Object.keys(APPLICATION_STATUS)]

export default function ApplicationsPage() {
  const { profile, loading: profileLoading } = useStudentProfile()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState('ALL')

  useEffect(() => {
    if (!profile?.id) {
      setLoading(false)
      return
    }
    let active = true
    async function load() {
      const { data, error } = await supabase
        .from('applications')
        .select('*, jobs(id, title, posted_by, companies(name))')
        .order('applied_at', { ascending: false })
      if (!active) return
      if (error) setError(error.message)
      else setItems(data ?? [])
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [profile?.id])

  const counts = useMemo(() => {
    const c = {}
    for (const s of Object.keys(APPLICATION_STATUS)) c[s] = 0
    for (const item of items) c[item.status] = (c[item.status] ?? 0) + 1
    return c
  }, [items])

  const filtered = status === 'ALL' ? items : items.filter((a) => a.status === status)

  async function messageRecruiter(a) {
    const userId = a.jobs?.posted_by
    if (!userId) return
    const { data, error } = await supabase.rpc('start_conversation', { p_other_user: userId })
    if (error) {
      setError(error.message)
      return
    }
    navigate(`/messages/${data}`)
  }

  if (profileLoading) {
    return <LoadingScreen />
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">My Applications</h1>
      <p className="text-sm text-base-content/70">Track the status of every role you have applied to.</p>

      {!profile?.id ? (
        <div className="alert alert-warning mt-6">
          Complete your student profile to start applying for jobs.
        </div>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                className={`btn btn-sm ${status === s ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setStatus(s)}
              >
                {s === 'ALL' ? 'All' : APPLICATION_STATUS[s]}
                {s !== 'ALL' && counts[s] > 0 && <span className="badge badge-neutral badge-sm">{counts[s]}</span>}
              </button>
            ))}
          </div>

          {error && (
            <div role="alert" className="alert alert-error mt-4 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="mt-10 flex justify-center">
              <span className="loading loading-spinner loading-lg text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="mt-10 text-center text-base-content/60">
              No applications here yet.{' '}
              <Link to="/jobs" className="link link-primary">
                Browse jobs
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-box bg-base-100 shadow-sm">
              <table className="table">
                <thead>
                  <tr>
                    <th>Job</th>
                    <th>Company</th>
                    <th>Applied</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => (
                    <tr key={a.id}>
                      <td>
                        {a.jobs ? (
                          <Link to={`/jobs/${a.jobs.id}`} className="link font-medium">
                            {a.jobs.title}
                          </Link>
                        ) : (
                          <span className="text-base-content/60">Job removed</span>
                        )}
                        {a.cover_letter && (
                          <div className="mt-0.5 max-w-md truncate text-xs text-base-content/50">
                            {a.cover_letter}
                          </div>
                        )}
                      </td>
                      <td className="text-base-content/70">{a.jobs?.companies?.name ?? '—'}</td>
                      <td className="text-sm text-base-content/70">{formatDate(a.applied_at)}</td>
                      <td>
                        <span className={`badge badge-sm ${APPLICATION_BADGE[a.status] ?? 'badge-ghost'}`}>
                          {APPLICATION_STATUS[a.status] ?? a.status}
                        </span>
                        <span className={`block text-xs ${APPLICATION_COLORS[a.status] ?? ''}`}>
                          {counts[a.status]} total
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          disabled={!a.jobs?.posted_by}
                          onClick={() => messageRecruiter(a)}
                        >
                          Message
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}