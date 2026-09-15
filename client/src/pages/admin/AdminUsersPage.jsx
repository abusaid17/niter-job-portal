import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { USER_STATUS, USER_STATUS_BADGE } from '../../utils/labels'
import { ROLE_LABELS } from '../../utils/roles'
import { formatDateTime } from '../../utils/format'
import { LoadingScreen } from '../../components/ui/LoadingScreen'

export default function AdminUsersPage() {
  const { session } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [recruiters, setRecruiters] = useState({})

  useEffect(() => {
    if (!session?.user?.id) return
    let active = true
    supabase
      .from('users')
      .select('id, name, email, role, status, is_verified, created_at')
      .order('created_at', { ascending: false })
      .then(async ({ data }) => {
        if (!active) return
        let recruits = {}
        const { data: rec } = await supabase.from('recruiters').select('user_id, is_verified')
        for (const r of rec ?? []) recruits[r.user_id] = r.is_verified
        if (active) {
          setRecruiters(recruits)
          setUsers(data ?? [])
          setLoading(false)
        }
      })
    return () => { active = false }
  }, [session])

  const visible = useMemo(() => {
    return users.filter((u) => {
      const q = query.toLowerCase()
      const matchQuery = !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
      const matchRole = roleFilter === 'ALL' || u.role === roleFilter
      const matchStatus = statusFilter === 'ALL' || u.status === statusFilter
      return matchQuery && matchRole && matchStatus
    })
  }, [users, query, roleFilter, statusFilter])

  async function setStatus(userId, status) {
    setBusyId(userId)
    setError(null)
    setNotice(null)
    const { error: e } = await supabase.from('users').update({ status }).eq('id', userId)
    setBusyId(null)
    if (e) {
      setError(e.message)
      return
    }
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status } : u)))
    setNotice({ type: 'success', text: `User ${status === 'SUSPENDED' ? 'suspended' : 'activated'}.` })
  }

  async function approveUser(userId) {
    setBusyId(userId)
    setError(null)
    setNotice(null)
    const { error: e } = await supabase.from('users').update({ status: 'ACTIVE' }).eq('id', userId)
    setBusyId(null)
    if (e) {
      setError(e.message)
      return
    }
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: 'ACTIVE' } : u)))
    setNotice({ type: 'success', text: 'User approved.' })
  }

  async function toggleRecruiterVerified(userId, verified) {
    setBusyId(userId)
    setError(null)
    setNotice(null)
    const { error: e } = await supabase.from('recruiters').update({ is_verified: verified }).eq('user_id', userId)
    setBusyId(null)
    if (e) {
      setError(e.message)
      return
    }
    setRecruiters((prev) => ({ ...prev, [userId]: verified }))
    setNotice({ type: 'success', text: `Recruiter ${verified ? 'verified' : 'unverified'}.` })
  }

  const roles = ['ALL', 'ADMIN', 'STUDENT', 'ALUMNI', 'RECRUITER', 'FACULTY']
  const statuses = ['ALL', 'PENDING', 'ACTIVE', 'SUSPENDED']

  if (loading) return <LoadingScreen />

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">User management</h1>
        <p className="mt-1 text-base-content/70">View, search and manage all portal users.</p>
      </div>

      {error && <div role="alert" className="alert alert-error">{error}</div>}
      {notice && <div role="alert" className={`alert alert-${notice.type}`}>{notice.text}</div>}

      <div className="flex flex-wrap items-center gap-3">
        <input className="input input-bordered w-full max-w-xs" placeholder="Search name or email…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="flex flex-wrap gap-1">
          {roles.map((r) => (
            <button key={r} className={`btn btn-xs ${roleFilter === r ? 'btn-primary' : 'btn-outline'}`} onClick={() => setRoleFilter(r)}>
              {r === 'ALL' ? 'All' : ROLE_LABELS[r] ?? r}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {statuses.map((s) => (
            <button key={s} className={`btn btn-xs ${statusFilter === s ? 'btn-primary' : 'btn-outline'}`} onClick={() => setStatusFilter(s)}>
              {s === 'ALL' ? 'All' : USER_STATUS[s] ?? s}
            </button>
          ))}
        </div>
        <span className="ml-auto text-sm text-base-content/60">{visible.length} shown</span>
      </div>

      {visible.length === 0 ? (
        <div className="card bg-base-100 p-10 text-center text-sm text-base-content/60 shadow-sm">No users found.</div>
      ) : (
        <div className="overflow-x-auto rounded-box bg-base-100 shadow-sm">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="font-medium">{u.name}</div>
                    <div className="text-xs text-base-content/60">{u.email}</div>
                  </td>
                  <td><span className="badge badge-sm badge-outline">{ROLE_LABELS[u.role] ?? u.role}</span></td>
                  <td>
                    <span className={`badge badge-sm ${USER_STATUS_BADGE[u.status] ?? 'badge-ghost'}`}>
                      {USER_STATUS[u.status] ?? u.status}
                    </span>
                  </td>
                  <td className="text-sm text-base-content/70">{formatDateTime(u.created_at)}</td>
                  <td className="text-right">
                    <div className="flex justify-end gap-1">
                      {u.role === 'RECRUITER' && (
                        <button
                          className="btn btn-sm btn-outline"
                          disabled={busyId === u.id}
                          onClick={() => toggleRecruiterVerified(u.id, !recruiters[u.id])}
                        >
                          {busyId === u.id ? <span className="loading loading-spinner loading-sm" /> : recruiters[u.id] ? 'Unverify' : 'Verify recruiter'}
                        </button>
                      )}
                      {u.status === 'PENDING' && (
                        <button className="btn btn-sm btn-outline btn-success" disabled={busyId === u.id} onClick={() => approveUser(u.id)}>
                          {busyId === u.id ? <span className="loading loading-spinner loading-sm" /> : 'Approve'}
                        </button>
                      )}
                      {u.status !== 'SUSPENDED' ? (
                        <button className="btn btn-sm btn-outline btn-error" disabled={busyId === u.id} onClick={() => setStatus(u.id, 'SUSPENDED')}>
                          {busyId === u.id ? <span className="loading loading-spinner loading-sm" /> : 'Suspend'}
                        </button>
                      ) : (
                        <button className="btn btn-sm btn-outline btn-success" disabled={busyId === u.id} onClick={() => setStatus(u.id, 'ACTIVE')}>
                          {busyId === u.id ? <span className="loading loading-spinner loading-sm" /> : 'Activate'}
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