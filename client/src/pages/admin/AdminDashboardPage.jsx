import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { LoadingScreen } from '../../components/ui/LoadingScreen'

function StatTile({ label, value, to }) {
  const inner = (
    <div className="card bg-base-100 p-5 text-center shadow-sm transition hover:shadow-md">
      <div className="text-4xl font-extrabold text-primary">{value}</div>
      <div className="mt-1 text-sm text-base-content/70">{label}</div>
    </div>
  )
  return to ? <Link to={to}>{inner}</Link> : inner
}

export default function AdminDashboardPage() {
  const { profile: user } = useAuth()
  const [counts, setCounts] = useState({})
  const [pendingJobs, setPendingJobs] = useState([])
  const [pendingCompanies, setPendingCompanies] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let active = true
    Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'STUDENT'),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'ALUMNI'),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'RECRUITER'),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'FACULTY'),
      supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'PUBLISHED'),
      supabase.from('jobs').select('id, title, source_type, created_at, users!posted_by(name)').eq('status', 'PENDING_APPROVAL').order('created_at', { ascending: false }).limit(5),
      supabase.from('companies').select('id, name, created_at').eq('verification_status', 'PENDING').order('created_at', { ascending: false }).limit(5),
      supabase.from('interviews').select('id', { count: 'exact', head: true }).eq('status', 'SCHEDULED'),
      supabase.from('applications').select('id', { count: 'exact', head: true }).eq('status', 'SELECTED'),
    ]).then(([sR, aR, rR, fR, jR, pjR, pcR, iR, apR]) => {
      if (!active) return
      setCounts({
        students: sR.count ?? 0,
        alumni: aR.count ?? 0,
        recruiters: rR.count ?? 0,
        faculty: fR.count ?? 0,
        activeJobs: jR.count ?? 0,
        interviews: iR.count ?? 0,
        selected: apR.count ?? 0,
      })
      setPendingJobs(pjR.data ?? [])
      setPendingCompanies(pcR.data ?? [])
      setLoading(false)
    })
    return () => { active = false }
  }, [user])

  if (loading) return <LoadingScreen />

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="mt-1 text-base-content/70">System overview and pending actions.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Students" value={counts.students} to="/admin/users" />
        <StatTile label="Alumni" value={counts.alumni} to="/admin/users" />
        <StatTile label="Recruiters" value={counts.recruiters} to="/admin/users" />
        <StatTile label="Faculty" value={counts.faculty} to="/admin/users" />
        <StatTile label="Active jobs" value={counts.activeJobs} to="/admin/jobs" />
        <StatTile label="Scheduled interviews" value={counts.interviews} to="/admin/interviews" />
        <StatTile label="Selected candidates" value={counts.selected} to="/admin/applications" />
      </div>

      {(pendingJobs.length > 0 || pendingCompanies.length > 0) && (
        <div role="alert" className="alert alert-warning">
          <span>
            {pendingJobs.length} job{pendingJobs.length !== 1 ? 's' : ''} awaiting approval
            {pendingCompanies.length > 0 && `, ${pendingCompanies.length} companies pending verification`}.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Jobs pending approval</h2>
            <Link to="/admin/jobs" className="link link-primary text-sm">View all</Link>
          </div>
          {pendingJobs.length === 0 ? (
            <div className="card mt-3 bg-base-100 p-6 text-center text-sm text-base-content/60 shadow-sm">
              No jobs pending approval.
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              {pendingJobs.map((j) => (
                <div key={j.id} className="card bg-base-100 p-4 shadow-sm">
                  <div className="font-medium">{j.title}</div>
                  <div className="text-sm text-base-content/60">
                    by {j.users?.name ?? 'Unknown'} · {j.source_type}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Companies pending verification</h2>
            <Link to="/admin/companies" className="link link-primary text-sm">View all</Link>
          </div>
          {pendingCompanies.length === 0 ? (
            <div className="card mt-3 bg-base-100 p-6 text-center text-sm text-base-content/60 shadow-sm">
              No companies pending verification.
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              {pendingCompanies.map((c) => (
                <div key={c.id} className="card bg-base-100 p-4 shadow-sm">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-sm text-base-content/60">Registered {new Date(c.created_at).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}