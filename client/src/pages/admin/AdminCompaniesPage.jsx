import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { formatDateTime } from '../../utils/format'
import { LoadingScreen } from '../../components/ui/LoadingScreen'

const VERIFICATION = { PENDING: 'Pending', VERIFIED: 'Verified', REJECTED: 'Rejected' }
const VBADGE = { PENDING: 'badge-warning', VERIFIED: 'badge-success', REJECTED: 'badge-error' }

export default function AdminCompaniesPage() {
  const { session } = useAuth()
  const [companies, setCompanies] = useState([])
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
      .from('companies')
      .select('id, name, industry, location, company_size, verification_status, created_at, users!created_by(name, email)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (active) {
          setCompanies(data ?? [])
          setLoading(false)
        }
      })
    return () => { active = false }
  }, [session])

  const visible = useMemo(() => {
    return companies.filter((c) => {
      const q = query.toLowerCase()
      const matchQ = !q || c.name?.toLowerCase().includes(q) || c.industry?.toLowerCase().includes(q) || c.location?.toLowerCase().includes(q)
      const matchS = statusFilter === 'ALL' || c.verification_status === statusFilter
      return matchQ && matchS
    })
  }, [companies, query, statusFilter])

  async function updateVerification(companyId, status) {
    setBusyId(companyId)
    setError(null)
    setNotice(null)
    const { error: e } = await supabase.from('companies').update({ verification_status: status }).eq('id', companyId)
    setBusyId(null)
    if (e) {
      setError(e.message)
      return
    }
    setCompanies((prev) => prev.map((c) => (c.id === companyId ? { ...c, verification_status: status } : c)))
    setNotice({ type: 'success', text: `Company ${status === 'VERIFIED' ? 'verified' : 'rejected'}.` })
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Company verification</h1>
        <p className="mt-1 text-base-content/70">Review and verify recruiter companies.</p>
      </div>

      {error && <div role="alert" className="alert alert-error">{error}</div>}
      {notice && <div role="alert" className={`alert alert-${notice.type}`}>{notice.text}</div>}

      <div className="flex flex-wrap items-center gap-3">
        <input className="input input-bordered w-full max-w-xs" placeholder="Search name, industry, location…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="flex gap-1">
          {['ALL', 'PENDING', 'VERIFIED', 'REJECTED'].map((s) => (
            <button key={s} className={`btn btn-xs ${statusFilter === s ? 'btn-primary' : 'btn-outline'}`} onClick={() => setStatusFilter(s)}>
              {s === 'ALL' ? 'All' : VERIFICATION[s]}
            </button>
          ))}
        </div>
        <span className="ml-auto text-sm text-base-content/60">{visible.length} shown</span>
      </div>

      {visible.length === 0 ? (
        <div className="card bg-base-100 p-10 text-center text-sm text-base-content/60 shadow-sm">No companies found.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((c) => (
            <div key={c.id} className="card bg-base-100 shadow-sm">
              <div className="card-body">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="card-title text-base">{c.name}</h2>
                    <p className="text-sm text-base-content/60">{[c.industry, c.location, c.company_size].filter(Boolean).join(' · ')}</p>
                  </div>
                  <span className={`badge badge-sm ${VBADGE[c.verification_status] ?? 'badge-ghost'}`}>
                    {VERIFICATION[c.verification_status] ?? c.verification_status}
                  </span>
                </div>
                <div className="mt-2 text-xs text-base-content/50">
                  Created by {c.users?.name ?? 'Unknown'} · {formatDateTime(c.created_at)}
                </div>
                <div className="card-actions mt-3 justify-end">
                  {c.verification_status !== 'VERIFIED' && (
                    <button className="btn btn-sm btn-success" disabled={busyId === c.id} onClick={() => updateVerification(c.id, 'VERIFIED')}>
                      {busyId === c.id ? <span className="loading loading-spinner loading-sm" /> : 'Verify'}
                    </button>
                  )}
                  {c.verification_status !== 'REJECTED' && (
                    <button className="btn btn-sm btn-outline btn-error" disabled={busyId === c.id} onClick={() => updateVerification(c.id, 'REJECTED')}>
                      Reject
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}