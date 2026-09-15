import { useCallback, useEffect, useState } from 'react'
import { GraduationCap, Link2, Mail, Pencil } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useAlumniProfile } from '../../hooks/useProfiles'
import { formatDate } from '../../utils/format'
import { LoadingScreen } from '../../components/ui/LoadingScreen'

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
  const name = profile?.users?.name || 'Alumni'
  const initial = name.trim().charAt(0).toUpperCase() || 'A'

  const facts = [
    ['Student ID', profile?.student_id],
    ['Graduation Year', profile?.graduation_year],
    ['Department', profile?.department],
    ['Current Position', profile?.current_position],
    ['Current Company', profile?.current_company],
    ['Industry', profile?.industry],
  ].filter(([, v]) => v != null && String(v).trim() !== '')

  const contact = [
    ['LinkedIn', profile?.linkedin_url, 'href'],
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
                {profile?.department && <span className="badge badge-outline badge-sm">Dept: {profile.department}</span>}
                {profile?.graduation_year && <span className="badge badge-outline badge-sm">Grad: {profile.graduation_year}</span>}
                {profile?.is_verified && <span className="badge badge-success badge-sm">Verified</span>}
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
                    <Link2 className="h-4 w-4 text-base-content/50" />
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
  graduation_year: '',
  department: '',
  current_company: '',
  current_position: '',
  industry: '',
  linkedin_url: '',
  bio: '',
  name: '',
}

export default function AlumniProfilePage() {
  const { session } = useAuth()
  const { profile, loading, refresh } = useAlumniProfile()
  const [fields, setFields] = useState(EMPTY_FIELDS)
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState(null)
  const [mode, setMode] = useState('edit')
  const [completion, setCompletion] = useState({ percent: 0, done: 0, total: 0 })

  useEffect(() => {
    if (profile) {
      setFields({
        student_id: profile.student_id ?? '',
        graduation_year: profile.graduation_year ?? '',
        department: profile.department ?? '',
        current_company: profile.current_company ?? '',
        current_position: profile.current_position ?? '',
        industry: profile.industry ?? '',
        linkedin_url: profile.linkedin_url ?? '',
        bio: profile.bio ?? '',
        name: profile.users?.name ?? '',
      })
    }
  }, [profile])

  useEffect(() => {
    if (!profile) return
    const checks = [
      profile?.student_id,
      profile?.graduation_year,
      profile?.department,
      profile?.current_company,
      profile?.current_position,
      profile?.industry,
      profile?.linkedin_url,
      profile?.bio,
    ]
    const done = checks.filter(Boolean).length
    setCompletion({ percent: Math.round((done / checks.length) * 100), done, total: checks.length })
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
    const alumniRow = {
      user_id: session.user.id,
      student_id: fields.student_id || null,
      graduation_year: fields.graduation_year ? Number(fields.graduation_year) : null,
      department: fields.department || null,
      current_company: fields.current_company || null,
      current_position: fields.current_position || null,
      industry: fields.industry || null,
      linkedin_url: fields.linkedin_url || null,
      bio: fields.bio || null,
    }
    const { error } = await supabase.from('alumni').upsert(alumniRow, { onConflict: 'user_id' })
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
          <h1 className="text-2xl font-bold">Alumni Profile</h1>
          <p className="text-sm text-base-content/70">
            Tell the community what you are doing now so fellow alumni and students can reach out.
          </p>
        </div>
      </div>

      <Flash message={flash} />

      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div className="card-title text-base">Profile completeness</div>
            <span className={`text-2xl font-extrabold ${completion.percent >= 80 ? 'text-success' : 'text-primary'}`}>
              {completion.percent}%
            </span>
          </div>
          <progress className="progress progress-primary w-full" value={completion.percent} max="100" />
          <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
            {[
              'Student ID',
              'Graduation year',
              'Department',
              'Current company',
              'Current position',
              'Industry',
              'LinkedIn URL',
              'Bio',
            ].map((label, i) => (
              <span key={label} className={`badge badge-sm gap-1 ${i < completion.done ? 'badge-success' : 'badge-ghost'}`}>
                {i < completion.done ? '✓' : '○'} {label}
              </span>
            ))}
          </div>
        </div>
      </div>

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
          <Card title="Personal information" subtitle="Your details shown to students and fellow alumni.">
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
                <Field label="Student ID (former)">
                  <input
                    className="input input-bordered w-full"
                    placeholder="e.g. 2018-01-101-222"
                    value={fields.student_id}
                    onChange={set('student_id')}
                  />
                </Field>
                <Field label="Department">
                  <input
                    className="input input-bordered w-full"
                    placeholder="e.g. CSE"
                    value={fields.department}
                    onChange={set('department')}
                  />
                </Field>
                <Field label="Graduation year">
                  <input
                    className="input input-bordered w-full"
                    inputMode="numeric"
                    placeholder="e.g. 2024"
                    value={fields.graduation_year}
                    onChange={set('graduation_year')}
                  />
                </Field>
              </FieldGroup>

              <FieldGroup title="Current professional information">
                <Field label="Current company">
                  <input
                    className="input input-bordered w-full"
                    placeholder="Where do you work now?"
                    value={fields.current_company}
                    onChange={set('current_company')}
                  />
                </Field>
                <Field label="Current position">
                  <input
                    className="input input-bordered w-full"
                    placeholder="e.g. Software Engineer"
                    value={fields.current_position}
                    onChange={set('current_position')}
                  />
                </Field>
                <Field label="Industry">
                  <input
                    className="input input-bordered w-full"
                    placeholder="e.g. Software"
                    value={fields.industry}
                    onChange={set('industry')}
                  />
                </Field>
              </FieldGroup>

              <FieldGroup title="Contact & links">
                <Field label="LinkedIn URL">
                  <input
                    className="input input-bordered w-full"
                    placeholder="https://linkedin.com/in/..."
                    value={fields.linkedin_url}
                    onChange={set('linkedin_url')}
                  />
                </Field>
              </FieldGroup>

              <FieldGroup title="About you">
                <Field label="Bio" className="sm:col-span-2">
                  <textarea
                    className="textarea textarea-bordered w-full"
                    rows={3}
                    placeholder="A short summary of your career journey"
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
          <EducationSection alumniId={profile.id} />
          <SkillsSection alumniId={profile.id} />
          <ExperienceSection alumniId={profile.id} />
          <ProjectsSection alumniId={profile.id} />
          <CvSection alumniId={profile.id} />
        </>
      )}
    </div>
  )
}

