import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useRecruiterProfile } from '../../hooks/useProfiles'
import { COMPANY_SIZE } from '../../utils/labels'
import { LoadingScreen } from '../../components/ui/LoadingScreen'
import {
  Building2,
  Briefcase,
  FileText,
  BadgeCheck,
  Save,
  ArrowLeft,
} from 'lucide-react'

const Section = ({ title, icon: Icon, children, badge }) => (
  <div className="card bg-base-100 border border-base-200 overflow-hidden">
    <div className="card-body px-6 py-4 border-b border-base-200 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-base-content">{title}</h2>
          {badge && <p className="text-xs text-base-content/60">{badge}</p>}
        </div>
      </div>
    </div>
    <div className="card-body px-6 py-5">{children}</div>
  </div>
)

const InputWrapper = ({ label, required, children, error, helper }) => (
  <div className="flex flex-col gap-1.5">
    <label className="label text-sm font-medium text-base-content">
      <span className="label-text">{label}</span>
      {required && <span className="label-text-alt text-error ml-1">*</span>}
    </label>
    {children}
    {error && <p className="text-sm text-error flex items-center gap-1">✕ {error.message}</p>}
    {helper && !error && <p className="text-xs text-base-content/50">{helper}</p>}
  </div>
)

const SelectWrapper = ({ label, required, children, error, helper }) => (
  <div className="flex flex-col gap-1.5">
    <label className="label text-sm font-medium text-base-content">
      <span className="label-text">{label}</span>
      {required && <span className="label-text-alt text-error ml-1">*</span>}
    </label>
    <div className="relative">{children}</div>
    {error && <p className="text-sm text-error flex items-center gap-1">✕ {error.message}</p>}
    {helper && !error && <p className="text-xs text-base-content/50">{helper}</p>}
  </div>
)

const TextareaWrapper = ({ label, required, children, error, helper }) => (
  <div className="flex flex-col gap-1.5">
    <label className="label text-sm font-medium text-base-content">
      <span className="label-text">{label}</span>
      {required && <span className="label-text-alt text-error ml-1">*</span>}
    </label>
    {children}
    {error && <p className="text-sm text-error flex items-center gap-1">✕ {error.message}</p>}
    {helper && !error && <p className="text-xs text-base-content/50">{helper}</p>}
  </div>
)

const VerificationBadge = ({ status }) => (
  <span className={`badge badge-lg ${status === 'VERIFIED' ? 'badge-success' : 'badge-warning'}`}>
    {status === 'VERIFIED' ? (
      <>
        <BadgeCheck className="w-4 h-4 mr-1" />
        Verified
      </>
    ) : (
      <>
        <span className="loading loading-spinner loading-xs mr-1" />
        Pending Verification
      </>
    )}
  </span>
)

