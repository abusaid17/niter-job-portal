import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useAlumniProfile } from '../../hooks/useProfiles'
import { EMPLOYMENT_TYPE, EXPERIENCE_LEVEL, JOB_DEPARTMENT } from '../../utils/labels'
import { LoadingScreen } from '../../components/ui/LoadingScreen'

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
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Post a job</h1>
        <p className="mt-1 text-base-content/70">
          Alumni job posts are reviewed by an admin before being published to students.
        </p>
      </div>

      {!alumni && (
        <div role="alert" className="alert alert-warning">
          <span>Complete your alumni profile before posting — it may be needed for verification.</span>
          <button className="btn btn-sm btn-primary" onClick={() => navigate('/alumni/profile')}>
            Go to profile
          </button>
        </div>
      )}

      {formError && (
        <div role="alert" className="alert alert-error">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="card bg-base-100 shadow-sm">
        <div className="card-body">
          {/* Section: Basic details */}
          <div className="space-y-4">
            <p className="text-sm font-medium uppercase tracking-wide text-base-content/60">Basic details</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label">
                  <span className="label-text">Job title *</span>
                </label>
                <input className="input input-bordered" {...register('title', { required: true })} placeholder="Software Engineer" />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Employment type</span>
                </label>
                <select className="select select-bordered" {...register('employment_type')}>
                  {Object.entries(EMPLOYMENT_TYPE).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Location</span>
                </label>
                <input className="input input-bordered" {...register('location')} placeholder="Dhaka, Bangladesh / Remote" />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Application deadline</span>
                </label>
                <input className="input input-bordered" type="date" {...register('deadline')} />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Vacancies</span>
                </label>
                <input className="input input-bordered" type="number" min={1} {...register('vacancy_count')} />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Salary min</span>
                </label>
                <input className="input input-bordered" type="number" step="0.01" {...register('salary_min')} />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Salary max</span>
                </label>
                <input className="input input-bordered" type="number" step="0.01" {...register('salary_max')} />
              </div>
            </div>
          </div>

          {/* Section: Requirements */}
          <div className="space-y-4">
            <p className="text-sm font-medium uppercase tracking-wide text-base-content/60">Requirements</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label">
                  <span className="label-text">Department</span>
                </label>
                <select className="select select-bordered" {...register('department')}>
                  <option value="">Any department</option>
                  {Object.entries(JOB_DEPARTMENT).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Experience level</span>
                </label>
                <select className="select select-bordered" {...register('experience_level')}>
                  <option value="">Any experience</option>
                  {Object.entries(EXPERIENCE_LEVEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Required skills (comma separated)</span>
                </label>
                <div className="relative">
                  <input
                    className="input input-bordered w-full pr-2"
                    {...register('skills')}
                    placeholder="React, Node.js, PostgreSQL"
                  />
                  <p className="text-xs text-base-content/50 absolute left-2 top-1/2 -translate-y-1/2">
                    Separate with commas (e.g. React, Node.js, PostgreSQL)
                  </p>
                </div>
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Education requirement</span>
                </label>
                <input className="input input-bordered" {...register('education')} placeholder="B.Sc. in CSE or related field" />
              </div>
            </div>
          </div>

          {/* Section: Description */}
          <div className="space-y-4">
            <p className="text-sm font-medium uppercase tracking-wide text-base-content/60">Description</p>
            <div className="space-y-3">
              <div>
                <label className="label">
                  <span className="label-text">Description</span>
                </label>
                <textarea className="textarea textarea-bordered" rows={3} {...register('description')} placeholder="What does the role involve?" />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Responsibilities</span>
                </label>
                <textarea className="textarea textarea-bordered" rows={3} {...register('responsibilities')} placeholder="Line-separated responsibilities…" />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Requirements</span>
                </label>
                <textarea className="textarea textarea-bordered" rows={3} {...register('requirements')} placeholder="Line-separated requirements…" />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Benefits</span>
                </label>
                <textarea className="textarea textarea-bordered" rows={2} {...register('benefits')} placeholder="e.g. Lunch, healthcare, performance bonus — one per line" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-3">
          <button className="btn btn-primary" disabled={saving}>
            {saving && <span className="loading loading-spinner loading-sm" />}
            Save draft
          </button>
          <button type="button" className="btn btn-outline" onClick={() => navigate('/alumni/dashboard')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}