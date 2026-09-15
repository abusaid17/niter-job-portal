import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useAlumniProfile } from '../../hooks/useProfiles'
import { formatDate } from '../../utils/format'
import { LoadingScreen } from '../../components/ui/LoadingScreen'

export default function AlumniReferralsPage() {
  const { session } = useAuth()
  const { profile: alumni, loading: profileLoading } = useAlumniProfile()
  const [referrals, setReferrals] = useState([])
  const [jobs, setJobs] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [form, setForm] = useState({ job_id: '', student_id: '', message: '' })

  useEffect(() => {
    if (!session?.user?.id) return
    let active = true
    async function load() {
      const [refR, jobsR, studR] = await Promise.all([
        supabase
          .from('referrals')
          .select('*, jobs(id, title), students(id, users(name))')
          .eq('alumni_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase.from('jobs').select('id, title, companies(name)').eq('status', 'PUBLISHED').order('created_at', { ascending: false }).limit(200),
        supabase.from('students').select('id, department, batch, users(id, name, email)').limit(500),
      ])
      if (!active) return
      setReferrals(refR.data ?? [])
      setJobs(jobsR.data ?? [])
      setStudents(studR.data ?? [])
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [session])

  const sortedStudents = useMemo(
    () => students.sort((a, b) => (a.users?.name ?? '').localeCompare(b.users?.name ?? '')),
    [students],
  )

  const set = (key) => (e) => {
    setError(null)
    setSuccess(null)
    setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  async function submit(e) {
    e.preventDefault()
    if (!form.job_id || !form.student_id) {
      setError('Select a job and a student to refer.')
      return
    }
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const student = students.find((s) => String(s.id) === String(form.student_id))
      const { error: insError } = await supabase.from('referrals').insert({
        alumni_id: session.user.id,
        student_id: Number(form.student_id),
        job_id: Number(form.job_id),
        message: form.message || null,
      })
      if (insError) throw insError

      if (student?.users?.id) {
        const job = jobs.find((j) => String(j.id) === form.job_id)
        await supabase.rpc('notify_user', {
          p_user_id: student.users.id,
          p_title: 'New referral',
          p_message: `${session.user.email} referred you for ${job?.title ?? 'a job'}.`,
        })
      }

      const { data: ref } = await supabase
        .from('referrals')
        .select('*, jobs(id, title), students(id, users(name))')
        .eq('alumni_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
      setReferrals((prev) => [ref?.[0], ...prev].filter(Boolean))
      setForm({ job_id: '', student_id: '', message: '' })
      setSuccess('Referral submitted.')
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading || profileLoading) {
    return <LoadingScreen />
  }

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Refer a student</h1>
        <p className="mt-1 text-base-content/70">
          Recommend a student for an open vacancy. Referrals never guarantee selection — they put the student in front of the
          recruiter.
        </p>
      </div>

      {!alumni && (
        <div role="alert" className="alert alert-warning">
          <span>Complete your alumni profile before referring students.</span>
          <a href="#/alumni/profile" className="btn btn-sm btn-primary">
            Go to profile
          </a>
        </div>
      )}

      {(error || success) && (
        <div role="alert" className={`alert ${error ? 'alert-error' : 'alert-success'}`}>
          {error ?? success}
        </div>
      )}

      <form onSubmit={submit} className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Open job *</span>
              </label>
              <select className="select select-bordered" required value={form.job_id} onChange={set('job_id')}>
                <option value="">Select a published vacancy…</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title} — {j.companies?.name ?? 'Company'}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Student *</span>
              </label>
              <select className="select select-bordered" required value={form.student_id} onChange={set('student_id')}>
                <option value="">Select a student…</option>
                {sortedStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.users?.name ?? 'Unknown'} — {[s.department, s.batch].filter(Boolean).join(' · ') || 'Student'}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Message to the student (optional)</span>
            </label>
            <textarea className="textarea textarea-bordered" rows={3} value={form.message} onChange={set('message')} placeholder="Why are you recommending them?" />
          </div>
          <div className="mt-2">
            <button className="btn btn-primary" disabled={saving}>
              {saving && <span className="loading loading-spinner loading-sm" />}
              Submit referral
            </button>
          </div>
        </div>
      </form>

      <div>
        <h2 className="text-lg font-bold">My referrals</h2>
        {referrals.length === 0 ? (
          <div className="card mt-3 bg-base-100 p-6 text-center text-sm text-base-content/60 shadow-sm">
            No referrals sent yet.
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {referrals.map((r) => (
              <div key={r.id} className="card bg-base-100 p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-medium">
                      {r.students?.users?.name ?? 'Student'} → {r.jobs?.title ?? 'Job'}
                    </span>
                    <div className="text-xs text-base-content/60">{formatDate(r.created_at)}</div>
                  </div>
                  <span className={`badge badge-sm ${r.status === 'ACCEPTED' ? 'badge-success' : r.status === 'DECLINED' ? 'badge-ghost' : 'badge-info'}`}>
                    {r.status}
                  </span>
                </div>
                {r.message && <p className="mt-2 text-sm text-base-content/70">{r.message}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}