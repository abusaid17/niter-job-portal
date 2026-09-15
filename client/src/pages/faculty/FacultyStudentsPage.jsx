import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { LoadingScreen } from '../../components/ui/LoadingScreen'

export default function FacultyStudentsPage() {
  const { session } = useAuth()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!session?.user?.id) return
    let active = true
    supabase
      .from('students')
      .select('id, student_id, department, batch, semester, cgpa, users(id, name, email, is_verified)')
      .order('id')
      .then(({ data }) => {
        if (active) {
          setStudents(data ?? [])
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [session])

  async function toggleVerify(student) {
    if (!student.users?.id) return
    setBusyId(student.id)
    setError(null)
    const verified = !student.users.is_verified
    const { error: e } = await supabase
      .from('users')
      .update({ is_verified: verified })
      .eq('id', student.users.id)
    setBusyId(null)
    if (e) {
      setError(e.message)
      return
    }
    if (verified) {
      await supabase.rpc('notify_user', {
        p_user_id: student.users.id,
        p_title: 'Profile verified',
        p_message: 'Your student profile has been verified by the faculty.',
      })
    }
    setStudents((prev) => prev.map((s) => (s.id === student.id ? { ...s, users: { ...s.users, is_verified: verified } } : s)))
  }

  const visible = useMemo(() => {
    return students.filter((s) => {
      const name = (s.users?.name ?? '').toLowerCase()
      const sid = (s.student_id ?? '').toLowerCase()
      const dept = (s.department ?? '').toLowerCase()
      const q = query.toLowerCase()
      const matchesQuery = !q || name.includes(q) || sid.includes(q) || dept.includes(q)
      const matchesFilter =
        statusFilter === 'ALL' ||
        (statusFilter === 'VERIFIED' && s.users?.is_verified) ||
        (statusFilter === 'PENDING' && !s.users?.is_verified)
      return matchesQuery && matchesFilter
    })
  }, [students, query, statusFilter])

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Student profiles</h1>
        <p className="mt-1 text-base-content/70">Review and verify student accounts so they can use the full portal.</p>
      </div>

      {error && (
        <div role="alert" className="alert alert-error">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input className="input input-bordered w-full max-w-xs" placeholder="Search name / ID / department…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="flex gap-2">
          {['ALL', 'PENDING', 'VERIFIED'].map((f) => (
            <button key={f} className={`btn btn-sm ${statusFilter === f ? 'btn-primary' : 'btn-outline'}`} onClick={() => setStatusFilter(f)}>
              {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <span className="ml-auto text-sm text-base-content/60">{visible.length} shown</span>
      </div>

      {visible.length === 0 ? (
        <div className="card bg-base-100 p-10 text-center text-sm text-base-content/60 shadow-sm">
          No students found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-box bg-base-100 shadow-sm">
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Department / Batch</th>
                <th>CGPA</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className="font-medium">{s.users?.name ?? 'Unknown'}</div>
                    <div className="text-xs text-base-content/60">{s.student_id ?? ''} · {s.users?.email}</div>
                  </td>
                  <td className="text-sm text-base-content/70">
                    {[s.department, s.batch].filter(Boolean).join(' · ') || '—'}
                  </td>
                  <td className="text-sm">{s.cgpa != null ? Number(s.cgpa).toFixed(2) : '—'}</td>
                  <td>
                    <span className={`badge badge-sm ${s.users?.is_verified ? 'badge-success' : 'badge-warning'}`}>
                      {s.users?.is_verified ? 'Verified' : 'Pending'}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link to={`/faculty/students/${s.id}`} className="btn btn-sm btn-neutral">
                        Review
                      </Link>
                      <button className={`btn btn-sm ${s.users?.is_verified ? 'btn-outline' : 'btn-success'}`} disabled={busyId === s.id} onClick={() => toggleVerify(s)}>
                        {busyId === s.id ? <span className="loading loading-spinner loading-sm" /> : s.users?.is_verified ? 'Unverify' : 'Verify'}
                      </button>
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