import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useRecruiterProfile } from '../../hooks/useProfiles'
import { EMPLOYMENT_TYPE, EXPERIENCE_LEVEL, JOB_DEPARTMENT } from '../../utils/labels'
import { LoadingScreen } from '../../components/ui/LoadingScreen'

export default function JobFormPage() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const { session } = useAuth()
  const { recruiter, loading } = useRecruiterProfile()
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [formError, setFormError] = useState(null)
  const [job, setJob] = useState(null)
  const editing = Boolean(jobId)

  const { register, handleSubmit, reset } = useForm({
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

  useEffect(() => {
    if (!editing) return
    if (!session?.user?.id) return
    let active = true
    supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single()
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          setLoadError(error.message)
          return
        }
        setJob(data)
        reset({
          title: data.title ?? '',
          employment_type: data.employment_type ?? 'FULL_TIME',
          location: data.location ?? '',
          deadline: data.deadline ? data.deadline.slice(0, 10) : '',
          salary_min: data.salary_min ?? '',
          salary_max: data.salary_max ?? '',
          vacancy_count: data.vacancy_count ?? 1,
          department: data.department ?? '',
          experience_level: data.experience_level ?? '',
          skills: (data.skills ?? []).join(', '),
          education: data.education ?? '',
          description: data.description ?? '',
          responsibilities: data.responsibilities ?? '',
          requirements: data.requirements ?? '',
          benefits: data.benefits ?? '',
        })
      })
    return () => {
      active = false
    }
  }, [editing, jobId, session, reset])

  if (loading) {
    return <LoadingScreen />
  }

  if (!recruiter) {
    return (
      <div role="alert" className="alert alert-warning max-w-xl">
        <span>Set up your company profile before posting a job.</span>
        <span className="btn btn-sm btn-primary" onClick={() => navigate('/recruiter/company')}>
          Go to company
        </span>
      </div>
    )
  }

  async function onSubmit(values) {
    setSaving(true)
    setFormError(null)
    const payload = {
      company_id: recruiter.company_id,
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
    try {
      if (editing) {
        const { error } = await supabase.from('jobs').update(payload).eq('id', job.id).select()
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('jobs')
          .insert({ ...payload, posted_by: session.user.id, status: 'DRAFT', source_type: 'RECRUITER' })
        if (error) throw error
      }
      navigate('/recruiter/jobs')
    } catch (err) {
      console.error(err)
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loadError) {
    return (
      <div role="alert" className="alert alert-error max-w-xl">
        {loadError}
      </div>
    )
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">{editing ? `Edit ${job?.title ?? ''}` : 'Post a new job'}</h1>
        <p className="mt-1 text-base-content/70">
          {editing ? 'Update the job details below.' : 'The job is saved as a draft and submitted for admin approval.'}
        </p>
      </div>

      {formError && (
        <div role="alert" className="alert alert-error">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="card bg-base-100 shadow-sm">
        <div className="card-body">
          {/* Section: Basic Info */}
          <div className="space-y-4">
            <p className="text-sm font-medium uppercase tracking-wide text-base-content/60">Basic Info</p>
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
                <input className="input input-bordered" type="number" step="0.01" {...register('salary_min')} placeholder="35000" />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Salary max</span>
                </label>
                <input className="input input-bordered" type="number" step="0.01" {...register('salary_max')} placeholder="60000" />
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

          {/* Section: Application Details */}
          <div className="space-y-4">
            <p className="text-sm font-medium uppercase tracking-wide text-base-content/60">Application Details</p>
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
            {editing ? 'Save changes' : 'Save draft'}
          </button>
          <button type="button" className="btn btn-outline" onClick={() => navigate('/recruiter/jobs')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}