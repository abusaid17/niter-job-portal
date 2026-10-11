import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useAlumniProfile } from '../../hooks/useProfiles'
import { EMPLOYMENT_TYPE, EXPERIENCE_LEVEL, JOB_DEPARTMENT } from '../../utils/labels'
import { LoadingScreen } from '../../components/ui/LoadingScreen'
import { AlertTriangle, Briefcase, Info, Save, X } from 'lucide-react'

export default function AlumniJobFormPage() {
  const { session } = useAuth()
  const { profile: alumni, loading } = useAlumniProfile()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  const { register, handleSubmit } = useForm({
    defaultValues: {
      title: '',
      employment_type: 'FULL_TIME',
      location: '',
      deadline: '',
      salary_min: '',
      salary_max: '',
      vacancy_count: 1,
      department: '',
      experience_level: '',
      skills: '',
      education: '',
      description: '',
      responsibilities: '',
      requirements: '',
      benefits: '',
    },
  })

  if (loading) {
    return <LoadingScreen />
  }

  if (!session?.user) {
    return (
      <div role="alert" className="alert alert-error max-w-xl">
        You must be signed in to post a job.
      </div>
    )
  }

  async function onSubmit(values) {
    setSaving(true)
    setFormError(null)
    const payload = {
      posted_by: session.user.id,
      source_type: 'ALUMNI',
      status: 'DRAFT',
      title: values.title,
      employment_type: values.employment_type,
      location: values.location,
      deadline: values.deadline ? new Date(values.deadline).toISOString() : null,
      salary_min: values.salary_min ? Number(values.salary_min) : null,
      salary_max: values.salary_max ? Number(values.salary_max) : null,
      vacancy_count: Number(values.vacancy_count) || 1,
      department: values.department || null,
      experience_level: values.experience_level || null,
      skills: values.skills ? values.skills.split(',').map((s) => s.trim()).filter(Boolean) : [],
      education: values.education || null,
      description: values.description,
      responsibilities: values.responsibilities,
      requirements: values.requirements,
      benefits: values.benefits || null,
    }
    const { error } = await supabase.from('jobs').insert(payload)
    setSaving(false)
    if (error) {
      console.error(error)
      setFormError(error.message)
      return
    }
    navigate('/alumni/dashboard')
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 sm:gap-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <Briefcase className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Post a job</h1>
          <p className="mt-0.5 text-sm text-base-content/60">
            Alumni job posts are reviewed by an admin before being published to students.
          </p>
        </div>
        <span className="badge badge-ghost badge-sm ml-auto hidden shrink-0 sm:inline-flex">Saved as draft</span>
      </div>

      {!alumni && (
        <div role="alert" className="alert alert-warning shadow-sm">
          <Info className="h-5 w-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Profile incomplete</p>
            <p className="text-sm">Complete your alumni profile before posting — it may be needed for verification.</p>
          </div>
          <button className="btn btn-sm btn-primary shrink-0" onClick={() => navigate('/alumni/profile')}>
            Go to profile
          </button>
        </div>
      )}

      {formError && (
        <div role="alert" className="alert alert-error shadow-sm">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span className="text-sm">{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="card border border-base-200 bg-base-100 shadow-sm">
        <div className="card-body gap-7 px-5 py-6 sm:px-6">
          {/* Section: Basic details */}
          <section>
            <div className="flex items-center gap-3">
              <h2 className="whitespace-nowrap text-sm font-bold uppercase tracking-wider text-base-content/60">
                Basic details
              </h2>
              <div className="h-px flex-1 bg-base-200" />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="form-control w-full sm:col-span-2">
                <label className="label pb-1">
                  <span className="label-text text-sm font-medium">Job title <span className="text-error">*</span></span>
                </label>
                <input className="input input-bordered w-full" {...register('title', { required: true })} placeholder="Software Engineer" />
              </div>
              <div className="form-control w-full">
                <label className="label pb-1">
                  <span className="label-text text-sm font-medium">Employment type</span>
                </label>
                <select className="select select-bordered w-full" {...register('employment_type')}>
                  {Object.entries(EMPLOYMENT_TYPE).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-control w-full">
                <label className="label pb-1">
                  <span className="label-text text-sm font-medium">Location</span>
                </label>
                <input className="input input-bordered w-full" {...register('location')} placeholder="Dhaka, Bangladesh / Remote" />
              </div>
              <div className="form-control w-full">
                <label className="label pb-1">
                  <span className="label-text text-sm font-medium">Application deadline</span>
                </label>
                <input className="input input-bordered w-full" type="date" {...register('deadline')} />
              </div>
              <div className="form-control w-full">
                <label className="label pb-1">
                  <span className="label-text text-sm font-medium">Vacancies</span>
                </label>
                <input className="input input-bordered w-full" type="number" min={1} {...register('vacancy_count')} />
              </div>
              <div className="form-control w-full">
                <label className="label pb-1">
                  <span className="label-text text-sm font-medium">Salary min</span>
                </label>
                <input className="input input-bordered w-full" type="number" step="0.01" {...register('salary_min')} placeholder="e.g. 50000" />
              </div>
              <div className="form-control w-full">
                <label className="label pb-1">
                  <span className="label-text text-sm font-medium">Salary max</span>
                </label>
                <input className="input input-bordered w-full" type="number" step="0.01" {...register('salary_max')} placeholder="e.g. 80000" />
              </div>
            </div>
          </section>

          {/* Section: Requirements */}
          <section>
            <div className="flex items-center gap-3">
              <h2 className="whitespace-nowrap text-sm font-bold uppercase tracking-wider text-base-content/60">
                Requirements
              </h2>
              <div className="h-px flex-1 bg-base-200" />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="form-control w-full">
                <label className="label pb-1">
                  <span className="label-text text-sm font-medium">Department</span>
                </label>
                <select className="select select-bordered w-full" {...register('department')}>
                  <option value="">Any department</option>
                  {Object.entries(JOB_DEPARTMENT).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-control w-full">
                <label className="label pb-1">
                  <span className="label-text text-sm font-medium">Experience level</span>
                </label>
                <select className="select select-bordered w-full" {...register('experience_level')}>
                  <option value="">Any experience</option>
                  {Object.entries(EXPERIENCE_LEVEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-control w-full sm:col-span-2">
                <label className="label pb-1">
                  <span className="label-text text-sm font-medium">Required skills</span>
                  <span className="label-text-alt text-base-content/50">comma separated</span>
                </label>
                <input
                  className="input input-bordered w-full"
                  {...register('skills')}
                  placeholder="React, Node.js, PostgreSQL"
                />
                <p className="mt-1 text-xs text-base-content/50">
                  Separate with commas (e.g. React, Node.js, PostgreSQL)
                </p>
              </div>
              <div className="form-control w-full sm:col-span-2">
                <label className="label pb-1">
                  <span className="label-text text-sm font-medium">Education requirement</span>
                </label>
                <input className="input input-bordered w-full" {...register('education')} placeholder="B.Sc. in CSE or related field" />
              </div>
            </div>
          </section>

          {/* Section: Description */}
          <section>
            <div className="flex items-center gap-3">
              <h2 className="whitespace-nowrap text-sm font-bold uppercase tracking-wider text-base-content/60">
                Description
              </h2>
              <div className="h-px flex-1 bg-base-200" />
            </div>
            <div className="mt-4 space-y-4">
              <div className="form-control w-full">
                <label className="label pb-1">
                  <span className="label-text text-sm font-medium">Description</span>
                </label>
                <textarea className="textarea textarea-bordered min-h-24 w-full" rows={3} {...register('description')} placeholder="What does the role involve?" />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="form-control w-full">
                  <label className="label pb-1">
                    <span className="label-text text-sm font-medium">Responsibilities</span>
                  </label>
                  <textarea className="textarea textarea-bordered min-h-28 w-full" rows={4} {...register('responsibilities')} placeholder={'Line-separated responsibilities…\n• Build new features\n• Review code'} />
                </div>
                <div className="form-control w-full">
                  <label className="label pb-1">
                    <span className="label-text text-sm font-medium">Requirements</span>
                  </label>
                  <textarea className="textarea textarea-bordered min-h-28 w-full" rows={4} {...register('requirements')} placeholder={'Line-separated requirements…\n• 2+ years experience\n• Strong communication'} />
                </div>
              </div>
              <div className="form-control w-full">
                <label className="label pb-1">
                  <span className="label-text text-sm font-medium">Benefits</span>
                  <span className="label-text-alt text-base-content/50">optional</span>
                </label>
                <textarea className="textarea textarea-bordered min-h-20 w-full" rows={2} {...register('benefits')} placeholder="e.g. Lunch, healthcare, performance bonus — one per line" />
              </div>
            </div>
          </section>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-base-200 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button type="button" className="btn btn-outline" onClick={() => navigate('/alumni/dashboard')}>
            <X className="h-4 w-4" />
            Cancel
          </button>
          <button className="btn btn-primary" disabled={saving}>
            {saving ? <span className="loading loading-spinner loading-sm" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving…' : 'Save draft'}
          </button>
        </div>
      </form>
    </div>
  )
}