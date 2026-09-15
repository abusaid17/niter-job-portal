import { useCallback, useEffect, useState } from 'react'
import { GraduationCap, Link2, Mail, Pencil, Phone } from 'lucide-react'
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

function Card({ title, subtitle, children }) {
  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        <h2 className="card-title">{title}</h2>
        {subtitle && <p className="text-sm text-base-content/60">{subtitle}</p>}
        <div className="mt-2">{children}</div>
      </div>
    </div>
  )
}

function Flash({ message }) {
  if (!message) return null
  return (
    <div role="alert" className={`alert text-sm ${message.type === 'error' ? 'alert-error' : 'alert-success'}`}>
      {message.text}
    </div>
  )
}

function FieldGroup({ title, children }) {
  return (
    <section>
      <div className="flex items-center gap-3">
        <h3 className="whitespace-nowrap text-sm font-semibold uppercase tracking-wide text-base-content/60">
          {title}
        </h3>
        <div className="h-px flex-1 bg-base-200" />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </section>
  )
}

function Field({ label, required, className = '', children }) {
  return (
    <label className={`form-control ${className}`}>
      <div className="label pb-1.5">
        <span className="label-text font-medium">
          {label}
          {required && <span className="text-error"> *</span>}
        </span>
      </div>
      {children}
    </label>
  )
}

