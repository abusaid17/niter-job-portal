import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { formatDateTime } from '../../utils/format'
import { USER_STATUS, USER_STATUS_BADGE } from '../../utils/labels'

const COMPANY_BADGE = { PENDING: 'badge-warning', VERIFIED: 'badge-success', REJECTED: 'badge-error' }

function Row({ label, value, link }) {
  if (value == null || value === '') return null
  return (
    <div className="flex flex-col gap-0.5 py-1.5 sm:flex-row sm:items-start sm:gap-3">
      <span className="w-36 shrink-0 text-xs font-medium uppercase tracking-wide text-base-content/50">{label}</span>
      {link ? (
        <a href={link} target="_blank" rel="noreferrer" className="link link-primary break-all text-sm">
          {value}
        </a>
      ) : (
        <span className="min-w-0 flex-1 break-words text-sm">{value}</span>
      )}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="rounded-box border border-base-200 bg-base-100 p-4">
      <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-base-content/60">{title}</h3>
      {children}
    </div>
  )
}

export function RecruiterProfileModal({ userId, companyId, open, onClose, onUpdated }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [user, setUser] = useState(null)
  const [recruiter, setRecruiter] = useState(null)
  const [company, setCompany] = useState(null)
  const [linkedRecruiters, setLinkedRecruiters] = useState([])
  const [jobs, setJobs] = useState([])
  const [busy, setBusy] = useState(null)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    if (!open) return
    setUser(null)
    setRecruiter(null)
    setCompany(null)
    setLinkedRecruiters([])
    setJobs([])
    setError(null)
    setNotice(null)
    let active = true
    async function load() {
      setLoading(true)
      try {
        if (userId) {
          const { data: u, error: uErr } = await supabase
            .from('users')
            .select('id, name, email, role, status, is_verified, created_at')
            .eq('id', userId)
            .maybeSingle()
          if (uErr) throw uErr
          if (!active) return
          setUser(u ?? null)

          const { data: r, error: rErr } = await supabase
            .from('recruiters')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle()
          if (rErr) throw rErr
          if (!active) return
          setRecruiter(r ?? null)

          const cId = r?.company_id
          if (cId) {
            const { data: c, error: cErr } = await supabase.from('companies').select('*').eq('id', cId).maybeSingle()
            if (cErr) throw cErr
            if (!active) return
            setCompany(c ?? null)
            const { data: j } = await supabase
              .from('jobs')
              .select('id, title, status, employment_type, location, created_at')
              .eq('company_id', cId)
              .order('created_at', { ascending: false })
              .limit(20)
            if (active) setJobs(j ?? [])
          } else {
            const { data: j } = await supabase
              .from('jobs')
              .select('id, title, status, employment_type, location, created_at')
              .eq('posted_by', userId)
              .order('created_at', { ascending: false })
              .limit(20)
            if (active) setJobs(j ?? [])
          }
        } else if (companyId) {
          const { data: c, error: cErr } = await supabase.from('companies').select('*').eq('id', companyId).maybeSingle()
          if (cErr) throw cErr
          if (!active) return
          setCompany(c ?? null)

          const { data: recs } = await supabase
            .from('recruiters')
            .select('*, users(id, name, email, status, is_verified, created_at)')
            .eq('company_id', companyId)
          if (active) setLinkedRecruiters(recs ?? [])

          // Creator account (created_by) — useful when no recruiter row is linked yet
          if (c?.created_by) {
            const { data: creator } = await supabase
              .from('users')
              .select('id, name, email, role, status, is_verified, created_at')
              .eq('id', c.created_by)
              .maybeSingle()
            if (active) setUser(creator ?? null)
          }

          const { data: j } = await supabase
            .from('jobs')
            .select('id, title, status, employment_type, location, created_at')
            .eq('company_id', companyId)
            .order('created_at', { ascending: false })
            .limit(20)
          if (active) setJobs(j ?? [])
        }
      } catch (e) {
        if (active) setError(e.message)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [open, userId, companyId])

  if (!open) return null

  const logo = company?.logo_url ?? company?.logo
  const companyName = company?.name ?? recruiter?.company_id ? company?.name : null

  async function verifyRecruiterByUser(targetUserId, verified) {
    setBusy(`rec-${targetUserId}`)
    setError(null)
    setNotice(null)
    const { error: e } = await supabase.from('recruiters').update({ is_verified: verified }).eq('user_id', targetUserId)
    setBusy(null)
    if (e) {
      setError(e.message)
      return
    }
    setRecruiter((prev) => (prev && prev.user_id === targetUserId ? { ...prev, is_verified: verified } : prev))
    setLinkedRecruiters((prev) => prev.map((r) => (r.user_id === targetUserId ? { ...r, is_verified: verified } : r)))
    setNotice({ type: 'success', text: verified ? 'Recruiter verified.' : 'Recruiter unverified.' })
    onUpdated?.({ type: 'recruiter', userId: targetUserId, is_verified: verified })
  }

  async function verifyCompany(targetCompanyId, status) {
    setBusy(`com-${targetCompanyId}`)
    setError(null)
    setNotice(null)
    const { error: e } = await supabase.from('companies').update({ verification_status: status }).eq('id', targetCompanyId)
    setBusy(null)
    if (e) {
      setError(e.message)
      return
    }
    setCompany((prev) => (prev && prev.id === targetCompanyId ? { ...prev, verification_status: status } : prev))
    setNotice({ type: 'success', text: status === 'VERIFIED' ? 'Company verified.' : 'Company rejected.' })
    onUpdated?.({ type: 'company', companyId: targetCompanyId, verification_status: status })
  }

  async function approveUser(targetUserId) {
    setBusy(`user-${targetUserId}`)
    setError(null)
    setNotice(null)
    const { error: e } = await supabase.from('users').update({ status: 'ACTIVE' }).eq('id', targetUserId)
    setBusy(null)
    if (e) {
      setError(e.message)
      return
    }
    setUser((prev) => (prev && prev.id === targetUserId ? { ...prev, status: 'ACTIVE' } : prev))
    setNotice({ type: 'success', text: 'User account approved (ACTIVE).' })
    onUpdated?.({ type: 'user', userId: targetUserId, status: 'ACTIVE' })
  }

  const showRecruiterSection = Boolean(recruiter) || user?.role === 'RECRUITER'

  return (
    <dialog className="modal" open>
      <div className="modal-box max-w-3xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold">Recruiter profile</h3>
            <p className="text-sm text-base-content/60">
              Review account details before verifying. Verify only if company &amp; recruiter look legitimate.
            </p>
          </div>
          <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {error && <div role="alert" className="alert alert-error mt-3 text-sm">{error}</div>}
        {notice && <div role="alert" className={`alert alert-${notice.type} mt-3 text-sm`}>{notice.text}</div>}

        {loading ? (
          <div className="flex justify-center py-10">
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {user && (
              <Section title="Account">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-semibold">{user.name}</span>
                  <span className={`badge badge-sm ${USER_STATUS_BADGE[user.status] ?? 'badge-ghost'}`}>
                    {USER_STATUS[user.status] ?? user.status}
                  </span>
                  {user.role === 'RECRUITER' && recruiter && (
                    <span className={`badge badge-sm ${recruiter.is_verified ? 'badge-success' : 'badge-warning'}`}>
                      {recruiter.is_verified ? 'Recruiter verified' : 'Recruiter pending'}
                    </span>
                  )}
                </div>
                <div className="divider my-1" />
                <Row label="Email" value={user.email} />
                <Row label="Role" value={user.role} />
                <Row label="Joined" value={formatDateTime(user.created_at)} />
                {user.status === 'PENDING' && (
                  <div className="mt-2">
                    <button
                      className="btn btn-sm btn-success"
                      disabled={busy === `user-${user.id}`}
                      onClick={() => approveUser(user.id)}
                    >
                      {busy === `user-${user.id}` ? <span className="loading loading-spinner loading-sm" /> : 'Approve account'}
                    </button>
                  </div>
                )}
              </Section>
            )}

            {showRecruiterSection && (
              <Section title="Recruiter details">
                {recruiter ? (
                  <>
                    <Row label="Designation" value={recruiter.designation ?? '—'} />
                    <Row label="Company ID" value={recruiter.company_id ? String(recruiter.company_id) : 'Not linked'} />
                    <Row label="Verified" value={recruiter.is_verified ? 'Yes' : 'No'} />
                    <Row label="Profile updated" value={formatDateTime(recruiter.updated_at ?? recruiter.created_at)} />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        className="btn btn-sm btn-success"
                        disabled={busy === `rec-${recruiter.user_id}`}
                        onClick={() => verifyRecruiterByUser(recruiter.user_id, true)}
                      >
                        {busy === `rec-${recruiter.user_id}` ? <span className="loading loading-spinner loading-sm" /> : 'Verify recruiter'}
                      </button>
                      <button
                        className="btn btn-sm btn-outline"
                        disabled={busy === `rec-${recruiter.user_id}`}
                        onClick={() => verifyRecruiterByUser(recruiter.user_id, false)}
                      >
                        Unverify
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-base-content/60">
                    No recruiter row linked to this account yet. Ask the user to complete the company profile, or verify the company below.
                  </p>
                )}
              </Section>
            )}

            {company ? (
              <Section title="Company details">
                <div className="flex items-start gap-3">
                  {logo && <img src={logo} alt={company.name} className="h-12 w-12 rounded-box border border-base-200 object-contain" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-semibold">{company.name}</span>
                      <span className={`badge badge-sm ${COMPANY_BADGE[company.verification_status] ?? 'badge-ghost'}`}>
                        {company.verification_status}
                      </span>
                    </div>
                    <p className="text-xs text-base-content/60">
                      {[company.industry, company.location, company.company_size].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>
                <div className="divider my-1" />
                <Row label="Industry" value={company.industry} />
                <Row label="Location" value={company.location} />
                <Row label="Size" value={company.company_size} />
                <Row label="Website" value={company.website} link={company.website} />
                <Row label="Created" value={formatDateTime(company.created_at)} />
                {company.description && (
                  <div className="mt-1">
                    <span className="text-xs font-medium uppercase tracking-wide text-base-content/50">Description</span>
                    <p className="mt-0.5 whitespace-pre-wrap text-sm">{company.description}</p>
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {company.verification_status !== 'VERIFIED' && (
                    <button
                      className="btn btn-sm btn-success"
                      disabled={busy === `com-${company.id}`}
                      onClick={() => verifyCompany(company.id, 'VERIFIED')}
                    >
                      {busy === `com-${company.id}` ? <span className="loading loading-spinner loading-sm" /> : 'Verify company'}
                    </button>
                  )}
                  {company.verification_status !== 'REJECTED' && (
                    <button
                      className="btn btn-sm btn-outline btn-error"
                      disabled={busy === `com-${company.id}`}
                      onClick={() => verifyCompany(company.id, 'REJECTED')}
                    >
                      Reject company
                    </button>
                  )}
                </div>
              </Section>
            ) : (
              <Section title="Company details">
                <p className="text-sm text-base-content/60">No company linked yet{companyName ? `: ${companyName}` : '.'}</p>
              </Section>
            )}

            {companyId && linkedRecruiters.length > 0 && (
              <Section title={`Linked recruiters (${linkedRecruiters.length})`}>
                <div className="flex flex-col gap-2">
                  {linkedRecruiters.map((r) => (
                    <div key={r.user_id} className="flex flex-wrap items-center justify-between gap-2 rounded-box bg-base-200/50 px-3 py-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{r.users?.name ?? r.user_id}</div>
                        <div className="truncate text-xs text-base-content/60">
                          {r.users?.email} · {r.designation ?? 'Recruiter'} · {r.is_verified ? 'Verified' : 'Pending'}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          className="btn btn-xs btn-success"
                          disabled={busy === `rec-${r.user_id}`}
                          onClick={() => verifyRecruiterByUser(r.user_id, true)}
                        >
                          Verify
                        </button>
                        <button
                          className="btn btn-xs btn-outline"
                          disabled={busy === `rec-${r.user_id}`}
                          onClick={() => verifyRecruiterByUser(r.user_id, false)}
                        >
                          Unverify
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            <Section title={`Jobs posted (${jobs.length})`}>
              {jobs.length === 0 ? (
                <p className="text-sm text-base-content/60">No jobs posted yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Status</th>
                        <th>Location</th>
                        <th>Posted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobs.map((j) => (
                        <tr key={j.id}>
                          <td className="font-medium">{j.title}</td>
                          <td><span className="badge badge-sm badge-outline">{j.status}</span></td>
                          <td className="text-xs">{j.location ?? '—'}</td>
                          <td className="whitespace-nowrap text-xs">{formatDateTime(j.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>
          </div>
        )}

        <div className="modal-action">
          <button className="btn btn-outline" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </dialog>
  )
}
