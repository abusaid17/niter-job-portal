import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Award,
  Briefcase,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  FolderGit2,
  Globe,
  GraduationCap,
  Link2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Upload,
  User,
  X,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useStudentProfile } from '../../hooks/useProfiles'
import { formatDate } from '../../utils/format'
import { LoadingScreen } from '../../components/ui/LoadingScreen'

const STUDENT_DEPARTMENTS = [
  { code: 'CSE', label: 'Computer Science and Engineering (CSE)' },
  { code: 'TE', label: 'Textile Engineering (TE)' },
  { code: 'IPE', label: 'Industrial and Production Engineering (IPE)' },
  { code: 'FDAE', label: 'Fashion Design and Apparel Engineering (FDAE)' },
  { code: 'EEE', label: 'Electrical and Electronic Engineering (EEE)' },
]

const SESSIONS = Array.from({ length: 2026 - 2018 + 1 }, (_, i) => {
  const year = 2018 + i
  return `${year}-${year + 1}`
})

function deptLabel(value) {
  return STUDENT_DEPARTMENTS.find((d) => d.code === value || d.label === value)?.label ?? value
}

function deptCode(value) {
  return STUDENT_DEPARTMENTS.find((d) => d.code === value || d.label === value)?.code ?? value
}

/* ---------- shared UI ---------- */

function Section({ title, subtitle, icon: Icon, iconClass = 'bg-primary/10 text-primary', action, children }) {
  return (
    <div className="card overflow-hidden border border-base-200 bg-base-100 shadow-sm">
      <div className="card-body border-b border-base-200 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`rounded-xl p-2.5 ${iconClass}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold sm:text-lg">{title}</h2>
              {subtitle && <p className="mt-0.5 text-xs text-base-content/60 sm:text-sm">{subtitle}</p>}
            </div>
          </div>
          {action}
        </div>
      </div>
      <div className="card-body px-5 py-5 sm:px-6">{children}</div>
    </div>
  )
}

