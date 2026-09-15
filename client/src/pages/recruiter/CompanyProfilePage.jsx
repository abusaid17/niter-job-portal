import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useRecruiterProfile } from '../../hooks/useProfiles'
import { COMPANY_SIZE } from '../../utils/labels'
import { LoadingScreen } from '../../components/ui/LoadingScreen'

export default function CompanyProfilePage() {
  const { session } = useAuth()
  const { recruiter, company, loading, refresh } = useRecruiterProfile()
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const { register, handleSubmit, reset } = useForm({
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
      let companyId = company?.id
      if (company) {
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
          .eq('id', company.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('companies')
          .insert({
            name: values.name,
            industry: values.industry,
            company_size: values.company_size,
            location: values.location,
            website: values.website,
            logo_url: values.logo_url,
            description: values.description,
            created_by: session.user.id,
          })
          .select('id')
          .single()
        if (error) throw error
        companyId = data.id
      }

      const { error: recError } = await supabase
        .from('recruiters')
        .upsert({
          user_id: session.user.id,
          company_id: companyId,
          designation: values.designation || 'Recruiter',
          is_verified: recruiter?.is_verified ?? false,
        })
      if (recError) throw recError

      await refresh()
      setMessage({ type: 'success', text: company ? 'Company updated.' : 'Company created.' })
    } catch (err) {
      console.error(err)
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">{company ? `Manage ${company.name}` : 'Create company profile'}</h1>
        <p className="mt-1 text-base-content/70">Company details are reviewed by admins before they are shown to students.</p>
      </div>

      {company && (
        <div className="flex items-center gap-2">
          <span className={`badge badge-lg ${company.verification_status === 'VERIFIED' ? 'badge-success' : 'badge-warning'}`}>
            {company.verification_status === 'VERIFIED' ? 'Verified' : 'Pending verification'}
          </span>
          {company.verification_status !== 'VERIFIED' && (
            <span className="text-xs text-base-content/60">
              Your company will be visible to students once an admin verifies it.
            </span>
          )}
        </div>
      )}

      {message && (
        <div role="alert" className={`alert alert-${message.type === 'success' ? 'success' : 'error'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <h2 className="card-title">Company info</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Company name *</span>
              </label>
              <input className="input input-bordered" {...register('name', { required: true })} placeholder="Acme Ltd" />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Industry</span>
              </label>
              <input className="input input-bordered" {...register('industry')} placeholder="Software" />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Company size</span>
              </label>
              <select className="select select-bordered" {...register('company_size')}>
                {COMPANY_SIZE.map((s) => (
                  <option key={s} value={s}>
                    {s} employees
                  </option>
                ))}
              </select>
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Location</span>
              </label>
              <input className="input input-bordered" {...register('location')} placeholder="Dhaka, Bangladesh" />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Website</span>
              </label>
              <input className="input input-bordered" type="url" {...register('website')} placeholder="https://example.com" />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Logo URL (optional)</span>
              </label>
              <input className="input input-bordered" type="url" {...register('logo_url')} placeholder="https://…/logo.png" />
            </div>
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Description</span>
            </label>
            <textarea className="textarea textarea-bordered" rows={4} {...register('description')} placeholder="Tell students about your company…" />
          </div>

          <h2 className="card-title mt-4">Your role</h2>
          <div className="form-control w-full sm:w-1/2">
            <label className="label">
              <span className="label-text">Designation *</span>
            </label>
            <input className="input input-bordered" {...register('designation', { required: true })} placeholder="HR Manager" />
          </div>

          <div className="mt-4">
            <button className="btn btn-primary" disabled={saving}>
              {saving && <span className="loading loading-spinner loading-sm" />}
              {company ? 'Save changes' : 'Create company'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}