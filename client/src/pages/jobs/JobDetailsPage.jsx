import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useStudentProfile } from '../../hooks/useProfiles'
import { EMPLOYMENT_TYPE, EXPERIENCE_LEVEL, JOB_DEPARTMENT } from '../../utils/labels'
import { formatDate, formatMoney } from '../../utils/format'
import { LoadingScreen } from '../../components/ui/LoadingScreen'

function Section({ title, body }) {
  if (!body) return null
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-base-content/60">{title}</h3>
      <div className="mt-1 whitespace-pre-line text-sm leading-relaxed">{body}</div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-box border border-base-300 px-4 py-3 text-center">
      <div className="text-lg font-bold">{value ?? '—'}</div>
      <div className="text-xs text-base-content/60">{label}</div>
    </div>
  )
}

export default function JobDetailsPage() {
  const { id } = useParams()
  const { session, role } = useAuth()
  const { profile: studentProfile } = useStudentProfile()
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [applyError, setApplyError] = useState(null)
  const [applied, setApplied] = useState(false)
  const [cvs, setCvs] = useState([])
  const [reportReason, setReportReason] = useState('')
  const [reportError, setReportError] = useState(null)
  const [reportSubmitted, setReportSubmitted] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({ defaultValues: { cv_id: '', cover_letter: '' } })

  useEffect(() => {
    let active = true
    async function load() {
      const { data, error } = await supabase
        .from('jobs')
        .select('*, companies(name, description, website)')
        .eq('id', id)
        .maybeSingle()
      if (!active) return
      if (error) setError(error.message)
      else setJob(data ?? null)
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [id])

  useEffect(() => {
    if (role !== 'STUDENT') return
    if (!studentProfile?.id) return
    supabase.from('cvs').select('id, title').eq('student_id', studentProfile.id).then(({ data }) => {
      setCvs(data ?? [])
    })
  }, [role, studentProfile?.id])

  useEffect(() => {
    if (!session?.user?.id || !job?.id) return
    let query = supabase.from('applications').select('id').eq('job_id', job.id)
    if (role === 'STUDENT') {
      if (!studentProfile?.id) return
      query = query.eq('student_id', studentProfile.id)
    } else {
      query = query.eq('applicant_user_id', session.user.id)
    }
    query.maybeSingle().then(({ data }) => {
      setApplied(Boolean(data))
    })
  }, [session, role, job?.id, studentProfile?.id])

  if (loading) {
    return <LoadingScreen />
  }
  if (error || !job) {
    return (
      <div className="alert alert-error">
        Could not load this job ({error ?? 'not found'}).
      </div>
    )
  }

  const company = job.companies
  const salary = [job.salary_min, job.salary_max].filter((v) => v != null).map(formatMoney).join(' – ')
  const deadlinePassed = job.deadline && new Date(job.deadline) < new Date()
  const canApply = (role === 'STUDENT' || role === 'ALUMNI') && !deadlinePassed

  async function onSubmit(values) {
    let payload = { job_id: job.id, cover_letter: values.cover_letter || null }
    if (role === 'STUDENT') {
      if (!studentProfile?.id) {
        setApplyError('Complete your student profile before applying.')
        return
      }
      payload = { ...payload, student_id: studentProfile.id, cv_id: values.cv_id || null }
    } else if (role === 'ALUMNI') {
      if (!session?.user?.id) return
      payload = { ...payload, applicant_user_id: session.user.id }
    }
    setApplyError(null)
    const { error: err } = await supabase.from('applications').insert(payload)
    if (err) {
      if (err.code === '23505') {
        setApplyError('You have already applied to this job.')
      } else {
        setApplyError(err.message)
      }
      return
    }
    setApplied(true)
    document.getElementById('apply-modal')?.close()
  }

  async function submitReport() {
    if (!session?.user?.id) {
      setReportError('Sign in to report a job.')
      return
    }
    const reason = reportReason.trim()
    if (!reason) {
      setReportError('Please describe why you are reporting this job.')
      return
    }
    setReportError(null)
    const { data: existing } = await supabase
      .from('job_reports')
      .select('id')
      .eq('job_id', job.id)
      .eq('reporter_id', session.user.id)
      .eq('status', 'OPEN')
      .maybeSingle()
    if (existing) {
      setReportError('You have already reported this job. It is under review.')
      return
    }
    const { error } = await supabase.from('job_reports').insert({
      job_id: job.id,
      reporter_id: session.user.id,
      reason,
      status: 'OPEN',
    })
    if (error) {
      setReportError(error.message)
      return
    }
    setReportReason('')
    setReportSubmitted(true)
    document.getElementById('report-modal')?.close()
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/jobs" className="link link-primary text-sm">
        ← Back to jobs
      </Link>

      <div className="card mt-3 bg-base-100 shadow-sm">
        <div className="card-body gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">{job.title}</h1>
              <p className="mt-1 text-sm text-base-content/70">
                {company ? `at ${company.name}` : 'Company'} · {job.location ?? 'Location not specified'}
              </p>
            </div>
            <span className="badge badge-primary badge-lg">{EMPLOYMENT_TYPE[job.employment_type]}</span>
          </div>

          <div className="flex flex-wrap gap-1.5 text-xs">
            {job.department && (
              <span className="badge badge-outline">
                {JOB_DEPARTMENT[job.department] ?? job.department}
              </span>
            )}
            {job.experience_level && (
              <span className="badge badge-ghost">
                {EXPERIENCE_LEVEL[job.experience_level] ?? job.experience_level}
              </span>
            )}
            {(job.skills ?? []).map((s) => (
              <span key={s} className="badge badge-outline badge-sm">{s}</span>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Salary" value={salary} />
            <Stat label="Vacancies" value={job.vacancy_count} />
            <Stat label="Deadline" value={formatDate(job.deadline)} />
            <Stat label="Posted" value={formatDate(job.created_at)} />
          </div>

          {deadlinePassed && (
            <div role="alert" className="alert alert-warning text-sm">
              The application deadline for this job has passed.
            </div>
          )}

          <div className="flex flex-col gap-5">
            <Section title="About the job" body={job.description} />
            {job.education && <Section title="Education requirement" body={job.education} />}
            <Section title="Requirements" body={job.requirements} />
            <Section title="Responsibilities" body={job.responsibilities} />
            {job.benefits && <Section title="Benefits" body={job.benefits} />}
          </div>

          {company && (
            <div className="rounded-box border border-base-300 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-base-content/60">About the company</h3>
              <p className="mt-1 text-sm">{company.description || 'No company description'}</p>
              {company.website && (
                <a
                  className="link link-primary text-sm"
                  href={company.website}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {company.website}
                </a>
              )}
            </div>
          )}

          <div className="flex gap-3">
            {canApply && !applied && (
              <button type="button" className="btn btn-primary" onClick={() => document.getElementById('apply-modal')?.showModal()}>
                Apply now
              </button>
            )}
            {canApply && applied && (
              <div role="status" className="alert alert-success">
                Application submitted!
              </div>
            )}
            {role !== 'STUDENT' && role !== 'ALUMNI' && (
              <div className="label-text-alt text-base-content/60">Applications are handled from the student portal.</div>
            )}
            <button
              type="button"
              className="btn btn-ghost btn-sm ml-auto"
              disabled={reportSubmitted}
              onClick={() => document.getElementById('report-modal')?.showModal()}
            >
              {reportSubmitted ? 'Reported ✓' : 'Report job'}
            </button>
          </div>
        </div>
      </div>

      <dialog id="apply-modal" className="modal">
        <div className="modal-box">
          <form method="dialog">
            <button className="btn btn-circle btn-ghost btn-sm absolute right-2 top-2">✕</button>
          </form>
          <h3 className="text-lg font-bold">Apply to {job.title}</h3>

          {applyError && (
            <div role="alert" className="alert alert-error mt-3 text-sm">
              {applyError}
            </div>
          )}
          {role === 'STUDENT' && !studentProfile && (
            <div role="alert" className="alert alert-warning mt-3 text-sm">
              Please complete your student profile first.
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="mt-4 flex flex-col gap-4" noValidate>
            {role === 'STUDENT' && (
              <label className="form-control w-full">
                <div className="label">
                  <span className="label-text">CV</span>
                </div>
                <select className="select select-bordered w-full" {...register('cv_id')}>
                  <option value="">No CV attached</option>
                  {cvs.map((cv) => (
                    <option key={cv.id} value={cv.id}>
                      {cv.title}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="form-control w-full">
              <div className="label">
                <span className="label-text">Cover letter (optional)</span>
              </div>
              <textarea
                className="textarea textarea-bordered w-full"
                rows={5}
                placeholder="Briefly tell the employer why you are a good fit."
                {...register('cover_letter')}
              />
            </label>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={isSubmitting || (role === 'STUDENT' && !studentProfile)}
            >
              {isSubmitting ? <span className="loading loading-spinner loading-xs" /> : 'Submit application'}
            </button>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>

      <dialog id="report-modal" className="modal">
        <div className="modal-box">
          <form method="dialog">
            <button className="btn btn-circle btn-ghost btn-sm absolute right-2 top-2">✕</button>
          </form>
          <h3 className="text-lg font-bold">Report this job</h3>
          <p className="text-sm text-base-content/70">
            Flagging <span className="font-medium">{job.title}</span> for the administrators to review.
          </p>

          {reportError && (
            <div role="alert" className="alert alert-error mt-3 text-sm">
              {reportError}
            </div>
          )}

          <label className="form-control mt-4">
            <div className="label">
              <span className="label-text">Reason</span>
            </div>
            <textarea
              className="textarea textarea-bordered"
              rows={4}
              placeholder="e.g. incorrect information, misleading post, or inappropriate content"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
            />
          </label>

          <div className="modal-action">
            <form method="dialog">
              <button className="btn btn-outline">Cancel</button>
            </form>
            <button className="btn btn-error" onClick={submitReport}>
              Submit report
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </div>
  )
}