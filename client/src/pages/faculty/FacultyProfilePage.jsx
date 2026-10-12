import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useFacultyProfile } from '../../hooks/useProfiles'
import { LoadingScreen } from '../../components/ui/LoadingScreen'
import { AlertCircle, Briefcase, CheckCircle2, GraduationCap, Mail, Pencil, Save, User, X } from 'lucide-react'

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

function InfoItem({ label, value }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-base-content/40">{label}</div>
      <div className="mt-1 break-words text-sm font-medium">{value ?? '—'}</div>
    </div>
  )
}

const inputCls = 'input input-bordered w-full'

export default function FacultyProfilePage() {
  const { session, profile } = useAuth()
  const { profile: faculty, loading, refresh } = useFacultyProfile()
  const [mode, setMode] = useState('view')
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    if (profile?.name) {
      setName(profile.name)
      setDisplayName(profile.name)
    } else if (session?.user?.email) {
      setDisplayName(session.user.email.split('@')[0])
    }
  }, [profile?.name, session?.user?.email])

  if (loading) return <LoadingScreen />

  const email = session?.user?.email
  const shownName = displayName || 'Faculty'
  const initial = (shownName.trim().charAt(0).toUpperCase() || 'F')

  async function onSave(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setMessage({ type: 'error', text: 'Full name is required.' })
      return
    }
    setSaving(true)
    setMessage(null)
    // NOTE: faculty rows are admin-managed (RLS has no self-write policy),
    // so only the account display name (own users row) is editable here.
    const { error } = await supabase.from('users').update({ name: trimmed }).eq('id', session.user.id)
    setSaving(false)
    if (error) {
      setMessage({ type: 'error', text: error.message })
      return
    }
    setDisplayName(trimmed)
    setMessage({ type: 'success', text: 'Profile updated successfully.' })
    await refresh()
    setMode('view')
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 sm:gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">My Profile</h1>
        <p className="mt-1 text-sm text-base-content/60">
          Your faculty account details. Role information is managed by an administrator.
        </p>
      </div>

      {message && (
        <div role="alert" className={`alert shadow-sm ${message.type === 'error' ? 'alert-error' : 'alert-success'} text-sm`}>
          {message.type === 'error'
            ? <AlertCircle className="h-5 w-5 shrink-0" />
            : <CheckCircle2 className="h-5 w-5 shrink-0" />}
          <span>{message.text}</span>
          <button type="button" className="btn btn-ghost btn-xs ml-auto" onClick={() => setMessage(null)} aria-label="Dismiss message">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* header */}
      <div className="card overflow-hidden border border-base-200 bg-base-100 shadow-sm">
        <div className="h-24 bg-gradient-to-r from-primary via-primary/80 to-secondary sm:h-28" />
        <div className="card-body px-5 pb-5 pt-0 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="-mt-8 flex items-end gap-3 sm:-mt-10">
              <div className="avatar">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary text-3xl font-extrabold text-primary-content ring-4 ring-base-100 sm:h-24 sm:w-24">
                  {initial}
                </div>
              </div>
              <div className="min-w-0 pb-0.5">
                <h2 className="truncate text-xl font-extrabold sm:text-2xl">{shownName}</h2>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {faculty?.designation && <span className="badge badge-primary badge-sm">{faculty.designation}</span>}
                  {faculty?.department && <span className="badge badge-outline badge-sm">{faculty.department}</span>}
                  {!faculty && <span className="badge badge-ghost badge-sm">No faculty record linked yet</span>}
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
              <button type="button" className="btn btn-primary shrink-0" onClick={() => { setMode('edit'); setMessage(null) }}>
                <Pencil className="h-4 w-4" />
                Edit Profile
              </button>
            ) : (
              <button type="button" className="btn btn-ghost shrink-0" onClick={() => { setMode('view'); setMessage(null) }}>
                <X className="h-4 w-4" />
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {mode === 'view' ? (
        <>
          <Section
            title="Personal Information"
            subtitle="How you appear across the portal."
            icon={User}
            action={
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setMode('edit')}>
                <Pencil className="h-4 w-4" /> Edit
              </button>
            }
          >
            <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
              <InfoItem label="Full name" value={shownName} />
              <InfoItem label="Email" value={email} />
            </div>
          </Section>

          <Section
            title="Professional Details"
            subtitle="Managed by your administrator — contact them to update these."
            icon={Briefcase}
            iconClass="bg-violet-500/10 text-violet-600"
          >
            {faculty ? (
              <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                <InfoItem label="Department" value={faculty.department} />
                <InfoItem label="Designation" value={faculty.designation} />
                <InfoItem label="Employee ID" value={faculty.employee_id} />
              </div>
            ) : (
              <p className="text-sm text-base-content/60">
                No faculty record is linked to your account yet. Please contact an admin to create one.
              </p>
            )}
          </Section>
        </>
      ) : (
        <form onSubmit={onSave}>
          <Section title="Personal Information" subtitle="Your account display name." icon={User}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="form-control w-full">
                <div className="label pb-1">
                  <span className="label-text text-sm font-medium">Full name <span className="text-error">*</span></span>
                </div>
                <input
                  className={inputCls}
                  placeholder="e.g. Dr. Rahim Uddin"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </label>
              <div className="form-control w-full">
                <div className="label pb-1">
                  <span className="label-text text-sm font-medium">Email</span>
                </div>
                <input className={`${inputCls} input-disabled`} value={email ?? ''} disabled readOnly />
                <div className="label pt-1">
                  <span className="label-text-alt text-base-content/50">Login email — cannot be changed here</span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-start gap-2 rounded-2xl border border-base-200 bg-base-200/40 p-3 text-xs text-base-content/60">
              <GraduationCap className="h-4 w-4 shrink-0" />
              <span>Department, designation and employee ID are managed by an administrator and cannot be edited here.</span>
            </div>
            <div className="mt-6 flex flex-col-reverse justify-end gap-2 border-t border-base-200 pt-5 sm:flex-row">
              <button type="button" className="btn btn-ghost" onClick={() => setMode('view')} disabled={saving}>
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
    </div>
  )
}
