import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useRecruiterProfile } from '../../hooks/useProfiles'
import { EMPLOYMENT_TYPE, EXPERIENCE_LEVEL, JOB_DEPARTMENT } from '../../utils/labels'
import { LoadingScreen } from '../../components/ui/LoadingScreen'
import {
  Briefcase,
  GraduationCap,
  ClipboardList,
  Shield,
  Sparkles,
  X,
} from 'lucide-react'

const Section = ({ title, icon: Icon, children }) => (
  <div className="card bg-base-100 border border-base-200 overflow-hidden">
    <div className="card-body px-6 py-4 border-b border-base-200">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <Icon className="w-5 h-5" />
        </div>
        <h2 className="text-lg font-semibold text-base-content">{title}</h2>
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
    {error && <p className="text-sm text-error flex items-center gap-1"><X className="w-3 h-3" />{error.message}</p>}
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
    {error && <p className="text-sm text-error flex items-center gap-1"><X className="w-3 h-3" />{error.message}</p>}
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
    {error && <p className="text-sm text-error flex items-center gap-1"><X className="w-3 h-3" />{error.message}</p>}
    {helper && !error && <p className="text-xs text-base-content/50">{helper}</p>}
  </div>
)

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

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
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

  const skillsInput = watch('skills', '')

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
      <div className="flex min-h-[60vh] items-center justify-center">
        <div role="alert" className="alert alert-warning max-w-xl text-center">
          <Sparkles className="w-12 h-12 mx-auto mb-4 text-base-content/50" />
          <span className="block text-lg font-medium">Set up your company profile first</span>
          <p className="text-sm text-base-content/60 mt-2">You need a company profile before posting jobs.</p>
          <div className="mt-6">
            <span className="btn btn-primary" onClick={() => navigate('/recruiter/company')}>
              Go to Company Profile
            </span>
          </div>
        </div>
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
      <div className="flex min-h-[60vh] items-center justify-center">
        <div role="alert" className="alert alert-error max-w-xl text-center">
          <p>{loadError}</p>
        </div>
      </div>
    )
  }

  const skillsArray = skillsInput ? skillsInput.split(',').map(s => s.trim()).filter(Boolean) : []

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Briefcase className="text-primary" />
          {editing ? `Edit ${job?.title ?? 'Job'}` : 'Post a New Job'}
        </h1>
        <p className="mt-1 text-base-content/70">
          {editing ? 'Update the job details below. Changes go live immediately.' : 'The job is saved as a draft and submitted for admin approval.'}
        </p>
      </div>

      {formError && (
        <div role="alert" className="alert alert-error flex items-center gap-3">
          <Shield className="w-5 h-5 flex-shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {/* Section: Basic Info */}
        <Section title="Basic Information" icon={Briefcase}>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <InputWrapper label="Job Title" required error={errors.title} helper="e.g. Senior Software Engineer, Marketing Manager">
              <input
                className="input input-bordered w-full"
                placeholder="Senior Software Engineer"
                {...register('title', { required: 'Job title is required' })}
              />
            </InputWrapper>

            <InputWrapper label="Employment Type" required error={errors.employment_type}>
              <SelectWrapper label="" required={false} error={errors.employment_type}>
                <select className="select select-bordered w-full" {...register('employment_type', { required: true })}>
                  {Object.entries(EMPLOYMENT_TYPE).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </SelectWrapper>
            </InputWrapper>

            <InputWrapper label="Location" error={errors.location} helper="City, Country or 'Remote'">
              <input
                className="input input-bordered w-full"
                placeholder="Dhaka, Bangladesh / Remote"
                {...register('location')}
              />
            </InputWrapper>

            <InputWrapper label="Application Deadline" error={errors.deadline}>
              <input
                className="input input-bordered w-full"
                type="date"
                {...register('deadline')}
              />
            </InputWrapper>

            <InputWrapper label="Number of Vacancies" required error={errors.vacancy_count}>
              <input
                className="input input-bordered w-full"
                type="number"
                min={1}
                max={100}
                {...register('vacancy_count', { required: true, valueAsNumber: true })}
              />
            </InputWrapper>

            <div className="sm:col-span-2">
              <InputWrapper label="Salary Range (Monthly, BDT)" error={errors.salary_min || errors.salary_max} helper="Leave blank if not disclosed">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">
                      <span className="label-text">Min Salary (৳)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40">৳</span>
                      <input
                        className="input input-bordered w-full pl-8"
                        type="number"
                        step="1000"
                        min={0}
                        placeholder="35000"
                        {...register('salary_min', { valueAsNumber: true })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label">
                      <span className="label-text">Max Salary (৳)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40">৳</span>
                      <input
                        className="input input-bordered w-full pl-8"
                        type="number"
                        step="1000"
                        min={0}
                        placeholder="60000"
                        {...register('salary_max', { valueAsNumber: true })}
                      />
                    </div>
                  </div>
                </div>
              </InputWrapper>
            </div>
          </div>
        </Section>

        {/* Section: Requirements */}
        <Section title="Requirements & Classification" icon={GraduationCap}>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <InputWrapper label="Department" error={errors.department}>
              <SelectWrapper label="" required={false} error={errors.department}>
                <select className="select select-bordered w-full" {...register('department')}>
                  <option value="">Select department (optional)</option>
                  {Object.entries(JOB_DEPARTMENT).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </SelectWrapper>
            </InputWrapper>

            <InputWrapper label="Experience Level" error={errors.experience_level}>
              <SelectWrapper label="" required={false} error={errors.experience_level}>
                <select className="select select-bordered w-full" {...register('experience_level')}>
                  <option value="">Any experience level</option>
                  {Object.entries(EXPERIENCE_LEVEL).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </SelectWrapper>
            </InputWrapper>

            <InputWrapper label="Required Skills" error={errors.skills} helper="Separate with commas (e.g. React, Node.js, PostgreSQL)">
              <div className="flex flex-col gap-2">
                <input
                  className="input input-bordered w-full"
                  placeholder="React, Node.js, PostgreSQL, AWS"
                  {...register('skills')}
                />
                {skillsArray.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {skillsArray.map((skill, i) => (
                      <span key={i} className="badge badge-primary badge-sm flex items-center gap-1">
                        {skill}
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs h-5 w-5 p-0"
                          onClick={() => {
                            const arr = skillsInput.split(',').map(s => s.trim()).filter(Boolean)
                            arr.splice(i, 1)
                            register('skills').onChange({ target: { value: arr.join(', ') } })
                          }}
                          aria-label="Remove skill"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </InputWrapper>

            <InputWrapper label="Education Requirement" error={errors.education} helper="e.g. B.Sc. in CSE or related field">
              <input
                className="input input-bordered w-full"
                placeholder="B.Sc. in CSE or related field"
                {...register('education')}
              />
            </InputWrapper>
          </div>
        </Section>

        {/* Section: Application Details */}
        <Section title="Job Details & Benefits" icon={ClipboardList}>
          <div className="space-y-5">
            <TextareaWrapper label="Description" required error={errors.description} helper="Overview of the role and company">
              <textarea
                className="textarea textarea-bordered w-full min-h-[100px]"
                rows={4}
                placeholder="What does the role involve? What makes this opportunity exciting?"
                {...register('description', { required: 'Description is required' })}
              />
            </TextareaWrapper>

            <TextareaWrapper label="Responsibilities" error={errors.responsibilities} helper="One per line (will be displayed as bullet points)">
              <textarea
                className="textarea textarea-bordered w-full min-h-[100px]"
                rows={4}
                placeholder="• Design and develop scalable web applications
• Collaborate with cross-functional teams
• Mentor junior developers"
                {...register('responsibilities')}
              />
            </TextareaWrapper>

            <TextareaWrapper label="Requirements" error={errors.requirements} helper="One per line (will be displayed as bullet points)">
              <textarea
                className="textarea textarea-bordered w-full min-h-[100px]"
                rows={4}
                placeholder="• 3+ years experience with React/Node.js
• Strong understanding of databases
• Excellent communication skills"
                {...register('requirements')}
              />
            </TextareaWrapper>

            <TextareaWrapper label="Benefits" error={errors.benefits} helper="One per line (e.g. Health insurance, Lunch provided, Remote work)">
              <textarea
                className="textarea textarea-bordered w-full min-h-[80px]"
                rows={3}
                placeholder="• Competitive salary & performance bonus
• Health insurance for employee + family
• Flexible working hours & remote options
• Learning & development budget"
                {...register('benefits')}
              />
            </TextareaWrapper>
          </div>
        </Section>

        {/* Submit Actions */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-base-200">
          <button type="button" className="btn btn-outline btn-lg" onClick={() => navigate('/recruiter/jobs')}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary btn-lg flex items-center gap-2" disabled={saving}>
            {saving && <span className="loading loading-spinner loading-sm" />}
            <Sparkles className="w-5 h-5" />
            {editing ? 'Save Changes' : 'Save Draft & Submit for Approval'}
          </button>
        </div>
      </form>
    </div>
  )
}