function Flash({ message, onDismiss }) {
  if (!message) return null
  const isError = message.type === 'error'
  return (
    <div role="alert" className={`alert ${isError ? 'alert-error' : 'alert-success'} shadow-sm`}>
      {isError ? <AlertCircle className="h-5 w-5 shrink-0" /> : <CheckCircle2 className="h-5 w-5 shrink-0" />}
      <span className="text-sm">{message.text}</span>
      {onDismiss && (
        <button type="button" className="btn btn-ghost btn-xs ml-auto" onClick={onDismiss} aria-label="Dismiss">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

function Field({ label, required, hint, className = '', children }) {
  return (
    <label className={`form-control w-full ${className}`}>
      <div className="label pb-1">
        <span className="label-text text-sm font-medium">
          {label}
          {required && <span className="text-error"> *</span>}
        </span>
      </div>
      {children}
      {hint && <div className="label pt-1"><span className="label-text-alt text-base-content/50">{hint}</span></div>}
    </label>
  )
}

function EmptyState({ icon: Icon, title, hint, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-base-300 bg-base-200/40 px-6 py-8 text-center">
      <div className="rounded-full bg-base-200 p-3 text-base-content/50">
        <Icon className="h-6 w-6" />
      </div>
      <p className="text-sm font-semibold">{title}</p>
      {hint && <p className="max-w-sm text-xs text-base-content/60">{hint}</p>}
      {action}
    </div>
  )
}

function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', busy, onConfirm, onCancel }) {
  if (!open) return null
  return (
    <dialog className="modal" open>
      <div className="modal-box">
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="mt-2 text-sm text-base-content/70">{message}</p>
        <div className="modal-action">
          <button type="button" className="btn btn-outline" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn btn-error" onClick={onConfirm} disabled={busy}>
            {busy ? <span className="loading loading-spinner loading-sm" /> : confirmLabel}
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={busy ? undefined : onCancel} />
    </dialog>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-base-200 bg-base-100 px-4 py-3 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-base-content/50">{label}</div>
      <div className="mt-1 truncate text-sm font-bold sm:text-base">{value ?? '—'}</div>
    </div>
  )
}

const inputCls = 'input input-bordered w-full'
const textareaCls = 'textarea textarea-bordered w-full min-h-24'

/* ---------- profile completion ---------- */

function useCompletion(profile, name) {
  return useMemo(() => {
    const checks = [
      ['Full name', Boolean(name?.trim())],
      ['Student ID', Boolean(profile?.student_id?.trim())],
      ['Department', Boolean(profile?.department)],
      ['Session', Boolean(profile?.session)],
      ['Semester', Boolean(String(profile?.semester ?? '').trim())],
      ['CGPA', profile?.cgpa != null && String(profile.cgpa).trim() !== ''],
      ['Phone', Boolean(profile?.phone?.trim())],
      ['Bio', Boolean(profile?.bio?.trim())],
      ['LinkedIn', Boolean(profile?.linkedin_url?.trim())],
      ['GitHub / Portfolio', Boolean(profile?.github_url?.trim() || profile?.portfolio_url?.trim())],
    ]
    const done = checks.filter(([, v]) => v).length
    const pct = Math.round((done / checks.length) * 100)
    return { checks, done, total: checks.length, pct }
  }, [profile, name])
}

/* ---------- main page ---------- */

const EMPTY_FIELDS = {
  student_id: '',
  department: '',
  session: '',
  semester: '',
  cgpa: '',
  phone: '',
  linkedin_url: '',
  github_url: '',
  portfolio_url: '',
  bio: '',
  name: '',
}

export default function StudentProfilePage() {
  const { session } = useAuth()
  const { profile, loading, refresh } = useStudentProfile()
  const [fields, setFields] = useState(EMPTY_FIELDS)
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState(null)
  const [mode, setMode] = useState('view')
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (profile) {
      setFields({
        student_id: profile.student_id ?? '',
        department: deptCode(profile.department ?? '') ?? '',
        session: profile.session ?? '',
        semester: profile.semester ?? '',
        cgpa: profile.cgpa ?? '',
        phone: profile.phone ?? '',
        linkedin_url: profile.linkedin_url ?? '',
        github_url: profile.github_url ?? '',
        portfolio_url: profile.portfolio_url ?? '',
        bio: profile.bio ?? '',
        name: profile.users?.name ?? '',
      })
      if (!initialized) {
        // First-time users land directly in edit mode; everyone else sees the polished view.
        setMode(profile.student_id ? 'view' : 'edit')
        setInitialized(true)
      }
    } else if (!loading && !initialized) {
      setMode('edit')
      setInitialized(true)
    }
  }, [profile, loading, initialized])

  const completion = useCompletion(profile, fields.name || profile?.users?.name)

  if (loading) {
    return <LoadingScreen />
  }

  function set(key) {
    return (e) => setFields((f) => ({ ...f, [key]: e.target.value }))
  }

  async function onSave(e) {
    e.preventDefault()
    setSaving(true)
    setFlash(null)
    const studentRow = {
      user_id: session.user.id,
      student_id: fields.student_id || null,
      department: fields.department || null,
      session: fields.session || null,
      semester: fields.semester || null,
      cgpa: fields.cgpa ? Number(fields.cgpa) : null,
      phone: fields.phone || null,
      linkedin_url: fields.linkedin_url || null,
      github_url: fields.github_url || null,
      portfolio_url: fields.portfolio_url || null,
      bio: fields.bio || null,
    }
    const { error } = await supabase.from('students').upsert(studentRow, { onConflict: 'user_id' })
    if (fields.name && fields.name.trim()) {
      await supabase.from('users').update({ name: fields.name.trim() }).eq('id', session.user.id)
    }
    setSaving(false)
    if (error) {
      setFlash({ type: 'error', text: error.message })
    } else {
      setFlash({ type: 'success', text: 'Profile saved successfully.' })
      await refresh()
      setMode('view')
    }
  }

  const displayName = profile?.users?.name || fields.name || 'Student'
  const initial = (displayName.trim().charAt(0).toUpperCase() || 'S')
  const email = session?.user?.email

  const socials = [
    { label: 'LinkedIn', value: profile?.linkedin_url },
    { label: 'GitHub', value: profile?.github_url },
    { label: 'Portfolio', value: profile?.portfolio_url },
  ].filter((s) => s.value && String(s.value).trim() !== '')

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 sm:gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">My Profile</h1>
        <p className="mt-1 text-sm text-base-content/60">
          Keep your profile complete — recruiters and faculty see this when you apply.
        </p>
      </div>

      <Flash message={flash} onDismiss={() => setFlash(null)} />

      {/* Profile header */}
      <div className="card overflow-hidden border border-base-200 bg-base-100 shadow-sm">
        <div className="h-24 bg-gradient-to-r from-primary via-primary/80 to-secondary sm:h-28" />
        <div className="card-body px-5 pb-5 pt-0 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="-mt-8 flex flex-col gap-3 sm:-mt-10 sm:flex-row sm:items-end">
              <div className="avatar">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary text-3xl font-extrabold text-primary-content ring-4 ring-base-100 sm:h-24 sm:w-24">
                  {initial}
                </div>
              </div>
              <div className="min-w-0 pb-0.5">
                <h2 className="truncate text-xl font-extrabold sm:text-2xl">{displayName}</h2>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {profile?.department && (
                    <span className="badge badge-primary badge-sm">{deptLabel(profile.department)}</span>
                  )}
                  {profile?.student_id && (
                    <span className="badge badge-outline badge-sm">ID: {profile.student_id}</span>
                  )}
                  {profile?.session && (
                    <span className="badge badge-ghost badge-sm">Session {profile.session}</span>
                  )}
                </div>
                {email && (
                  <p className="mt-1.5 flex items-center gap-1.5 truncate text-xs text-base-content/60 sm:text-sm">
                    <Mail className="h-4 w-4 shrink-0" />
                    <span className="truncate">{email}</span>
                  </p>
                )}
              </div>
            </div>
            {mode === 'view' ? (
              <button type="button" className="btn btn-primary shrink-0" onClick={() => { setMode('edit'); setFlash(null) }}>
                <Pencil className="h-4 w-4" />
                Edit Profile
              </button>
            ) : (
              <button type="button" className="btn btn-ghost shrink-0" onClick={() => { setMode('view'); setFlash(null) }}>
                <X className="h-4 w-4" />
                Cancel
              </button>
            )}
          </div>

          {/* completion */}
          <div className="mt-5 rounded-2xl border border-base-200 bg-base-200/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">
                Profile completion
                <span className="ml-2 badge badge-primary badge-sm">{completion.pct}%</span>
              </p>
              <p className="text-xs text-base-content/60">{completion.done} of {completion.total} sections complete</p>
            </div>
            <progress className="progress progress-primary mt-3 h-2.5 w-full" value={completion.pct} max="100" />
            {completion.pct < 100 && (
              <p className="mt-2 text-xs text-base-content/60">
                Missing: {completion.checks.filter(([, v]) => !v).map(([l]) => l).slice(0, 4).join(' · ')}
                {completion.checks.filter(([, v]) => !v).length > 4 && ' …'}
              </p>
            )}
          </div>

          {/* quick stats */}
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="CGPA" value={profile?.cgpa != null && String(profile.cgpa) !== '' ? Number(profile.cgpa).toFixed(2) : '—'} />
            <Stat label="Semester" value={profile?.semester || '—'} />
            <Stat label="Session" value={profile?.session || '—'} />
            <Stat label="Phone" value={profile?.phone || '—'} />
          </div>
        </div>
      </div>

      {/* Personal info view / edit */}
      {mode === 'view' ? (
        <Section
          title="Personal Information"
          subtitle="Your student record shown to companies you apply to."
          icon={User}
          action={
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setMode('edit')}>
              <Pencil className="h-4 w-4" /> Edit
            </button>
          }
        >
          <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            <InfoItem label="Full name" value={displayName} />
            <InfoItem label="Student ID" value={profile?.student_id} />
            <InfoItem label="Department" value={profile?.department ? deptLabel(profile.department) : null} />
            <InfoItem label="Session" value={profile?.session} />
            <InfoItem label="Semester" value={profile?.semester} />
            <InfoItem label="CGPA" value={profile?.cgpa != null && String(profile.cgpa) !== '' ? Number(profile.cgpa).toFixed(2) : null} />
            <InfoItem label="Phone" value={profile?.phone} href={profile?.phone ? `tel:${profile.phone}` : null} icon={Phone} />
            <InfoItem label="Email" value={email} icon={Mail} />
          </div>
          {profile?.bio && (
            <div className="mt-5 rounded-2xl bg-base-200/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-base-content/50">About</p>
              <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed">{profile.bio}</p>
            </div>
          )}
          {(!profile?.bio) && (
            <p className="mt-4 text-sm text-base-content/50">Add a short bio so recruiters know you better.</p>
          )}
        </Section>
      ) : (
        <form onSubmit={onSave}>
          <Section
            title="Personal Information"
            subtitle="Your student record shown to companies you apply to."
            icon={User}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Full name" hint="As on your NITER records">
                <input className={inputCls} placeholder="e.g. Tanvir Ahmed" value={fields.name} onChange={set('name')} />
              </Field>
              <Field label="Student ID" required hint="Must match your NITER ID card">
                <input className={inputCls} placeholder="e.g. CS 2203048" value={fields.student_id} onChange={set('student_id')} required />
              </Field>
              <Field label="Department" hint="Your major department">
                <select className="select select-bordered w-full" value={fields.department} onChange={set('department')}>
                  <option value="">Select department</option>
                  {STUDENT_DEPARTMENTS.map((d) => (
                    <option key={d.code} value={d.code}>{d.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Session" hint="Admission session">
                <select className="select select-bordered w-full" value={fields.session} onChange={set('session')}>
                  <option value="">Select session</option>
                  {SESSIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Semester" hint="Current semester, e.g. 8">
                <input className={inputCls} placeholder="e.g. 8" value={fields.semester} onChange={set('semester')} />
              </Field>
              <Field label="CGPA" hint="0.00 – 4.00">
                <input className={inputCls} placeholder="e.g. 3.75" inputMode="decimal" value={fields.cgpa} onChange={set('cgpa')} />
              </Field>
              <Field label="Phone" hint="Recruiters may contact you here">
                <input className={inputCls} placeholder="+8801XXXXXXXXX" value={fields.phone} onChange={set('phone')} />
              </Field>
              <Field label="Bio" hint="2–3 lines about your interests and goals" className="sm:col-span-2">
                <textarea className={textareaCls} rows={3} placeholder="Final-year CSE student interested in backend development…" value={fields.bio} onChange={set('bio')} />
              </Field>
            </div>
            <div className="mt-6 flex flex-col-reverse justify-end gap-2 border-t border-base-200 pt-5 sm:flex-row">
              <button type="button" className="btn btn-ghost" onClick={() => setMode('view')}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <span className="loading loading-spinner loading-sm" /> : <Save className="h-4 w-4" />}
                {saving ? 'Saving…' : 'Save profile'}
              </button>
            </div>
          </Section>
        </form>
      )}

      {/* Social links */}
      <Section
        title="Social Links"
        subtitle="Portfolio and professional profiles recruiters can visit."
        icon={Globe}
        iconClass="bg-sky-500/10 text-sky-600"
        action={mode === 'view' ? (
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setMode('edit')}>
            <Pencil className="h-4 w-4" /> Manage
          </button>
        ) : undefined}
      >
        {mode === 'edit' ? (
          <form onSubmit={onSave} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="LinkedIn URL" hint="https://linkedin.com/in/you">
              <input className={inputCls} placeholder="https://linkedin.com/in/…" value={fields.linkedin_url} onChange={set('linkedin_url')} />
            </Field>
            <Field label="GitHub URL" hint="https://github.com/you">
              <input className={inputCls} placeholder="https://github.com/…" value={fields.github_url} onChange={set('github_url')} />
            </Field>
            <Field label="Portfolio URL" hint="Personal site, Behance, etc." className="sm:col-span-2">
              <input className={inputCls} placeholder="https://…" value={fields.portfolio_url} onChange={set('portfolio_url')} />
            </Field>
            <div className="flex justify-end sm:col-span-2">
              <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                {saving ? <span className="loading loading-spinner loading-sm" /> : 'Save links'}
              </button>
            </div>
          </form>
        ) : socials.length === 0 ? (
          <EmptyState
            icon={Link2}
            title="No social links yet"
            hint="Add LinkedIn, GitHub or portfolio links so recruiters can see your work."
            action={
              <button type="button" className="btn btn-primary btn-sm mt-2" onClick={() => setMode('edit')}>
                <Plus className="h-4 w-4" /> Add links
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.value}
                target="_blank"
                rel="noreferrer noopener"
                className="group flex items-center justify-between gap-2 rounded-2xl border border-base-200 bg-base-200/40 px-4 py-3 transition hover:border-primary/40 hover:bg-primary/5"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-wider text-base-content/50">{s.label}</div>
                  <div className="truncate text-sm font-medium text-primary">{String(s.value).replace(/^https?:\/\//, '')}</div>
                </div>
                <ExternalLink className="h-4 w-4 shrink-0 text-base-content/40 transition group-hover:text-primary" />
              </a>
            ))}
          </div>
        )}
      </Section>

      {profile?.id && (
        <>
          <EducationSection studentId={profile.id} />
          <SkillsSection studentId={profile.id} />
          <ExperienceSection studentId={profile.id} />
          <ProjectsSection studentId={profile.id} />
          <CvSection studentId={profile.id} />
        </>
      )}
      {!profile?.id && (
        <div role="alert" className="alert alert-info shadow-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm">Save your profile above (Student ID is required) to unlock Education, Skills, Experience, Projects and CV sections.</span>
        </div>
      )}
    </div>
  )
}

function InfoItem({ label, value, href, icon: Icon }) {
  if (value == null || String(value).trim() === '') {
    return (
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-base-content/40">{label}</div>
        <div className="mt-1 text-sm text-base-content/40">—</div>
      </div>
    )
  }
  const content = (
    <span className="flex min-w-0 items-center gap-1.5">
      {Icon && <Icon className="h-4 w-4 shrink-0 text-base-content/40" />}
      <span className="break-all">{value}</span>
    </span>
  )
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-base-content/40">{label}</div>
      <div className="mt-1 text-sm font-medium">
        {href ? <a href={href} className="link link-primary">{content}</a> : content}
      </div>
    </div>
  )
}