function EducationSection({ alumniId }) {
  const [rows, setRows] = useState([])
  const [flash, setFlash] = useState(null)
  const [form, setForm] = useState({ degree: '', institution: '', field: '', start_year: '', end_year: '', gpa: '' })

  const refresh = useCallback(async () => {
    const { data } = await supabase.from('alumni_education').select('*').eq('alumni_id', alumniId).order('start_year', { ascending: false })
    setRows(data ?? [])
  }, [alumniId])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function onAdd() {
    if (!form.degree.trim()) return
    const { error } = await supabase.from('alumni_education').insert({
      alumni_id: alumniId,
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
    await supabase.from('alumni_education').delete().eq('id', id)
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

function SkillsSection({ alumniId }) {
  const [rows, setRows] = useState([])
  const [name, setName] = useState('')
  const [flash, setFlash] = useState(null)

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('alumni_skills')
      .select('id, skills(name)')
      .eq('alumni_id', alumniId)
      .order('id')
    setRows(data ?? [])
  }, [alumniId])

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
    const { error } = await supabase.from('alumni_skills').insert({ alumni_id: alumniId, skill_id: skillId })
    if (error) setFlash({ type: 'error', text: error.message })
    else setName('')
    await refresh()
  }

  async function onDelete(id) {
    await supabase.from('alumni_skills').delete().eq('id', id)
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

function ExperienceSection({ alumniId }) {
  const [rows, setRows] = useState([])
  const [flash, setFlash] = useState(null)
  const [form, setForm] = useState({ role: '', company: '', location: '', start_date: '', end_date: '', is_current: false, description: '' })

  const refresh = useCallback(async () => {
    const { data } = await supabase.from('alumni_experience').select('*').eq('alumni_id', alumniId).order('start_date', { ascending: false })
    setRows(data ?? [])
  }, [alumniId])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function onAdd() {
    if (!form.role.trim()) return
    const { error } = await supabase.from('alumni_experience').insert({
      alumni_id: alumniId,
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
    await supabase.from('alumni_experience').delete().eq('id', id)
    await refresh()
  }

  return (
    <Card title="Experience" subtitle="Work history.">
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

function ProjectsSection({ alumniId }) {
  const [rows, setRows] = useState([])
  const [flash, setFlash] = useState(null)
  const [form, setForm] = useState({ title: '', description: '', link: '', start_year: '', end_year: '' })

  const refresh = useCallback(async () => {
    const { data } = await supabase.from('alumni_projects').select('*').eq('alumni_id', alumniId).order('start_year', { ascending: false })
    setRows(data ?? [])
  }, [alumniId])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function onAdd() {
    if (!form.title.trim()) return
    const { error } = await supabase.from('alumni_projects').insert({
      alumni_id: alumniId,
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
    await supabase.from('alumni_projects').delete().eq('id', id)
    await refresh()
  }

  return (
    <Card title="Projects" subtitle="Notable projects.">
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

function CvSection({ alumniId }) {
  const { session } = useAuth()
  const [cvs, setCvs] = useState([])
  const [flash, setFlash] = useState(null)
  const [uploading, setUploading] = useState(false)

  const refresh = useCallback(async () => {
    const { data } = await supabase.from('alumni_cvs').select('*').eq('alumni_id', alumniId).order('created_at', { ascending: false })
    setCvs(data ?? [])
  }, [alumniId])

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
    const { error: insErr } = await supabase.from('alumni_cvs').insert({
      alumni_id: alumniId,
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
    await supabase.from('alumni_cvs').update({ is_default: false }).eq('alumni_id', alumniId)
    await supabase.from('alumni_cvs').update({ is_default: true }).eq('id', cv.id)
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
    await supabase.from('alumni_cvs').delete().eq('id', cv.id)
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