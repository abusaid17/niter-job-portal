import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { formatDate } from '../../utils/format'
import { openCv } from '../../utils/cv'
import { LoadingScreen } from '../../components/ui/LoadingScreen'

function Section({ title, children }) {
  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        <h2 className="card-title text-base">{title}</h2>
        {children}
      </div>
    </div>
  )
}

function RecommendModal({ open, student, onClose, onDone }) {
  const { session } = useAuth()
  const [jobs, setJobs] = useState([])
  const [form, setForm] = useState({ job_id: '', message: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    supabase.from('jobs').select('id, title').eq('status', 'PUBLISHED').order('created_at', { ascending: false }).limit(100).then(({ data }) => {
      setJobs(data ?? [])
    })
  }, [open])

  if (!open) return null

  async function submit(e) {
    e.preventDefault()
    if (!form.job_id) {
      setError('Select a job to recommend for.')
      return
    }
    setSaving(true)
    setError(null)
    const { error: err } = await supabase.from('recommendations').insert({
      faculty_id: session.user.id,
      student_id: student.id,
      job_id: Number(form.job_id),
      message: form.message || null,
    })
    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }
    if (student.user_id) {
      await supabase.rpc('notify_user', {
        p_user_id: student.user_id,
        p_title: 'Faculty recommendation',
        p_message: `A faculty member has recommended you for a role.`,
      })
    }
    onDone()
    setForm({ job_id: '', message: '' })
    onClose()
  }

  return (
    <dialog className="modal" open>
      <div className="modal-box">
        <h3 className="font-bold text-lg">Recommend a student</h3>
        <p className="text-sm text-base-content/70">Recommend for a published vacancy. Students see this on their dashboard.</p>
        {error && (
          <div role="alert" className="alert alert-error mt-3 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Open job *</span>
            </label>
            <select className="select select-bordered" required value={form.job_id} onChange={(e) => setForm((f) => ({ ...f, job_id: e.target.value }))}>
              <option value="">Select a published vacancy…</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </select>
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Message (optional)</span>
            </label>
            <textarea className="textarea textarea-bordered" rows={3} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} placeholder="Why is this student a good fit?" />
          </div>
          <div className="modal-action">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary" disabled={saving}>
              {saving && <span className="loading loading-spinner loading-sm" />}
              Submit recommendation
            </button>
          </div>
        </form>
      </div>
    </dialog>
  )
}

