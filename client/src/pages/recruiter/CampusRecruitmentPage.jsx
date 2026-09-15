import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useRecruiterProfile } from '../../hooks/useProfiles'
import { formatDate } from '../../utils/format'
import { LoadingScreen } from '../../components/ui/LoadingScreen'

const STATUS_BADGE = { PENDING: 'badge-warning', APPROVED: 'badge-success', REJECTED: 'badge-error' }

export default function CampusRecruitmentPage() {
  const { session } = useAuth()
  const { recruiter, company, loading } = useRecruiterProfile()
  const [requests, setRequests] = useState([])
  const [listLoading, setListLoading] = useState(true)
  const [message, setMessage] = useState(null)
  const { register, handleSubmit, reset } = useForm({
    defaultValues: { department: '', batch: '', min_cgpa: '', skills: '', graduation_year: '' },
  })

  useEffect(() => {
    if (!recruiter?.company_id) {
      setListLoading(false)
      return
    }
    let active = true
    supabase
      .from('campus_recruitment')
      .select('*')
      .eq('company_id', recruiter.company_id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (active) {
          setRequests(data ?? [])
          setListLoading(false)
        }
      })
    return () => { active = false }
  }, [recruiter?.company_id])

  if (loading) return <LoadingScreen />

  async function onSubmit(values) {
    setMessage(null)
    const eligibility = {
      department: values.department || null,
      batch: values.batch || null,
      min_cgpa: values.min_cgpa ? Number(values.min_cgpa) : null,
      skills: values.skills ? values.skills.split(',').map((s) => s.trim()).filter(Boolean) : [],
      graduation_year: values.graduation_year ? Number(values.graduation_year) : null,
    }
    const { error } = await supabase.from('campus_recruitment').insert({
      company_id: recruiter.company_id,
      requested_by: session.user.id,
      status: 'PENDING',
      eligibility,
    })
    if (error) {
      setMessage({ type: 'error', text: error.message })
      return
    }
    reset()
    setMessage({ type: 'success', text: 'Campus recruitment request submitted for admin approval.' })
    const { data } = await supabase
      .from('campus_recruitment')
      .select('*')
      .eq('company_id', recruiter.company_id)
      .order('created_at', { ascending: false })
    setRequests(data ?? [])
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link to="/recruiter/dashboard" className="link link-primary text-sm">← Dashboard</Link>
        <h1 className="mt-1 text-3xl font-bold">Campus recruitment</h1>
        <p className="mt-1 text-base-content/70">
          Request on-campus recruitment and define eligibility for students.
        </p>
      </div>

      {!company ? (
        <div role="alert" className="alert alert-warning">
          <span>Set up your company profile first to request campus recruitment.</span>
          <Link to="/recruiter/company" className="btn btn-sm btn-primary">Create company profile</Link>
        </div>
      ) : (
        <>
          {message && (
            <div role="alert" className={`alert alert-${message.type === 'success' ? 'success' : 'error'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="card bg-base-100 shadow-sm">
            <div className="card-body">
              <h2 className="card-title">New request</h2>
              <p className="text-sm text-base-content/60">
                {company.name} — eligibility for students. Leave fields blank to keep open.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="form-control">
                  <label className="label"><span className="label-text">Department</span></label>
                  <input className="input input-bordered" {...register('department')} placeholder="CSE" />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">Batch</span></label>
                  <input className="input input-bordered" {...register('batch')} placeholder="e.g. Summer 2027" />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">Minimum CGPA</span></label>
                  <input className="input input-bordered" type="number" step="0.01" min="0" max="4" {...register('min_cgpa')} placeholder="3.00" />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">Graduation year</span></label>
                  <input className="input input-bordered" type="number" {...register('graduation_year')} placeholder="2027" />
                </div>
                <div className="form-control sm:col-span-2">
                  <label className="label"><span className="label-text">Required skills (comma separated)</span></label>
                  <input className="input input-bordered" {...register('skills')} placeholder="React, Node.js, MySQL" />
                </div>
              </div>
              <div className="mt-2">
                <button className="btn btn-primary">Submit request</button>
              </div>
            </div>
          </form>

          <div className="card bg-base-100 shadow-sm">
            <div className="card-body">
              <h2 className="card-title">Your requests</h2>
              {listLoading ? (
                <div className="flex justify-center py-6">
                  <span className="loading loading-spinner loading-lg text-primary" />
                </div>
              ) : requests.length === 0 ? (
                <p className="text-sm text-base-content/60">No campus recruitment requests yet.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {requests.map((r) => {
                    const e = r.eligibility ?? {}
                    return (
                      <div key={r.id} className="rounded-box border border-base-300 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className={`badge badge-sm ${STATUS_BADGE[r.status] ?? 'badge-ghost'}`}>{r.status}</span>
                          <span className="text-xs text-base-content/50">Requested {formatDate(r.created_at)}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                          {e.department && <span className="badge badge-outline">Dept: {e.department}</span>}
                          {e.batch && <span className="badge badge-outline">Batch: {e.batch}</span>}
                          {e.min_cgpa != null && <span className="badge badge-outline">CGPA ≥ {Number(e.min_cgpa).toFixed(2)}</span>}
                          {e.graduation_year && <span className="badge badge-outline">Class of {e.graduation_year}</span>}
                          {(e.skills ?? []).map((s) => <span key={s} className="badge badge-ghost">{s}</span>)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