function ProfileView({ profile, email, onEdit }) {
  const name = profile?.users?.name || 'Student'
  const initial = name.trim().charAt(0).toUpperCase() || 'S'

  const facts = [
    ['Student ID', profile?.student_id],
    ['Department', profile?.department ? deptLabel(profile.department) : null],
    ['Session', profile?.batch],
    ['Semester', profile?.semester],
    ['CGPA', profile?.cgpa != null ? Number(profile.cgpa).toFixed(2) : null],
  ].filter(([, v]) => v != null && String(v).trim() !== '')

  const contact = [
    ['Phone', profile?.phone, 'tel'],
    ['LinkedIn', profile?.linkedin_url, 'href'],
    ['GitHub', profile?.github_url, 'href'],
    ['Portfolio', profile?.portfolio_url, 'href'],
  ].filter(([, v]) => v != null && String(v).trim() !== '')

  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-box bg-primary text-2xl font-extrabold text-primary-content">
              {initial}
            </div>
            <div className="min-w-0">
              <h2 className="card-title text-xl">{name}</h2>
              {email && (
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-base-content/60">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{email}</span>
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {profile?.department && <span className="badge badge-outline badge-sm">Dept: {deptLabel(profile.department)}</span>}
              </div>
            </div>
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
            Edit profile
          </button>
        </div>

        {facts.length > 0 && (
          <div className="mt-6 border-t border-base-200 pt-6">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-4 w-4 text-base-content/50" />
              <h3 className="text-sm font-semibold uppercase tracking-wide text-base-content/60">
                Academic information
              </h3>
              <div className="h-px flex-1 bg-base-200" />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
              {facts.map(([label, value]) => (
                <div key={label}>
                  <div className="text-xs uppercase tracking-wide text-base-content/50">{label}</div>
                  <div className="mt-0.5 text-sm font-medium">{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {contact.length > 0 && (
          <div className="mt-6 border-t border-base-200 pt-6">
            <div className="flex items-center gap-3">
              <Link2 className="h-4 w-4 text-base-content/50" />
              <h3 className="text-sm font-semibold uppercase tracking-wide text-base-content/60">Contact & links</h3>
              <div className="h-px flex-1 bg-base-200" />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
              {contact.map(([, value, kind]) => {
                const row = (
                  <>
                    {kind === 'tel' ? <Phone className="h-4 w-4 text-base-content/50" /> : <Link2 className="h-4 w-4 text-base-content/50" />}
                    <span className="break-all">{value}</span>
                  </>
                )
                return (
                  <div key={value} className="flex items-center gap-2 text-sm text-base-content/80">
                    {kind === 'tel' || kind === 'href' ? (
                      <a
                        className={`flex min-w-0 items-center gap-2 ${kind === 'href' ? 'link link-primary' : ''}`}
                        href={kind === 'tel' ? `tel:${value}` : value}
                        target={kind === 'href' ? '_blank' : undefined}
                        rel={kind === 'href' ? 'noreferrer noopener' : undefined}
                      >
                        {row}
                      </a>
                    ) : (
                      row
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {profile?.bio && (
          <div className="mt-6 border-t border-base-200 pt-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-base-content/60">About</h3>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-base-content/80">{profile.bio}</p>
          </div>
        )}
      </div>
    </div>
  )
}

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
  const [mode, setMode] = useState('edit')

  useEffect(() => {
    if (profile) {
      setFields({
        student_id: profile.student_id ?? '',
        department: deptCode(profile.department ?? '') ?? '',
        session: profile.batch ?? '',
        semester: profile.semester ?? '',
        cgpa: profile.cgpa ?? '',
        phone: profile.phone ?? '',
        linkedin_url: profile.linkedin_url ?? '',
        github_url: profile.github_url ?? '',
        portfolio_url: profile.portfolio_url ?? '',
        bio: profile.bio ?? '',
        name: profile.users?.name ?? '',
      })
    }
  }, [profile])

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
      setFlash({ type: 'success', text: 'Profile saved.' })
      await refresh()
      setMode('view')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">My Profile</h1>
          <p className="text-sm text-base-content/70">
            Your details help recruiters and faculty understand your background.
          </p>
        </div>
      </div>

      <Flash message={flash} />

      {mode === 'view' ? (
        <ProfileView
          profile={profile}
          email={session.user.email}
          onEdit={() => {
            setMode('edit')
            setFlash(null)
          }}
        />
      ) : (
        <form onSubmit={onSave}>
          <Card title="Personal information" subtitle="Your student record shown to companies you apply to.">
            <div className="space-y-8">
              <FieldGroup title="Academic information">
                <Field label="Full name">
                  <input
                    className="input input-bordered w-full"
                    placeholder="As on your NITER records"
                    value={fields.name}
                    onChange={set('name')}
                  />
                </Field>
                <Field label="Student ID" required>
                  <input
                    className="input input-bordered w-full"
                    placeholder="e.g. CS 2203048"
                    value={fields.student_id}
                    onChange={set('student_id')}
                    required
                  />
                </Field>
                <Field label="Department">
                  <select
                    className="select select-bordered w-full"
                    value={fields.department}
                    onChange={set('department')}
                  >
                    <option value="">Select department</option>
                    {STUDENT_DEPARTMENTS.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Session">
                  <select
                    className="select select-bordered w-full"
                    value={fields.session}
                    onChange={set('session')}
                  >
                    <option value="">Select session</option>
                    {SESSIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Semester">
                  <input
                    className="input input-bordered w-full"
                    placeholder="e.g. 8"
                    value={fields.semester}
                    onChange={set('semester')}
                  />
                </Field>
                <Field label="CGPA">
                  <input
                    className="input input-bordered w-full"
                    placeholder="e.g. 3.75"
                    value={fields.cgpa}
                    onChange={set('cgpa')}
                  />
                </Field>
              </FieldGroup>

              <FieldGroup title="Contact information">
                <Field label="Phone">
                  <input
                    className="input input-bordered w-full"
                    placeholder="+8801XXXXXXXXX"
                    value={fields.phone}
                    onChange={set('phone')}
                  />
                </Field>
                <Field label="LinkedIn URL">
                  <input
                    className="input input-bordered w-full"
                    placeholder="https://linkedin.com/in/..."
                    value={fields.linkedin_url}
                    onChange={set('linkedin_url')}
                  />
                </Field>
                <Field label="GitHub URL">
                  <input
                    className="input input-bordered w-full"
                    placeholder="https://github.com/..."
                    value={fields.github_url}
                    onChange={set('github_url')}
                  />
                </Field>
                <Field label="Portfolio URL">
                  <input
                    className="input input-bordered w-full"
                    placeholder="https://..."
                    value={fields.portfolio_url}
                    onChange={set('portfolio_url')}
                  />
                </Field>
              </FieldGroup>

              <FieldGroup title="About you">
                <Field label="Bio" className="sm:col-span-2">
                  <textarea
                    className="textarea textarea-bordered w-full"
                    rows={3}
                    placeholder="A short summary about yourself"
                    value={fields.bio}
                    onChange={set('bio')}
                  />
                </Field>
              </FieldGroup>
            </div>
            <div className="mt-8 flex justify-end">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <span className="loading loading-spinner loading-xs" /> : 'Save profile'}
              </button>
            </div>
          </Card>
        </form>
      )}

      {profile?.id && (
        <>
          <EducationSection studentId={profile.id} />
          <SkillsSection studentId={profile.id} />
          <ExperienceSection studentId={profile.id} />
          <ProjectsSection studentId={profile.id} />
          <CvSection studentId={profile.id} />
        </>
      )}
    </div>
  )
}

function EducationSection({ studentId }) {
  const [rows, setRows] = useState([])
  const [flash, setFlash] = useState(null)
  const [form, setForm] = useState({ degree: '', institution: '', field: '', start_year: '', end_year: '', gpa: '' })

  const refresh = useCallback(async () => {
    const { data } = await supabase.from('education').select('*').eq('student_id', studentId).order('start_year', { ascending: false })
    setRows(data ?? [])
  }, [studentId])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function onAdd() {
    if (!form.degree.trim()) return
    const { error } = await supabase.from('education').insert({
      student_id: studentId,
      degree: form.degree,
      institution: form.institution || null,
      field: form.field || null,
      start_year: form.start_year ? Number(form.start_year) : null,
      end_year: form.end_year ? Number(form.end_year) : null,
      gpa: form.gpa ? Number(form.gpa) : null,
    })
    if (error) setFlash({ type: 'error', text: error.message })
    else setForm({ degree: '', institution: '', field: '', start_year: '', end_year: '', gpa: '' })
    await refresh()
  }

  async function onDelete(id) {
    await supabase.from('education').delete().eq('id', id)
    await refresh()
  }

  return (
    <Card title="Education" subtitle="Degrees and certifications.">
      <Flash message={flash} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
        <input className="input input-bordered col-span-2" placeholder="Degree" value={form.degree} onChange={(e) => setForm({ ...form, degree: e.target.value })} />
        <input className="input input-bordered col-span-2" placeholder="Institution" value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} />
        <input className="input input-bordered col-span-2" placeholder="Field of study" value={form.field} onChange={(e) => setForm({ ...form, field: e.target.value })} />
        <input className="input input-bordered" placeholder="From" inputMode="numeric" value={form.start_year} onChange={(e) => setForm({ ...form, start_year: e.target.value })} />
        <input className="input input-bordered" placeholder="To" inputMode="numeric" value={form.end_year} onChange={(e) => setForm({ ...form, end_year: e.target.value })} />
        <input className="input input-bordered" placeholder="GPA" value={form.gpa} onChange={(e) => setForm({ ...form, gpa: e.target.value })} />
        <button type="button" className="btn btn-sm btn-primary" onClick={onAdd}>
          Add
        </button>
      </div>
      <div className="mt-4 flex flex-col gap-2">
        {rows.length === 0 && <p className="text-sm text-base-content/50">No education added.</p>}
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-3 rounded-box border border-base-300 px-4 py-3">
            <div>
              <div className="font-medium">{r.degree || 'Degree'}</div>
              <div className="text-sm text-base-content/70">
                {[r.institution, r.field, [r.start_year, r.end_year].filter(Boolean).join(' – '), r.gpa ? `GPA ${r.gpa}` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            </div>
            <button type="button" className="btn btn-ghost btn-sm btn-error" onClick={() => onDelete(r.id)}>
              Delete
            </button>
          </div>
        ))}
      </div>
    </Card>
  )
}

function SkillsSection({ studentId }) {
  const [rows, setRows] = useState([])
  const [name, setName] = useState('')
  const [flash, setFlash] = useState(null)

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('student_skills')
      .select('id, skills(name)')
      .eq('student_id', studentId)
      .order('id')
    setRows(data ?? [])
  }, [studentId])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function onAdd() {
    if (!name.trim()) return
    const { data: existing } = await supabase.from('skills').select('id').eq('name', name.trim()).maybeSingle()
    let skillId = existing?.id
    if (!skillId) {
      const { data, error } = await supabase.from('skills').insert({ name: name.trim() }).select('id').single()
      if (error) {
        setFlash({ type: 'error', text: error.message })
        return
      }
      skillId = data.id
    }
    const { error } = await supabase.from('student_skills').insert({ student_id: studentId, skill_id: skillId })
    if (error) setFlash({ type: 'error', text: error.message })
    else setName('')
    await refresh()
  }

  async function onDelete(id) {
    await supabase.from('student_skills').delete().eq('id', id)
    await refresh()
  }

  return (
    <Card title="Skills" subtitle="Technologies and competencies.">
      <Flash message={flash} />
      <div className="flex gap-2">
        <input className="input input-bordered flex-1" placeholder="e.g. React, SQL, Python" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onAdd())} />
        <button type="button" className="btn btn-primary" onClick={onAdd}>
          Add
        </button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {rows.length === 0 && <p className="text-sm text-base-content/50">No skills added.</p>}
        {rows.map((r) => (
          <span key={r.id} className="badge badge-outline gap-2 px-3 py-3">
            {r.skills?.name}
            <button type="button" className="cursor-pointer text-error" onClick={() => onDelete(r.id)} title="Remove skill">
              ✕
            </button>
          </span>
        ))}
      </div>
    </Card>
  )
}

function ExperienceSection({ studentId }) {
  const [rows, setRows] = useState([])
  const [flash, setFlash] = useState(null)
  const [form, setForm] = useState({ role: '', company: '', location: '', start_date: '', end_date: '', is_current: false, description: '' })

  const refresh = useCallback(async () => {
    const { data } = await supabase.from('experience').select('*').eq('student_id', studentId).order('start_date', { ascending: false })
    setRows(data ?? [])
  }, [studentId])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function onAdd() {
    if (!form.role.trim()) return
    const { error } = await supabase.from('experience').insert({
      student_id: studentId,
      role: form.role,
      company: form.company || null,
      location: form.location || null,
      start_date: form.start_date || null,
      end_date: form.is_current ? null : form.end_date || null,
      is_current: form.is_current,
      description: form.description || null,
    })
    if (error) setFlash({ type: 'error', text: error.message })
    else setForm({ role: '', company: '', location: '', start_date: '', end_date: '', is_current: false, description: '' })
    await refresh()
  }

  async function onDelete(id) {
    await supabase.from('experience').delete().eq('id', id)
    await refresh()
  }

  return (
    <Card title="Experience" subtitle="Work and internship history.">
      <Flash message={flash} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input className="input input-bordered" placeholder="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
        <input className="input input-bordered" placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
        <input className="input input-bordered" placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <input className="input input-bordered" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          <input className="input input-bordered" type="date" value={form.end_date} disabled={form.is_current} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
        </div>
        <label className="col-span-2 flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" className="toggle toggle-sm" checked={form.is_current} onChange={(e) => setForm({ ...form, is_current: e.target.checked })} />
          I currently work here
        </label>
        <input className="input input-bordered col-span-1 sm:col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <button type="button" className="btn btn-sm btn-primary justify-self-end" onClick={onAdd}>
          Add
        </button>
      </div>
      <div className="mt-4 flex flex-col gap-2">
        {rows.length === 0 && <p className="text-sm text-base-content/50">No experience added.</p>}
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-3 rounded-box border border-base-300 px-4 py-3">
            <div>
              <div className="font-medium">
                {r.role} {r.is_current && <span className="badge badge-success badge-sm ml-1">Current</span>}
              </div>
              <div className="text-sm text-base-content/70">
                {[r.company, r.location, [r.start_date, r.end_date].filter(Boolean).map((d) => formatDate(d)).join(' – ')]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            </div>
            <button type="button" className="btn btn-ghost btn-sm btn-error" onClick={() => onDelete(r.id)}>
              Delete
            </button>
          </div>
        ))}
      </div>
    </Card>
  )
}

function ProjectsSection({ studentId }) {
  const [rows, setRows] = useState([])
  const [flash, setFlash] = useState(null)
  const [form, setForm] = useState({ title: '', description: '', link: '', start_year: '', end_year: '' })

  const refresh = useCallback(async () => {
    const { data } = await supabase.from('projects').select('*').eq('student_id', studentId).order('start_year', { ascending: false })
    setRows(data ?? [])
  }, [studentId])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function onAdd() {
    if (!form.title.trim()) return
    const { error } = await supabase.from('projects').insert({
      student_id: studentId,
      title: form.title,
      description: form.description || null,
      link: form.link || null,
      start_year: form.start_year ? Number(form.start_year) : null,
      end_year: form.end_year ? Number(form.end_year) : null,
    })
    if (error) setFlash({ type: 'error', text: error.message })
    else setForm({ title: '', description: '', link: '', start_year: '', end_year: '' })
    await refresh()
  }

  async function onDelete(id) {
    await supabase.from('projects').delete().eq('id', id)
    await refresh()
  }

  return (
    <Card title="Projects" subtitle="Personal and academic projects.">
      <Flash message={flash} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input className="input input-bordered" placeholder="Project title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input className="input input-bordered" placeholder="Link" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
        <input className="input input-bordered" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <input className="input input-bordered" placeholder="From year" inputMode="numeric" value={form.start_year} onChange={(e) => setForm({ ...form, start_year: e.target.value })} />
          <input className="input input-bordered" placeholder="To year" inputMode="numeric" value={form.end_year} onChange={(e) => setForm({ ...form, end_year: e.target.value })} />
        </div>
        <button type="button" className="btn btn-sm btn-primary justify-self-end" onClick={onAdd}>
          Add
        </button>
      </div>
      <div className="mt-4 flex flex-col gap-2">
        {rows.length === 0 && <p className="text-sm text-base-content/50">No projects added.</p>}
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-3 rounded-box border border-base-300 px-4 py-3">
            <div>
              <div className="font-medium">{r.title}</div>
              <div className="text-sm text-base-content/70">
                {[r.description, [r.start_year, r.end_year].filter(Boolean).join(' – ')].filter(Boolean).join(' · ')}
              </div>
              {r.link && (
                <a className="link link-primary text-sm" href={r.link} target="_blank" rel="noreferrer noopener">
                  {r.link}
                </a>
              )}
            </div>
            <button type="button" className="btn btn-ghost btn-sm btn-error" onClick={() => onDelete(r.id)}>
              Delete
            </button>
          </div>
        ))}
      </div>
    </Card>
  )
}

function CvSection({ studentId }) {
  const { session } = useAuth()
  const [cvs, setCvs] = useState([])
  const [flash, setFlash] = useState(null)
  const [uploading, setUploading] = useState(false)

  const refresh = useCallback(async () => {
    const { data } = await supabase.from('cvs').select('*').eq('student_id', studentId).order('created_at', { ascending: false })
    setCvs(data ?? [])
  }, [studentId])

  useEffect(() => {
    refresh()
  }, [refresh])

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
      setFlash({ type: 'success', text: 'CV uploaded.' })
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

  async function onDelete(cv) {
    await supabase.storage.from('uploads').remove([cv.file_path])
    await supabase.from('cvs').delete().eq('id', cv.id)
    await refresh()
  }

  return (
    <Card title="CV" subtitle="Upload your CV (PDF/DOCX, max 5 MB) to attach to applications.">
      <Flash message={flash} />
      <input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={onUpload} className="file-input file-input-bordered w-full max-w-sm" />
      <div className="mt-4 flex flex-col gap-2">
        {cvs.length === 0 && <p className="text-sm text-base-content/50">No CV uploaded yet.</p>}
        {cvs.map((cv) => (
          <div key={cv.id} className="flex flex-wrap items-center justify-between gap-3 rounded-box border border-base-300 px-4 py-3">
            <div>
              <div className="font-medium">
                {cv.title}{' '}
                {cv.is_default ? (
                  <span className="badge badge-primary badge-sm ml-1">Default</span>
                ) : (
                  <button type="button" className="link link-primary text-xs" onClick={() => setDefault(cv)}>
                    Set default
                  </button>
                )}
              </div>
              <div className="text-xs text-base-content/60">
                {cv.cv_type.toLowerCase() === 'uploaded' ? 'Uploaded' : 'Online'} · v{cv.version} · {formatDate(cv.created_at)}
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn btn-sm" onClick={() => onDownload(cv)} disabled={uploading}>
                Download
              </button>
              <button type="button" className="btn btn-ghost btn-sm btn-error" onClick={() => onDelete(cv)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}