export default function CompanyProfilePage() {
  const { session } = useAuth()
  const { recruiter, company, loading, refresh } = useRecruiterProfile()
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
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

  useEffect(() => {
    if (!loading && (company || recruiter)) {
      reset({
        name: company?.name ?? '',
        industry: company?.industry ?? '',
        company_size: company?.company_size ?? '1-10',
        location: company?.location ?? '',
        website: company?.website ?? '',
        logo_url: company?.logo_url ?? '',
        description: company?.description ?? '',
        designation: recruiter?.designation ?? 'Recruiter',
      })
    }
  }, [loading, company, recruiter, reset])

  if (loading) {
    return <LoadingScreen />
  }

  async function onSubmit(values) {
    setSaving(true)
    setMessage(null)
    try {
      // Use company_id from recruiter (always available via RLS) or company
      const companyId = company?.id ?? recruiter?.company_id
      if (!companyId) {
        throw new Error('No company linked to your recruiter profile')
      }

      // Always UPDATE the existing company (it exists per your DB)
      const { error } = await supabase
        .from('companies')
        .update({
          name: values.name,
          industry: values.industry,
          company_size: values.company_size,
          location: values.location,
          website: values.website,
          logo_url: values.logo_url,
          description: values.description,
        })
        .eq('id', companyId)
      if (error) throw error

      // Upsert recruiter with onConflict on user_id (unique constraint)
      const { error: recError } = await supabase
        .from('recruiters')
        .upsert({
          user_id: session.user.id,
          company_id: companyId,
          designation: values.designation || 'Recruiter',
          is_verified: recruiter?.is_verified ?? false,
        }, { onConflict: 'user_id' })
      if (recError) throw recError

      await refresh()
      setMessage({ type: 'success', text: 'Company updated successfully.' })
    } catch (err) {
      console.error(err)
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  const isVerified = company?.verification_status === 'VERIFIED'

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Building2 className="text-primary" />
            {company ? `Manage ${company.name}` : 'Create Company Profile'}
          </h1>
          <p className="mt-1 text-base-content/70">
            Company details are reviewed by admins before they are shown to students.
          </p>
        </div>
        {company && (
          <div className="flex items-center gap-3">
            <VerificationBadge status={company.verification_status} />
            {!isVerified && (
              <span className="text-xs text-base-content/60 hidden sm:inline">
                Your company will be visible to students once an admin verifies it.
              </span>
            )}
          </div>
        )}
      </div>

      {message && (
        <div role="alert" className={`alert alert-${message.type === 'success' ? 'success' : 'error'} flex items-center gap-3`}>
          {message.type === 'success' ? <BadgeCheck className="w-5 h-5 flex-shrink-0" /> : <span className="w-5 h-5 flex-shrink-0">✕</span>}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {/* Section: Company Info */}
        <Section title="Company Information" icon={Building2} badge="This information will be visible to students and admins">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <InputWrapper label="Company Name" required error={errors.name} helper="Official registered name">
              <input
                className="input input-bordered w-full"
                placeholder="Acme Technologies Ltd"
                {...register('name', { required: 'Company name is required' })}
              />
            </InputWrapper>

            <InputWrapper label="Industry" error={errors.industry} helper="e.g. Software, Textile, Manufacturing">
              <input
                className="input input-bordered w-full"
                placeholder="Software Development"
                {...register('industry')}
              />
            </InputWrapper>

            <InputWrapper label="Company Size" required error={errors.company_size}>
              <SelectWrapper label="" required={false} error={errors.company_size}>
                <select className="select select-bordered w-full" {...register('company_size', { required: true })}>
                  {COMPANY_SIZE.map((s) => (
                    <option key={s} value={s}>
                      {s} employees
                    </option>
                  ))}
                </select>
              </SelectWrapper>
            </InputWrapper>

            <InputWrapper label="Location" error={errors.location} helper="City, Country">
              <input
                className="input input-bordered w-full"
                placeholder="Dhaka, Bangladesh"
                {...register('location')}
              />
            </InputWrapper>

            <InputWrapper label="Website" error={errors.website} helper="Company website URL">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40">https://</span>
                <input
                  className="input input-bordered w-full pl-12"
                  type="url"
                  placeholder="example.com"
                  {...register('website')}
                />
              </div>
            </InputWrapper>

            <InputWrapper label="Logo URL" error={errors.logo_url} helper="Direct link to logo image (optional)">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40">https://</span>
                <input
                  className="input input-bordered w-full pl-12"
                  type="url"
                  placeholder="cdn.example.com/logo.png"
                  {...register('logo_url')}
                />
              </div>
            </InputWrapper>
          </div>
        </Section>

        {/* Section: Description */}
        <Section title="Company Description" icon={FileText} badge="Shown to students on company profile and job listings">
          <TextareaWrapper label="About Your Company" error={errors.description} helper="Describe your company culture, mission, and what makes it a great place to work">
            <textarea
              className="textarea textarea-bordered w-full min-h-[120px]"
              rows={5}
              placeholder="Acme Technologies is a leading software company..."
              {...register('description')}
            />
          </TextareaWrapper>
        </Section>

        {/* Section: Your Role */}
        <Section title="Your Role" icon={Briefcase} badge="Your designation within the company">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <InputWrapper label="Your Designation" required error={errors.designation} helper="Your job title at this company">
              <input
                className="input input-bordered w-full"
                placeholder="HR Manager / Talent Acquisition Lead"
                {...register('designation', { required: 'Designation is required' })}
              />
            </InputWrapper>

            {company && (
              <InputWrapper label="Verification Status" error={undefined} helper="Admins review and verify company profiles">
                <div className="flex items-center gap-3">
                  <VerificationBadge status={company.verification_status} />
                  <div className="text-sm text-base-content/70">
                    {isVerified ? 'Your company is verified and visible to students.' : 'Awaiting admin verification.'}
                  </div>
                </div>
              </InputWrapper>
            )}
          </div>
        </Section>

        {/* Submit Actions */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-base-200">
          <button type="button" className="btn btn-outline btn-lg flex items-center gap-2" onClick={() => window.history.back()}>
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <button type="submit" className="btn btn-primary btn-lg flex items-center gap-2" disabled={saving}>
            {saving && <span className="loading loading-spinner loading-sm" />}
            <Save className="w-5 h-5" />
            {company ? 'Save Changes' : 'Create Company Profile'}
          </button>
        </div>
      </form>
    </div>
  )
}