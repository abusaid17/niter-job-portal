import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useAlumniProfile } from '../../hooks/useProfiles'
import { formatDate } from '../../utils/format'
import { LoadingScreen } from '../../components/ui/LoadingScreen'
import { AlertTriangle, Check, CheckCircle2, Clock, Inbox, Send, X } from 'lucide-react'

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
        supabase.from('students').select('id, department, session, users(id, name, email)').limit(500),
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
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 sm:gap-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <Send className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Refer a student</h1>
          <p className="mt-0.5 text-sm text-base-content/60">
            Recommend a student for an open vacancy. Referrals never guarantee selection — they put the student in front of the
            recruiter.
          </p>
        </div>
        {referrals.length > 0 && (
          <span className="badge badge-primary badge-sm ml-auto hidden shrink-0 sm:inline-flex">
            {referrals.length} sent
          </span>
        )}
      </div>

      {!alumni && (
        <div role="alert" className="alert alert-warning shadow-sm">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span className="min-w-0 flex-1 text-sm">Complete your alumni profile before referring students.</span>
          <a href="#/alumni/profile" className="btn btn-sm btn-primary shrink-0">
            Go to profile
          </a>
        </div>
      )}

      {(error || success) && (
        <div role="alert" className={`alert shadow-sm ${error ? 'alert-error' : 'alert-success'}`}>
          {error ? <AlertTriangle className="h-5 w-5 shrink-0" /> : <CheckCircle2 className="h-5 w-5 shrink-0" />}
          <span className="text-sm">{error ?? success}</span>
        </div>
      )}

      <form onSubmit={submit} className="card border border-base-200 bg-base-100 shadow-sm">
        <div className="card-body gap-5 px-5 py-6 sm:px-6">
          <div className="flex items-center gap-3">
            <h2 className="whitespace-nowrap text-sm font-bold uppercase tracking-wider text-base-content/60">
              New referral
            </h2>
            <div className="h-px flex-1 bg-base-200" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="form-control w-full">
              <label className="label pb-1">
                <span className="label-text text-sm font-medium">Open job <span className="text-error">*</span></span>
                <span className="label-text-alt text-base-content/50">{jobs.length} published</span>
              </label>
              <select className="select select-bordered w-full" required value={form.job_id} onChange={set('job_id')}>
                <option value="">Select a published vacancy…</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title} — {j.companies?.name ?? 'Company'}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-control w-full">
              <label className="label pb-1">
                <span className="label-text text-sm font-medium">Student <span className="text-error">*</span></span>
                <span className="label-text-alt text-base-content/50">{sortedStudents.length} students</span>
              </label>
              <select className="select select-bordered w-full" required value={form.student_id} onChange={set('student_id')}>
                <option value="">Select a student…</option>
                {sortedStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.users?.name ?? 'Unknown'} — {[s.department, s.session].filter(Boolean).join(' · ') || 'Student'}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-control w-full">
            <label className="label pb-1">
              <span className="label-text text-sm font-medium">Message to the student</span>
              <span className="label-text-alt text-base-content/50">optional</span>
            </label>
            <textarea className="textarea textarea-bordered min-h-24 w-full" rows={3} value={form.message} onChange={set('message')} placeholder="Why are you recommending them? Mention strengths relevant to the role…" />
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-base-200 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setForm({ job_id: '', student_id: '', message: '' })}
              disabled={saving}
            >
              <X className="h-4 w-4" />
              Clear
            </button>
            <button className="btn btn-primary" disabled={saving}>
              {saving ? <span className="loading loading-spinner loading-sm" /> : <Send className="h-4 w-4" />}
              {saving ? 'Submitting…' : 'Submit referral'}
            </button>
          </div>
        </div>
      </form>

      <section>
        <div className="flex items-center gap-3">
          <h2 className="whitespace-nowrap text-sm font-bold uppercase tracking-wider text-base-content/60">
            My referrals
          </h2>
          <div className="h-px flex-1 bg-base-200" />
          {referrals.length > 0 && (
            <span className="badge badge-ghost badge-sm shrink-0">{referrals.length}</span>
          )}
        </div>
        {referrals.length === 0 ? (
          <div className="card mt-3 border border-dashed border-base-300 bg-base-100 shadow-sm">
            <div className="card-body items-center py-10 text-center">
              <div className="rounded-full bg-base-200 p-4 text-base-content/50">
                <Inbox className="h-7 w-7" />
              </div>
              <p className="mt-2 font-semibold">No referrals sent yet</p>
              <p className="max-w-sm text-sm text-base-content/60">
                Pick a published vacancy and a student above to send your first referral.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {referrals.map((r) => {
              const studentName = r.students?.users?.name ?? 'Student'
              return (
                <div key={r.id} className="card border border-base-200 bg-base-100 p-4 shadow-sm transition hover:border-primary/30 hover:shadow">
                  <div className="flex items-start gap-3">
                    <div className="avatar placeholder shrink-0">
                      <div className="w-10 rounded-full bg-primary/10 text-primary">
                        <span className="text-sm font-bold">{studentName.trim().charAt(0).toUpperCase()}</span>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">
                        {studentName} <span className="font-normal text-base-content/50">→</span> {r.jobs?.title ?? 'Job'}
                      </p>
                      <p className="mt-0.5 text-xs text-base-content/50">{formatDate(r.created_at)}</p>
                      {r.message && <p className="mt-1.5 whitespace-pre-wrap break-words text-sm text-base-content/70">{r.message}</p>}
                    </div>
                    <span className={`badge badge-sm shrink-0 gap-1 ${r.status === 'ACCEPTED' ? 'badge-success' : r.status === 'DECLINED' ? 'badge-ghost' : 'badge-info'}`}>
                      {r.status === 'ACCEPTED' ? <Check className="h-3 w-3" /> : r.status === 'DECLINED' ? <X className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                      {r.status}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}