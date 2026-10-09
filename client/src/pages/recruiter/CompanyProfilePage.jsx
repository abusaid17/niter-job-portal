import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useRecruiterProfile } from '../../hooks/useProfiles'
import { COMPANY_SIZE } from '../../utils/labels'
import { LoadingScreen } from '../../components/ui/LoadingScreen'
import {
  AlertCircle,
  BadgeCheck,
  Briefcase,
  Building2,
  CheckCircle2,
  ExternalLink,
  FileText,
  Globe,
  Link2,
  Mail,
  MapPin,
  Pencil,
  Save,
  User,
  Users,
  X,
} from 'lucide-react'

/* ---------- shared UI (consistent with Student Profile page) ---------- */

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

function Field({ label, required, hint, error, className = '', children }) {
  return (
    <div className={`form-control w-full ${className}`}>
      <div className="label pb-1">
        <span className="label-text text-sm font-medium">
          {label}
          {required && <span className="text-error"> *</span>}
        </span>
      </div>
      {children}
      {error && <p className="mt-1 flex items-center gap-1 text-xs text-error">✕ {error.message}</p>}
      {hint && !error && <p className="mt-1 text-xs text-base-content/50">{hint}</p>}
    </div>
  )
}

function InfoItem({ label, value, href }) {
  if (value == null || String(value).trim() === '') {
    return (
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-base-content/40">{label}</div>
        <div className="mt-1 text-sm text-base-content/40">—</div>
      </div>
    )
  }
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-base-content/40">{label}</div>
      <div className="mt-1 break-words text-sm font-medium">
        {href ? (
          <a href={href} target="_blank" rel="noreferrer noopener" className="link link-primary">
            {value}
          </a>
        ) : (
          value
        )}
      </div>
    </div>
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

function VerificationBadge({ status, size = 'md' }) {
  const verified = status === 'VERIFIED'
  return (
    <span className={`badge ${size === 'lg' ? 'badge-lg' : 'badge-sm'} ${verified ? 'badge-success' : 'badge-warning'}`}>
      {verified ? (
        <>
          <BadgeCheck className="h-4 w-4" />
          Verified
        </>
      ) : (
        <>
          <span className="loading loading-spinner loading-xs" />
          {status === 'REJECTED' ? 'Rejected' : 'Pending verification'}
        </>
      )}
    </span>
  )
}

const inputCls = 'input input-bordered w-full'

/* ---------- page ---------- */

export default function CompanyProfilePage() {
  const { session, profile } = useAuth()
  const { recruiter, company, loading, refresh } = useRecruiterProfile()
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [mode, setMode] = useState('view')
  const [jobCount, setJobCount] = useState(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      full_name: '',
      name: '',
      industry: '',
      company_size: '1-10',
      location: '',
      website: '',
      logo_url: '',
      description: '',
      designation: 'Recruiter',
    },
  })

  const logoPreview = watch('logo_url')

  useEffect(() => {
    if (!loading && (company || recruiter || profile)) {
      reset({
        full_name: profile?.name ?? '',
        name: company?.name ?? '',
        industry: company?.industry ?? '',
        company_size: company?.company_size ?? '1-10',
        location: company?.location ?? '',
        website: company?.website ?? '',
        // DB column is `companies.logo`; the form keeps the friendlier `logo_url` name.
        logo_url: company?.logo_url ?? company?.logo ?? '',
        description: company?.description ?? '',
        designation: recruiter?.designation ?? 'Recruiter',
      })
    }
  }, [loading, company, recruiter, profile, reset])

  // Read-only context: how many jobs this company has posted (never blocks saving).
  useEffect(() => {
    const companyId = company?.id ?? recruiter?.company_id
    if (!companyId) {
      setJobCount(null)
      return
    }
    let active = true
    supabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .then(({ count }) => {
        if (active) setJobCount(typeof count === 'number' ? count : null)
      })
    return () => { active = false }
  }, [company?.id, recruiter?.company_id])

  const completion = useMemo(() => {
    const checks = [
      ['Your name', Boolean((profile?.name ?? '').trim())],
      ['Designation', Boolean((recruiter?.designation ?? '').trim())],
      ['Company name', Boolean(company?.name?.trim())],
      ['Industry', Boolean(company?.industry?.trim())],
      ['Company size', Boolean(company?.company_size)],
      ['Location', Boolean(company?.location?.trim())],
      ['Website', Boolean(company?.website?.trim())],
      ['Logo', Boolean((company?.logo_url ?? company?.logo ?? '').trim())],
      ['Description', Boolean(company?.description?.trim())],
    ]
    const done = checks.filter(([, v]) => v).length
    return { checks, done, total: checks.length, pct: Math.round((done / checks.length) * 100) }
  }, [profile, recruiter, company])

  if (loading) {
    return <LoadingScreen />
  }

  const companyId = company?.id ?? recruiter?.company_id
  const hasCompany = Boolean(company || companyId)
  const displayName = profile?.name || session?.user?.email?.split('@')[0] || 'Recruiter'
  const initial = (displayName.trim().charAt(0).toUpperCase() || 'R')
  const email = session?.user?.email
  const logo = company?.logo_url ?? company?.logo
  const isVerified = company?.verification_status === 'VERIFIED'

  async function onSubmit(values) {
    setSaving(true)
    setMessage(null)
    try {
      const targetCompanyId = company?.id ?? recruiter?.company_id
      if (!targetCompanyId) {
        throw new Error('No company linked to your recruiter profile. Please contact an admin to link your company.')
      }

      // NOTE: the database column is `companies.logo` (there is no `logo_url`
      // column in the schema). The form field keeps the `logo_url` name for
      // clarity but is persisted to `logo`.
      const { error } = await supabase
        .from('companies')
        .update({
          name: values.name,
          industry: values.industry || null,
          company_size: values.company_size,
          location: values.location || null,
          website: values.website || null,
          logo: values.logo_url || null,
          description: values.description || null,
        })
        .eq('id', targetCompanyId)
      if (error) throw error

      // Upsert recruiter with onConflict on user_id (unique constraint).
      // `is_verified` is intentionally preserved — only admins can verify.
      const { error: recError } = await supabase
        .from('recruiters')
        .upsert({
          user_id: session.user.id,
          company_id: targetCompanyId,
          designation: values.designation || 'Recruiter',
          is_verified: recruiter?.is_verified ?? false,
        }, { onConflict: 'user_id' })
      if (recError) throw recError

      // Recruiter's own display name lives on `users` (own row — allowed by RLS).
      if (values.full_name && values.full_name.trim() && values.full_name.trim() !== (profile?.name ?? '')) {
        const { error: nameError } = await supabase
          .from('users')
          .update({ name: values.full_name.trim() })
          .eq('id', session.user.id)
        if (nameError) throw nameError
      }

      await refresh()
      setMessage({ type: 'success', text: 'Profile updated successfully.' })
      setMode('view')
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 sm:gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Recruiter Profile</h1>
        <p className="mt-1 text-sm text-base-content/60">
          Your details are reviewed by admins before they are shown to students.
        </p>
      </div>

      <Flash message={message} onDismiss={() => setMessage(null)} />

      {/* ---------- profile header ---------- */}
      <div className="card overflow-hidden border border-base-200 bg-base-100 shadow-sm">
        <div className="h-24 bg-gradient-to-r from-primary via-primary/80 to-secondary sm:h-28" />
        <div className="card-body px-5 pb-5 pt-0 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="-mt-8 flex flex-col gap-3 sm:-mt-10 sm:flex-row sm:items-end">
              {logo ? (
                <div className="avatar">
                  <div className="h-20 w-20 rounded-3xl bg-base-100 object-contain ring-4 ring-base-100 sm:h-24 sm:w-24">
                    <img src={logo} alt={company?.name ?? 'Company logo'} className="h-full w-full rounded-3xl border border-base-200 object-contain" />
                  </div>
                </div>
              ) : (
                <div className="avatar">
                  <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary text-3xl font-extrabold text-primary-content ring-4 ring-base-100 sm:h-24 sm:w-24">
                    {initial}
                  </div>
                </div>
              )}
              <div className="min-w-0 pb-0.5">
                <h2 className="truncate text-xl font-extrabold sm:text-2xl">{displayName}</h2>
                <p className="mt-0.5 truncate text-sm text-base-content/60">
                  {recruiter?.designation || 'Recruiter'}
                  {company?.name ? ` · ${company.name}` : ''}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {company ? (
                    <VerificationBadge status={company.verification_status} />
                  ) : (
                    <span className="badge badge-sm badge-ghost">No company linked</span>
                  )}
                  {recruiter && (
                    <span className={`badge badge-sm ${recruiter.is_verified ? 'badge-success badge-outline' : 'badge-ghost'}`}>
                      {recruiter.is_verified ? 'Recruiter verified' : 'Recruiter pending'}
                    </span>
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
            {mode === 'view' && hasCompany ? (
              <button
                type="button"
                className="btn btn-primary shrink-0"
                onClick={() => { setMode('edit'); setMessage(null) }}
              >
                <Pencil className="h-4 w-4" />
                Edit Profile
              </button>
            ) : mode === 'edit' ? (
              <button
                type="button"
                className="btn btn-ghost shrink-0"
                onClick={() => { setMode('view'); setMessage(null) }}
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            ) : null}
          </div>

          {/* completion */}
          <div className="mt-5 rounded-2xl border border-base-200 bg-base-200/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">
                Profile completion
                <span className="badge badge-primary badge-sm ml-2">{completion.pct}%</span>
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
            <Stat label="Industry" value={company?.industry || '—'} />
            <Stat label="Location" value={company?.location || '—'} />
            <Stat label="Company size" value={company?.company_size ? `${company.company_size}` : '—'} />
            <Stat label="Jobs posted" value={jobCount != null ? String(jobCount) : '—'} />
          </div>

          {company && !isVerified && (
            <div role="alert" className="alert alert-warning mt-4 shadow-sm">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span className="text-sm">
                {company.verification_status === 'REJECTED'
                  ? 'Your company was rejected by an admin. Please review the details and contact support.'
                  : 'Your company is awaiting admin verification and is not visible to students yet.'}
              </span>
            </div>
          )}
        </div>
      </div>

      {!hasCompany ? (
        <Section
          title="No company linked"
          subtitle="Your recruiter account is not connected to a company yet."
          icon={Building2}
          iconClass="bg-warning/10 text-warning"
        >
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-base-300 bg-base-200/40 px-6 py-8 text-center">
            <div className="rounded-full bg-base-200 p-3 text-base-content/50">
              <Building2 className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold">Company assignment required</p>
            <p className="max-w-sm text-xs text-base-content/60">
              Companies are linked to recruiters during registration or by an admin.
              Please contact an admin to link your company — your designation and company
              details will become editable afterwards.
            </p>
          </div>
        </Section>
      ) : mode === 'view' ? (
        <>
          {/* ---------- Personal Information (view) ---------- */}
          <Section
            title="Personal Information"
            subtitle="How you appear to admins and on your job posts."
            icon={User}
            action={
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setMode('edit')}>
                <Pencil className="h-4 w-4" /> Edit
              </button>
            }
          >
            <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              <InfoItem label="Full name" value={profile?.name || displayName} />
              <InfoItem label="Email" value={email} />
              <InfoItem
                label="Recruiter status"
                value={recruiter?.is_verified ? 'Verified by admin' : 'Pending admin verification'}
              />
            </div>
          </Section>

          {/* ---------- Professional Details (view) ---------- */}
          <Section
            title="Professional Details"
            subtitle="Your role within the company."
            icon={Briefcase}
            iconClass="bg-violet-500/10 text-violet-600"
            action={
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setMode('edit')}>
                <Pencil className="h-4 w-4" /> Edit
              </button>
            }
          >
            <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
              <InfoItem label="Designation" value={recruiter?.designation || 'Recruiter'} />
              <InfoItem label="Company" value={company?.name} />
            </div>
          </Section>

          {/* ---------- Company Information (view) ---------- */}
          <Section
            title="Company Information"
            subtitle="Shown to students on company profiles and job listings."
            icon={Building2}
            iconClass="bg-sky-500/10 text-sky-600"
            action={
              <div className="flex items-center gap-2">
                <VerificationBadge status={company?.verification_status} />
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setMode('edit')}>
                  <Pencil className="h-4 w-4" /> Edit
                </button>
              </div>
            }
          >
            <div className="flex flex-col gap-5">
              <div className="flex items-start gap-4">
                {logo ? (
                  <img
                    src={logo}
                    alt={company?.name}
                    className="h-16 w-16 shrink-0 rounded-2xl border border-base-200 bg-base-100 object-contain p-1"
                  />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-2xl font-extrabold text-primary">
                    {(company?.name ?? 'C').trim().charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-lg font-extrabold">{company?.name}</p>
                  <p className="mt-0.5 text-sm text-base-content/60">
                    {[company?.industry, company?.location, company?.company_size ? `${company.company_size} employees` : null]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                <InfoItem label="Industry" value={company?.industry} />
                <InfoItem label="Location" value={company?.location} />
                <InfoItem label="Company size" value={company?.company_size ? `${company.company_size} employees` : null} />
              </div>
              {company?.description ? (
                <div className="rounded-2xl bg-base-200/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-base-content/50">About the company</p>
                  <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed">{company.description}</p>
                </div>
              ) : (
                <p className="text-sm text-base-content/50">Add a company description so students know what you do.</p>
              )}
            </div>
          </Section>

          {/* ---------- Contact Information (view) ---------- */}
          <Section
            title="Contact Information"
            subtitle="Where students and admins reach your company."
            icon={MapPin}
            iconClass="bg-amber-500/10 text-amber-600"
            action={
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setMode('edit')}>
                <Pencil className="h-4 w-4" /> Edit
              </button>
            }
          >
            <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
              <InfoItem label="Location" value={company?.location} />
              <InfoItem label="Website" value={company?.website} href={company?.website} />
            </div>
          </Section>

          {/* ---------- Social / Professional Links (view) ---------- */}
          <Section
            title="Social / Professional Links"
            subtitle="Professional presence candidates can visit."
            icon={Globe}
            iconClass="bg-emerald-500/10 text-emerald-600"
            action={
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setMode('edit')}>
                <Pencil className="h-4 w-4" /> Manage
              </button>
            }
          >
            {company?.website ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <a
                  href={company.website}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group flex items-center justify-between gap-2 rounded-2xl border border-base-200 bg-base-200/40 px-4 py-3 transition hover:border-primary/40 hover:bg-primary/5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="rounded-xl bg-primary/10 p-2 text-primary">
                      <Link2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold uppercase tracking-wider text-base-content/50">Website</div>
                      <div className="truncate text-sm font-medium text-primary">
                        {String(company.website).replace(/^https?:\/\//, '')}
                      </div>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 shrink-0 text-base-content/40 transition group-hover:text-primary" />
                </a>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-base-300 bg-base-200/40 px-6 py-8 text-center">
                <div className="rounded-full bg-base-200 p-3 text-base-content/50">
                  <Link2 className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold">No links yet</p>
                <p className="max-w-sm text-xs text-base-content/60">Add your company website so candidates can learn more.</p>
                <button type="button" className="btn btn-outline btn-sm mt-2" onClick={() => setMode('edit')}>
                  Add website
                </button>
              </div>
            )}
          </Section>
        </>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 sm:gap-6" noValidate>
          {/* ---------- Personal Information (edit) ---------- */}
          <Section
            title="Personal Information"
            subtitle="Your name as shown to admins and on communications."
            icon={User}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Full name" required error={errors.full_name} hint="As on your official records">
                <input
                  className={inputCls}
                  placeholder="e.g. Nusrat Jahan"
                  {...register('full_name', { required: 'Full name is required' })}
                />
              </Field>
              <Field label="Email" hint="Login email — cannot be changed here">
                <input className={`${inputCls} input-disabled`} value={email ?? ''} disabled readOnly />
              </Field>
            </div>
          </Section>

          {/* ---------- Professional Details (edit) ---------- */}
          <Section
            title="Professional Details"
            subtitle="Your role within the company."
            icon={Briefcase}
            iconClass="bg-violet-500/10 text-violet-600"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Your designation" required error={errors.designation} hint="Your job title at this company">
                <input
                  className={inputCls}
                  placeholder="HR Manager / Talent Acquisition Lead"
                  {...register('designation', { required: 'Designation is required' })}
                />
              </Field>
              <Field label="Verification" hint="Only admins can verify recruiters">
                <div className="flex min-h-12 flex-wrap items-center gap-2 rounded-xl border border-base-200 bg-base-200/40 px-3 py-2">
                  <span className={`badge badge-sm ${recruiter?.is_verified ? 'badge-success' : 'badge-ghost'}`}>
                    {recruiter?.is_verified ? 'Verified' : 'Pending verification'}
                  </span>
                  <span className="text-xs text-base-content/60">
                    {recruiter?.is_verified ? 'Your recruiter account is verified.' : 'An admin will verify your account.'}
                  </span>
                </div>
              </Field>
            </div>
          </Section>

          {/* ---------- Company Information (edit) ---------- */}
          <Section
            title="Company Information"
            subtitle="Visible to students and admins once verified."
            icon={Building2}
            iconClass="bg-sky-500/10 text-sky-600"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Company name" required error={errors.name} hint="Official registered name">
                <input
                  className={inputCls}
                  placeholder="Acme Technologies Ltd"
                  {...register('name', { required: 'Company name is required' })}
                />
              </Field>
              <Field label="Industry" hint="e.g. Software, Textile, Manufacturing">
                <input
                  className={inputCls}
                  placeholder="Software Development"
                  {...register('industry')}
                />
              </Field>
              <Field label="Company size" required error={errors.company_size} hint="Number of employees">
                <select className="select select-bordered w-full" {...register('company_size', { required: 'Company size is required' })}>
                  {COMPANY_SIZE.map((s) => (
                    <option key={s} value={s}>{s} employees</option>
                  ))}
                </select>
              </Field>
              <Field label="Location" hint="City, Country">
                <input
                  className={inputCls}
                  placeholder="Dhaka, Bangladesh"
                  {...register('location')}
                />
              </Field>
              <Field label="About the company" hint="Culture, mission, why work with you" className="sm:col-span-2">
                <textarea
                  className="textarea textarea-bordered min-h-28 w-full"
                  rows={4}
                  placeholder="Acme Technologies is a leading software company…"
                  {...register('description')}
                />
              </Field>
            </div>
          </Section>

          {/* ---------- Contact Information (edit) ---------- */}
          <Section
            title="Contact Information"
            subtitle="How students and admins reach your company."
            icon={MapPin}
            iconClass="bg-amber-500/10 text-amber-600"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Website" error={errors.website} hint="Full URL, e.g. https://example.com">
                <input
                  className={inputCls}
                  type="url"
                  placeholder="https://example.com"
                  {...register('website')}
                />
              </Field>
              <Field label="Logo URL" error={errors.logo_url} hint="Direct link to the logo image (optional)">
                <input
                  className={inputCls}
                  type="url"
                  placeholder="https://cdn.example.com/logo.png"
                  {...register('logo_url')}
                />
              </Field>
            </div>
            {logoPreview ? (
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-base-200 bg-base-200/40 p-3">
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="h-12 w-12 rounded-xl border border-base-200 bg-base-100 object-contain"
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
                <p className="text-xs text-base-content/60">Logo preview — shown in the header and on job listings.</p>
              </div>
            ) : null}
          </Section>

          {/* ---------- Social / Professional Links (edit) ---------- */}
          <Section
            title="Social / Professional Links"
            subtitle="Pulled from your contact details — kept in sync automatically."
            icon={Globe}
            iconClass="bg-emerald-500/10 text-emerald-600"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Company website" hint="Same as Contact Information — update it there">
                <input
                  className={inputCls}
                  type="url"
                  placeholder="https://example.com"
                  {...register('website')}
                />
              </Field>
              <div className="flex items-end pb-1">
                <p className="flex items-center gap-1.5 text-xs text-base-content/60">
                  <Users className="h-4 w-4" />
                  More channels (LinkedIn, Facebook) can be added to the website or description for now.
                </p>
              </div>
            </div>
          </Section>

          {/* ---------- actions ---------- */}
          <div className="flex flex-col-reverse justify-end gap-2 border-t border-base-200 pt-5 sm:flex-row">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setMode('view')}
              disabled={saving}
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="loading loading-spinner loading-sm" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving…' : company ? 'Save Changes' : 'Create Company Profile'}
            </button>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-base-content/50">
            <FileText className="h-3.5 w-3.5" />
            Verification status can only be changed by an admin — saving never affects it.
          </p>
        </form>
      )}
    </div>
  )
}