export default function FacultyStudentReviewPage() {
  const { studentId } = useParams()
  const { session } = useAuth()
  const [student, setStudent] = useState(null)
  const [cvs, setCvs] = useState([])
  const [education, setEducation] = useState([])
  const [experience, setExperience] = useState([])
  const [projects, setProjects] = useState([])
  const [skills, setSkills] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [recommending, setRecommending] = useState(false)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    if (!session?.user?.id) return
    let active = true
    async function load() {
      const stR = await supabase.from('students').select('*, users(id, name, email, is_verified)').eq('id', studentId).maybeSingle()
      if (!active) return
      if (stR.error) {
        setError(stR.error.message)
        setLoading(false)
        return
      }
      setStudent(stR.data ?? null)
      const sid = stR.data?.id
      if (sid) {
        const [cvR, edR, exR, prR, skR] = await Promise.all([
          supabase.from('cvs').select('id, title, file_path').eq('student_id', sid).order('is_default', { ascending: false }),
          supabase.from('education').select('*').eq('student_id', sid).order('start_year', { ascending: false }),
          supabase.from('experience').select('*').eq('student_id', sid).order('start_date', { ascending: false }),
          supabase.from('projects').select('*').eq('student_id', sid).order('start_year', { ascending: false }),
          supabase.from('student_skills').select('*, skills(name)').eq('student_id', sid),
        ])
        if (active) {
          setCvs(cvR.data ?? [])
          setEducation(edR.data ?? [])
          setExperience(exR.data ?? [])
          setProjects(prR.data ?? [])
          setSkills(skR.data ?? [])
        }
      }
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [session, studentId])

  if (loading) {
    return <LoadingScreen />
  }

  if (!student) {
    return (
      <div role="alert" className="alert alert-error max-w-xl">
        {error ?? 'Student not found.'}
      </div>
    )
  }

  const user = student.users ?? {}

  async function setVerification(verified) {
    if (!user.id) return
    setBusy(true)
    setError(null)
    setNotice(null)
    const { error: e } = await supabase.from('users').update({ is_verified: verified }).eq('id', user.id)
    if (e) {
      setError(e.message)
      setBusy(false)
      return
    }
    if (verified) {
      await supabase.rpc('notify_user', {
        p_user_id: user.id,
        p_title: 'Profile verified',
        p_message: 'Your student profile has been verified by the faculty.',
      })
    } else {
      await supabase.rpc('notify_user', {
        p_user_id: user.id,
        p_title: 'Profile not verified',
        p_message: 'Your student profile verification was not approved. Please review your information and try again.',
      })
    }
    setBusy(false)
    setStudent((prev) => (prev ? { ...prev, users: { ...prev.users, is_verified: verified } } : prev))
    setNotice({ type: 'success', text: verified ? 'Profile verified.' : 'Profile rejected.' })
  }

  const recommendTarget = { id: student.id, user_id: user.id }

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/faculty/students" className="link link-primary text-sm">
            ← Back to students
          </Link>
          <h1 className="mt-1 text-3xl font-bold">{user.name ?? 'Student'}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-base-content/70">
            <span className={`badge badge-sm ${user.is_verified ? 'badge-success' : 'badge-warning'}`}>
              {user.is_verified ? 'Verified' : 'Pending verification'}
            </span>
            {student.student_id && <span>{student.student_id}</span>}
            {user.email && <span>· {user.email}</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!user.is_verified && (
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-sm btn-success" disabled={busy} onClick={() => setVerification(true)}>
                {busy ? <span className="loading loading-spinner loading-sm" /> : 'Approve'}
              </button>
              <button className="btn btn-sm btn-error" disabled={busy} onClick={() => setVerification(false)}>
                {busy ? <span className="loading loading-spinner loading-sm" /> : 'Reject'}
              </button>
            </div>
          )}
          {user.is_verified && (
            <button className="btn btn-sm btn-outline" disabled={busy} onClick={() => setVerification(false)}>
              {busy ? <span className="loading loading-spinner loading-sm" /> : 'Unverify'}
            </button>
          )}
          <button className="btn btn-sm btn-primary" onClick={() => setRecommending(true)}>
            Recommend
          </button>
        </div>
      </div>

      {(error || notice) && (
        <div role="alert" className={`alert ${error ? 'alert-error' : `alert-${notice?.type === 'success' ? 'success' : 'info'}`}`}>
          {error ?? notice?.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6">
          <Section title="Profile">
            <div className="flex flex-col gap-1 text-sm">
              {(student.phone || student.bio) && (
                <>
                  {student.phone && <span>{student.phone}</span>}
                  {student.bio && <p className="mt-1 text-base-content/70">{student.bio}</p>}
                </>
              )}
              {student.department && (
                <span className="mt-1">
                  {[student.department, student.batch].filter(Boolean).join(' · ')}
                  {student.semester ? ` (${student.semester})` : ''}
                </span>
              )}
              {student.cgpa != null && <span>CGPA: {Number(student.cgpa).toFixed(2)}</span>}
              {(student.linkedin_url || student.github_url || student.portfolio_url) && (
                <div className="mt-1 flex flex-col gap-1">
                  {student.linkedin_url && <a className="link" href={student.linkedin_url} target="_blank" rel="noreferrer">LinkedIn</a>}
                  {student.github_url && <a className="link" href={student.github_url} target="_blank" rel="noreferrer">GitHub</a>}
                  {student.portfolio_url && <a className="link" href={student.portfolio_url} target="_blank" rel="noreferrer">Portfolio</a>}
                </div>
              )}
            </div>
          </Section>

          <Section title="Skills">
            {skills.length === 0 ? (
              <p className="text-sm text-base-content/60">No skills listed.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {skills.map((s) => (
                  <span key={s.id} className="badge badge-outline">
                    {s.skills?.name ?? 'skill'}
                  </span>
                ))}
              </div>
            )}
          </Section>

          <Section title="CVs">
            {cvs.length === 0 ? (
              <p className="text-sm text-base-content/60">No CVs uploaded.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {cvs.map((cv) => (
                  <button key={cv.id} className="btn btn-sm btn-outline btn-block" onClick={() => openCv(cv).catch((e) => setError(e.message))}>
                    {cv.title}
                  </button>
                ))}
              </div>
            )}
          </Section>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-2">
          <Section title="Education">
            {education.length === 0 ? (
              <p className="text-sm text-base-content/60">No education listed.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {education.map((e) => (
                  <div key={e.id} className="border-b border-base-200 pb-3 last:border-0 last:pb-0">
                    <div className="font-medium">{e.degree ?? e.institution}</div>
                    {e.institution && <div className="text-sm">{e.institution}</div>}
                    {e.field && <div className="text-sm text-base-content/70">{e.field}</div>}
                    <div className="text-sm text-base-content/60">
                      {e.start_year}
                      {e.end_year ? ` — ${e.end_year}` : ''}
                    </div>
                    {e.gpa != null && <div className="text-sm text-base-content/70">GPA: {Number(e.gpa).toFixed(2)}</div>}
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Experience">
            {experience.length === 0 ? (
              <p className="text-sm text-base-content/60">No experience listed.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {experience.map((x) => (
                  <div key={x.id} className="border-b border-base-200 pb-3 last:border-0 last:pb-0">
                    <div className="font-medium">{x.role ?? x.company}</div>
                    {x.company && <div className="text-sm">{x.company}</div>}
                    {x.location && <div className="text-sm text-base-content/60">{x.location}</div>}
                    <div className="text-sm text-base-content/60">
                      {x.start_date ? formatDate(x.start_date) : ''}
                      {x.is_current ? ' — Present' : x.end_date ? ` — ${formatDate(x.end_date)}` : ''}
                    </div>
                    {x.description && <p className="mt-1 whitespace-pre-wrap text-sm text-base-content/70">{x.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Projects">
            {projects.length === 0 ? (
              <p className="text-sm text-base-content/60">No projects listed.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {projects.map((p) => (
                  <div key={p.id}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{p.title}</span>
                      <span className="text-sm text-base-content/60">
                        {p.start_year}
                        {p.end_year ? ` — ${p.end_year}` : ''}
                      </span>
                    </div>
                    {p.description && <p className="mt-1 whitespace-pre-wrap text-sm">{p.description}</p>}
                    {p.link && (
                      <a className="mt-1 link link-primary text-sm" href={p.link} target="_blank" rel="noreferrer">
                        {p.link}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>

      <RecommendModal
        open={recommending}
        student={recommendTarget}
        onClose={() => setRecommending(false)}
        onDone={() => {
          setNotice({ type: 'success', text: 'Recommendation submitted.' })
        }}
      />
    </div>
  )
}