/* ---------- education ---------- */

const EMPTY_EDU = { degree: '', institution: '', field: '', start_year: '', end_year: '', gpa: '' }

function EducationSection({ studentId }) {
  const [rows, setRows] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [flash, setFlash] = useState(null)
  const [form, setForm] = useState(EMPTY_EDU)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    const { data } = await supabase.from('education').select('*').eq('student_id', studentId).order('start_year', { ascending: false })
    setRows(data ?? [])
    setLoaded(true)
  }, [studentId])

  useEffect(() => { refresh() }, [refresh])

  function startAdd() {
    setForm(EMPTY_EDU)
    setEditingId(null)
    setShowForm(true)
    setFlash(null)
  }

  function startEdit(r) {
    setForm({
      degree: r.degree ?? '',
      institution: r.institution ?? '',
      field: r.field ?? '',
      start_year: r.start_year ?? '',
      end_year: r.end_year ?? '',
      gpa: r.gpa ?? '',
    })
    setEditingId(r.id)
    setShowForm(true)
    setFlash(null)
  }

  async function onSubmit(e) {
    e?.preventDefault()
    if (!form.degree.trim()) {
      setFlash({ type: 'error', text: 'Degree is required.' })
      return
    }
    setBusy(true)
    const payload = {
      student_id: studentId,
      degree: form.degree,
      institution: form.institution || null,
      field: form.field || null,
      start_year: form.start_year ? Number(form.start_year) : null,
      end_year: form.end_year ? Number(form.end_year) : null,
      gpa: form.gpa ? Number(form.gpa) : null,
    }
    const { error } = editingId
      ? await supabase.from('education').update(payload).eq('id', editingId)
      : await supabase.from('education').insert(payload)
    setBusy(false)
    if (error) {
      setFlash({ type: 'error', text: error.message })
      return
    }
    setFlash({ type: 'success', text: editingId ? 'Education updated.' : 'Education added.' })
    setForm(EMPTY_EDU)
    setEditingId(null)
    setShowForm(false)
    await refresh()
  }

  async function onDelete() {
    if (!confirmId) return
    setBusy(true)
    await supabase.from('education').delete().eq('id', confirmId)
    setBusy(false)
    setConfirmId(null)
    setFlash({ type: 'success', text: 'Education removed.' })
    await refresh()
  }

  return (
    <Section
      title="Education"
      subtitle="Degrees, diplomas and certifications."
      icon={GraduationCap}
      iconClass="bg-sky-500/10 text-sky-600"
      action={
        <div className="flex items-center gap-2">
          {rows.length > 0 && <span className="badge badge-ghost badge-sm">{rows.length}</span>}
          {!showForm && (
            <button type="button" className="btn btn-primary btn-sm" onClick={startAdd}>
              <Plus className="h-4 w-4" /> Add
            </button>
          )}
        </div>
      }
    >
      <Flash message={flash} onDismiss={() => setFlash(null)} />
      {showForm && (
        <form onSubmit={onSubmit} className="mb-5 rounded-2xl border border-primary/20 bg-primary/[0.03] p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Degree" required hint="e.g. B.Sc. in CSE">
              <input className={inputCls} placeholder="B.Sc. in Computer Science" value={form.degree} onChange={(e) => setForm({ ...form, degree: e.target.value })} />
            </Field>
            <Field label="Institution" hint="e.g. NITER">
              <input className={inputCls} placeholder="National Institute of Textile Engineering" value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} />
            </Field>
            <Field label="Field of study" hint="Major / concentration">
              <input className={inputCls} placeholder="Software Engineering" value={form.field} onChange={(e) => setForm({ ...form, field: e.target.value })} />
            </Field>
            <Field label="GPA" hint="Optional">
              <input className={inputCls} placeholder="e.g. 3.75" inputMode="decimal" value={form.gpa} onChange={(e) => setForm({ ...form, gpa: e.target.value })} />
            </Field>
            <Field label="Start year">
              <input className={inputCls} placeholder="2022" inputMode="numeric" value={form.start_year} onChange={(e) => setForm({ ...form, start_year: e.target.value })} />
            </Field>
            <Field label="End year" hint="Leave blank if ongoing">
              <input className={inputCls} placeholder="2026" inputMode="numeric" value={form.end_year} onChange={(e) => setForm({ ...form, end_year: e.target.value })} />
            </Field>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setShowForm(false); setEditingId(null) }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
              {busy ? <span className="loading loading-spinner loading-sm" /> : editingId ? 'Update' : 'Add education'}
            </button>
          </div>
        </form>
      )}
      {!loaded ? (
        <div className="flex justify-center py-6"><span className="loading loading-spinner" /></div>
      ) : rows.length === 0 && !showForm ? (
        <EmptyState
          icon={GraduationCap}
          title="No education added"
          hint="Add your degree so recruiters can verify your background."
          action={<button type="button" className="btn btn-outline btn-sm mt-2" onClick={startAdd}><Plus className="h-4 w-4" /> Add education</button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {rows.map((r) => (
            <div key={r.id} className="flex flex-col justify-between gap-3 rounded-2xl border border-base-200 bg-base-100 p-4 shadow-xs transition hover:border-primary/30 hover:shadow-sm">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold">{r.degree || 'Degree'}</p>
                  {r.gpa != null && <span className="badge badge-success badge-sm shrink-0">GPA {r.gpa}</span>}
                </div>
                <p className="mt-1 text-sm text-base-content/70">
                  {[r.institution, r.field].filter(Boolean).join(' · ') || '—'}
                </p>
                {(r.start_year || r.end_year) && (
                  <p className="mt-1 text-xs text-base-content/50">{[r.start_year, r.end_year].filter(Boolean).join(' – ')}</p>
                )}
              </div>
              <div className="flex justify-end gap-1.5 border-t border-base-200/70 pt-2.5">
                <button type="button" className="btn btn-ghost btn-xs" onClick={() => startEdit(r)}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
                <button type="button" className="btn btn-ghost btn-xs text-error" onClick={() => setConfirmId(r.id)}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={Boolean(confirmId)}
        title="Remove education?"
        message="This entry will be permanently removed from your profile."
        busy={busy}
        onConfirm={onDelete}
        onCancel={() => setConfirmId(null)}
      />
    </Section>
  )
}

/* ---------- skills ---------- */

function SkillsSection({ studentId }) {
  const [rows, setRows] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [name, setName] = useState('')
  const [flash, setFlash] = useState(null)
  const [busy, setBusy] = useState(false)
  const [confirmId, setConfirmId] = useState(null)

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('student_skills')
      .select('id, skills(name)')
      .eq('student_id', studentId)
      .order('id')
    setRows(data ?? [])
    setLoaded(true)
  }, [studentId])

  useEffect(() => { refresh() }, [refresh])

  async function onAdd(e) {
    e?.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    setFlash(null)
    const { data: existing } = await supabase.from('skills').select('id').eq('name', name.trim()).maybeSingle()
    let skillId = existing?.id
    if (!skillId) {
      const { data, error } = await supabase.from('skills').insert({ name: name.trim() }).select('id').single()
      if (error) {
        setBusy(false)
        setFlash({ type: 'error', text: error.message })
        return
      }
      skillId = data.id
    }
    const { error } = await supabase.from('student_skills').insert({ student_id: studentId, skill_id: skillId })
    setBusy(false)
    if (error) {
      setFlash({ type: 'error', text: error.message })
    } else {
      setFlash({ type: 'success', text: 'Skill added.' })
      setName('')
    }
    await refresh()
  }

  async function onDelete() {
    if (!confirmId) return
    setBusy(true)
    await supabase.from('student_skills').delete().eq('id', confirmId)
    setBusy(false)
    setConfirmId(null)
    await refresh()
  }

  return (
    <Section
      title="Skills"
      subtitle="Technologies and competencies recruiters search for."
      icon={Sparkles}
      iconClass="bg-violet-500/10 text-violet-600"
      action={rows.length > 0 ? <span className="badge badge-ghost badge-sm">{rows.length}</span> : undefined}
    >
      <Flash message={flash} onDismiss={() => setFlash(null)} />
      <form onSubmit={onAdd} className="flex flex-col gap-2 sm:flex-row">
        <input
          className={`${inputCls} flex-1`}
          placeholder="e.g. React, SQL, Python — press Enter to add"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className="btn btn-primary shrink-0" disabled={busy || !name.trim()}>
          {busy ? <span className="loading loading-spinner loading-sm" /> : <Plus className="h-4 w-4" />}
          Add skill
        </button>
      </form>
      <div className="mt-4">
        {!loaded ? (
          <div className="flex justify-center py-4"><span className="loading loading-spinner" /></div>
        ) : rows.length === 0 ? (
          <EmptyState icon={Award} title="No skills yet" hint="Add at least 5 skills — profiles with skills get shortlisted more often." />
        ) : (
          <div className="flex flex-wrap gap-2">
            {rows.map((r) => (
              <span key={r.id} className="badge badge-lg gap-2 border-primary/20 bg-primary/5 py-4 pl-4 pr-2 font-medium">
                {r.skills?.name}
                <button
                  type="button"
                  className="btn btn-ghost btn-xs btn-circle text-base-content/50 hover:text-error"
                  onClick={() => setConfirmId(r.id)}
                  title={`Remove ${r.skills?.name}`}
                  aria-label={`Remove ${r.skills?.name}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
      <ConfirmDialog
        open={Boolean(confirmId)}
        title="Remove skill?"
        message="This skill will be removed from your profile."
        confirmLabel="Remove"
        busy={busy}
        onConfirm={onDelete}
        onCancel={() => setConfirmId(null)}
      />
    </Section>
  )
}

/* ---------- experience ---------- */

const EMPTY_EXP = { role: '', company: '', location: '', start_date: '', end_date: '', is_current: false, description: '' }

function ExperienceSection({ studentId }) {
  const [rows, setRows] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [flash, setFlash] = useState(null)
  const [form, setForm] = useState(EMPTY_EXP)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    const { data } = await supabase.from('experience').select('*').eq('student_id', studentId).order('start_date', { ascending: false })
    setRows(data ?? [])
    setLoaded(true)
  }, [studentId])

  useEffect(() => { refresh() }, [refresh])

  function startAdd() {
    setForm(EMPTY_EXP)
    setEditingId(null)
    setShowForm(true)
    setFlash(null)
  }

  function startEdit(r) {
    setForm({
      role: r.role ?? '',
      company: r.company ?? '',
      location: r.location ?? '',
      start_date: r.start_date ?? '',
      end_date: r.end_date ?? '',
      is_current: Boolean(r.is_current),
      description: r.description ?? '',
    })
    setEditingId(r.id)
    setShowForm(true)
    setFlash(null)
  }

  async function onSubmit(e) {
    e?.preventDefault()
    if (!form.role.trim()) {
      setFlash({ type: 'error', text: 'Role is required.' })
      return
    }
    setBusy(true)
    const payload = {
      student_id: studentId,
      role: form.role,
      company: form.company || null,
      location: form.location || null,
      start_date: form.start_date || null,
      end_date: form.is_current ? null : form.end_date || null,
      is_current: form.is_current,
      description: form.description || null,
    }
    const { error } = editingId
      ? await supabase.from('experience').update(payload).eq('id', editingId)
      : await supabase.from('experience').insert(payload)
    setBusy(false)
    if (error) {
      setFlash({ type: 'error', text: error.message })
      return
    }
    setFlash({ type: 'success', text: editingId ? 'Experience updated.' : 'Experience added.' })
    setForm(EMPTY_EXP)
    setEditingId(null)
    setShowForm(false)
    await refresh()
  }

  async function onDelete() {
    if (!confirmId) return
    setBusy(true)
    await supabase.from('experience').delete().eq('id', confirmId)
    setBusy(false)
    setConfirmId(null)
    setFlash({ type: 'success', text: 'Experience removed.' })
    await refresh()
  }

  return (
    <Section
      title="Experience"
      subtitle="Internships, part-time roles and work history."
      icon={Briefcase}
      iconClass="bg-amber-500/10 text-amber-600"
      action={
        <div className="flex items-center gap-2">
          {rows.length > 0 && <span className="badge badge-ghost badge-sm">{rows.length}</span>}
          {!showForm && (
            <button type="button" className="btn btn-primary btn-sm" onClick={startAdd}>
              <Plus className="h-4 w-4" /> Add
            </button>
          )}
        </div>
      }
    >
      <Flash message={flash} onDismiss={() => setFlash(null)} />
      {showForm && (
        <form onSubmit={onSubmit} className="mb-5 rounded-2xl border border-primary/20 bg-primary/[0.03] p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Role" required hint="e.g. Frontend Intern">
              <input className={inputCls} placeholder="Software Engineer Intern" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
            </Field>
            <Field label="Company" hint="Employer name">
              <input className={inputCls} placeholder="ABC Technologies" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </Field>
            <Field label="Location" hint="City / Remote">
              <input className={inputCls} placeholder="Dhaka / Remote" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start date">
                <input className={inputCls} type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </Field>
              <Field label="End date">
                <input className={inputCls} type="date" value={form.end_date} disabled={form.is_current} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </Field>
            </div>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm sm:col-span-2">
              <input type="checkbox" className="toggle toggle-primary toggle-sm" checked={form.is_current} onChange={(e) => setForm({ ...form, is_current: e.target.checked })} />
              I currently work here
            </label>
            <Field label="Description" hint="What did you do and achieve?" className="sm:col-span-2">
              <textarea className={textareaCls} rows={3} placeholder="Built REST APIs with Node.js, improved page load by 30%…" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setShowForm(false); setEditingId(null) }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
              {busy ? <span className="loading loading-spinner loading-sm" /> : editingId ? 'Update' : 'Add experience'}
            </button>
          </div>
        </form>
      )}
      {!loaded ? (
        <div className="flex justify-center py-6"><span className="loading loading-spinner" /></div>
      ) : rows.length === 0 && !showForm ? (
        <EmptyState
          icon={Briefcase}
          title="No experience yet"
          hint="Internships and project work count — add anything relevant."
          action={<button type="button" className="btn btn-outline btn-sm mt-2" onClick={startAdd}><Plus className="h-4 w-4" /> Add experience</button>}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((r) => (
            <div key={r.id} className="rounded-2xl border border-base-200 p-4 transition hover:border-primary/30 hover:shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold">
                    {r.role}
                    {r.is_current && <span className="badge badge-success badge-sm ml-2">Current</span>}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm text-base-content/70">
                    {r.company && <span className="font-medium">{r.company}</span>}
                    {r.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{r.location}</span>}
                  </p>
                  <p className="mt-0.5 text-xs text-base-content/50">
                    {[r.start_date ? formatDate(r.start_date) : null, r.is_current ? 'Present' : r.end_date ? formatDate(r.end_date) : null].filter(Boolean).join(' – ') || '—'}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <button type="button" className="btn btn-ghost btn-xs" onClick={() => startEdit(r)}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button type="button" className="btn btn-ghost btn-xs text-error" onClick={() => setConfirmId(r.id)}>
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </div>
              {r.description && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-base-content/80">{r.description}</p>}
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={Boolean(confirmId)}
        title="Remove experience?"
        message="This entry will be permanently removed from your profile."
        busy={busy}
        onConfirm={onDelete}
        onCancel={() => setConfirmId(null)}
      />
    </Section>
  )
}

/* ---------- projects ---------- */

const EMPTY_PROJ = { title: '', description: '', link: '', start_year: '', end_year: '' }

function ProjectsSection({ studentId }) {
  const [rows, setRows] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [flash, setFlash] = useState(null)
  const [form, setForm] = useState(EMPTY_PROJ)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    const { data } = await supabase.from('projects').select('*').eq('student_id', studentId).order('start_year', { ascending: false })
    setRows(data ?? [])
    setLoaded(true)
  }, [studentId])

  useEffect(() => { refresh() }, [refresh])

  function startAdd() {
    setForm(EMPTY_PROJ)
    setEditingId(null)
    setShowForm(true)
    setFlash(null)
  }

  function startEdit(r) {
    setForm({
      title: r.title ?? '',
      description: r.description ?? '',
      link: r.link ?? '',
      start_year: r.start_year ?? '',
      end_year: r.end_year ?? '',
    })
    setEditingId(r.id)
    setShowForm(true)
    setFlash(null)
  }

  async function onSubmit(e) {
    e?.preventDefault()
    if (!form.title.trim()) {
      setFlash({ type: 'error', text: 'Project title is required.' })
      return
    }
    setBusy(true)
    const payload = {
      student_id: studentId,
      title: form.title,
      description: form.description || null,
      link: form.link || null,
      start_year: form.start_year ? Number(form.start_year) : null,
      end_year: form.end_year ? Number(form.end_year) : null,
    }
    const { error } = editingId
      ? await supabase.from('projects').update(payload).eq('id', editingId)
      : await supabase.from('projects').insert(payload)
    setBusy(false)
    if (error) {
      setFlash({ type: 'error', text: error.message })
      return
    }
    setFlash({ type: 'success', text: editingId ? 'Project updated.' : 'Project added.' })
    setForm(EMPTY_PROJ)
    setEditingId(null)
    setShowForm(false)
    await refresh()
  }

  async function onDelete() {
    if (!confirmId) return
    setBusy(true)
    await supabase.from('projects').delete().eq('id', confirmId)
    setBusy(false)
    setConfirmId(null)
    setFlash({ type: 'success', text: 'Project removed.' })
    await refresh()
  }

  return (
    <Section
      title="Projects"
      subtitle="Academic, personal and open-source work."
      icon={FolderGit2}
      iconClass="bg-emerald-500/10 text-emerald-600"
      action={
        <div className="flex items-center gap-2">
          {rows.length > 0 && <span className="badge badge-ghost badge-sm">{rows.length}</span>}
          {!showForm && (
            <button type="button" className="btn btn-primary btn-sm" onClick={startAdd}>
              <Plus className="h-4 w-4" /> Add
            </button>
          )}
        </div>
      }
    >
      <Flash message={flash} onDismiss={() => setFlash(null)} />
      {showForm && (
        <form onSubmit={onSubmit} className="mb-5 rounded-2xl border border-primary/20 bg-primary/[0.03] p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Project title" required hint="e.g. NITER Job Portal">
              <input className={inputCls} placeholder="My awesome project" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
            <Field label="Link" hint="GitHub / live demo">
              <input className={inputCls} placeholder="https://github.com/you/project" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
            </Field>
            <Field label="Description" hint="Tech stack and your contribution" className="sm:col-span-2">
              <textarea className={textareaCls} rows={3} placeholder="Full-stack job portal with React, Supabase…" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <Field label="Start year">
              <input className={inputCls} placeholder="2024" inputMode="numeric" value={form.start_year} onChange={(e) => setForm({ ...form, start_year: e.target.value })} />
            </Field>
            <Field label="End year" hint="Blank if ongoing">
              <input className={inputCls} placeholder="2025" inputMode="numeric" value={form.end_year} onChange={(e) => setForm({ ...form, end_year: e.target.value })} />
            </Field>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setShowForm(false); setEditingId(null) }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
              {busy ? <span className="loading loading-spinner loading-sm" /> : editingId ? 'Update' : 'Add project'}
            </button>
          </div>
        </form>
      )}
      {!loaded ? (
        <div className="flex justify-center py-6"><span className="loading loading-spinner" /></div>
      ) : rows.length === 0 && !showForm ? (
        <EmptyState
          icon={FolderGit2}
          title="No projects yet"
          hint="Showcase 2–3 strong projects with links and descriptions."
          action={<button type="button" className="btn btn-outline btn-sm mt-2" onClick={startAdd}><Plus className="h-4 w-4" /> Add project</button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {rows.map((r) => (
            <div key={r.id} className="flex flex-col justify-between gap-3 rounded-2xl border border-base-200 p-4 transition hover:border-primary/30 hover:shadow-sm">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold">{r.title}</p>
                  {(r.start_year || r.end_year) && (
                    <span className="badge badge-ghost badge-sm shrink-0">{[r.start_year, r.end_year].filter(Boolean).join(' – ')}</span>
                  )}
                </div>
                {r.description && <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-sm text-base-content/70">{r.description}</p>}
                {r.link && (
                  <a className="link link-primary mt-2 inline-flex items-center gap-1 text-sm" href={r.link} target="_blank" rel="noreferrer noopener">
                    View project <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
              <div className="flex justify-end gap-1.5 border-t border-base-200/70 pt-2.5">
                <button type="button" className="btn btn-ghost btn-xs" onClick={() => startEdit(r)}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
                <button type="button" className="btn btn-ghost btn-xs text-error" onClick={() => setConfirmId(r.id)}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={Boolean(confirmId)}
        title="Remove project?"
        message="This project will be permanently removed from your profile."
        busy={busy}
        onConfirm={onDelete}
        onCancel={() => setConfirmId(null)}
      />
    </Section>
  )
}

/* ---------- CV ---------- */

function CvSection({ studentId }) {
  const { session } = useAuth()
  const [cvs, setCvs] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [flash, setFlash] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [confirmCv, setConfirmCv] = useState(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    const { data } = await supabase.from('cvs').select('*').eq('student_id', studentId).order('created_at', { ascending: false })
    setCvs(data ?? [])
    setLoaded(true)
  }, [studentId])

  useEffect(() => { refresh() }, [refresh])

  async function onUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setFlash({ type: 'error', text: 'File exceeds the 5 MB limit.' })
      return
    }
    if (!['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)) {
      setFlash({ type: 'error', text: 'Only PDF or DOCX files are allowed.' })
      return
    }
    setUploading(true)
    setFlash(null)
    const path = `cvs/${session.user.id}/${crypto.randomUUID()}-${file.name}`
    const { error: upErr } = await supabase.storage.from('uploads').upload(path, file, {
      cacheControl: '3600',
      contentType: file.type,
    })
    if (upErr) {
      setUploading(false)
      setFlash({ type: 'error', text: upErr.message })
      return
    }
    const isFirst = cvs.length === 0
    const { error: insErr } = await supabase.from('cvs').insert({
      student_id: studentId,
      cv_type: 'UPLOADED',
      title: file.name,
      file_path: path,
      is_default: isFirst,
    })
    setUploading(false)
    e.target.value = ''
    if (insErr) {
      setFlash({ type: 'error', text: insErr.message })
    } else {
      setFlash({ type: 'success', text: 'CV uploaded successfully.' })
    }
    await refresh()
  }

  async function setDefault(cv) {
    await supabase.from('cvs').update({ is_default: false }).eq('student_id', studentId)
    await supabase.from('cvs').update({ is_default: true }).eq('id', cv.id)
    await refresh()
  }

  async function onDownload(cv) {
    const { data, error } = await supabase.storage.from('uploads').createSignedUrl(cv.file_path, 60)
    if (error) {
      setFlash({ type: 'error', text: error.message })
      return
    }
    window.open(data.signedUrl, '_blank')
  }

  async function onDelete() {
    if (!confirmCv) return
    setBusy(true)
    await supabase.storage.from('uploads').remove([confirmCv.file_path])
    await supabase.from('cvs').delete().eq('id', confirmCv.id)
    setBusy(false)
    setConfirmCv(null)
    setFlash({ type: 'success', text: 'CV removed.' })
    await refresh()
  }

  return (
    <Section
      title="CV / Resume"
      subtitle="Upload PDF or DOCX (max 5 MB). The default CV is attached to applications."
      icon={FileText}
      iconClass="bg-rose-500/10 text-rose-600"
      action={cvs.length > 0 ? <span className="badge badge-ghost badge-sm">{cvs.length}</span> : undefined}
    >
      <Flash message={flash} onDismiss={() => setFlash(null)} />
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-base-300 bg-base-200/30 px-6 py-7 text-center transition hover:border-primary/50 hover:bg-primary/[0.04]">
        <div className="rounded-full bg-primary/10 p-3 text-primary">
          {uploading ? <span className="loading loading-spinner" /> : <Upload className="h-6 w-6" />}
        </div>
        <p className="text-sm font-semibold">{uploading ? 'Uploading…' : 'Click to upload your CV'}</p>
        <p className="text-xs text-base-content/50">PDF or DOCX · max 5 MB</p>
        <input
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={onUpload}
          className="hidden"
          disabled={uploading}
        />
      </label>
      <div className="mt-4 flex flex-col gap-3">
        {!loaded ? (
          <div className="flex justify-center py-4"><span className="loading loading-spinner" /></div>
        ) : cvs.length === 0 ? (
          <p className="text-center text-sm text-base-content/50">No CV uploaded yet.</p>
        ) : cvs.map((cv) => (
          <div key={cv.id} className="flex flex-col gap-3 rounded-2xl border border-base-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="rounded-xl bg-rose-500/10 p-2.5 text-rose-600">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-bold">
                  <span className="truncate">{cv.title}</span>
                  {cv.is_default && <span className="badge badge-primary badge-sm">Default</span>}
                </p>
                <p className="mt-0.5 text-xs text-base-content/50">
                  {cv.cv_type.toLowerCase() === 'uploaded' ? 'Uploaded' : 'Online'} · v{cv.version} · {formatDate(cv.created_at)}
                </p>
                {!cv.is_default && (
                  <button type="button" className="link link-primary text-xs" onClick={() => setDefault(cv)}>
                    Set as default
                  </button>
                )}
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button type="button" className="btn btn-outline btn-sm" onClick={() => onDownload(cv)} disabled={uploading}>
                <Download className="h-4 w-4" /> View
              </button>
              <button type="button" className="btn btn-ghost btn-sm text-error" onClick={() => setConfirmCv(cv)}>
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>
      <ConfirmDialog
        open={Boolean(confirmCv)}
        title="Delete CV?"
        message={`"${confirmCv?.title}" will be permanently deleted.`}
        busy={busy}
        onConfirm={onDelete}
        onCancel={() => setConfirmCv(null)}
      />
    </Section>
  )
}
