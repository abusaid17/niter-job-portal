import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { APPLICATION_BADGE, APPLICATION_STATUS } from '../../utils/labels'
import { formatDate } from '../../utils/format'
import { openCv } from '../../utils/cv'
import { LoadingScreen } from '../../components/ui/LoadingScreen'
import InterviewModal from '../../components/interviews/InterviewModal'
import BulkInterviewModal from '../../components/interviews/BulkInterviewModal'
import { canTransition, sendStatusEmailsSequentially } from '../../utils/scheduling'

const FILTERS = ['ALL', 'APPLIED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW_SCHEDULED', 'SELECTED', 'REJECTED']
const BULK_ACTIONS = [
  { value: 'SHORTLISTED', label: 'Shortlist', variant: 'btn-success' },
  { value: 'UNDER_REVIEW', label: 'Move to Under Review', variant: 'btn-primary' },
  { value: 'REJECTED', label: 'Reject', variant: 'btn-error' },
  { value: 'INTERVIEW', label: 'Schedule Interview', variant: 'btn-warning' },
]

const STATUS_COLORS = {
  SHORTLISTED: 'btn-success',
  UNDER_REVIEW: 'btn-primary',
  REJECTED: 'btn-error',
  INTERVIEW: 'btn-warning',
}

export default function ApplicantsPage() {
  const { jobId } = useParams()
  const { session, role } = useAuth()
  const navigate = useNavigate()
  const [job, setJob] = useState(null)
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState(null)
  const [flash, setFlash] = useState(null)
  const [interviewing, setInterviewing] = useState(null)
  const [bulkInterviewing, setBulkInterviewing] = useState(null)
  const [bulkLoading, setBulkLoading] = useState(false)

  // Selection state
  const [selectedIds, setSelectedIds] = useState(new Set())

  // Bulk action state
  const [bulkAction, setBulkAction] = useState('')
  const [bulkRejectConfirm, setBulkRejectConfirm] = useState(false)
  const [bulkResults, setBulkResults] = useState(null)

  useEffect(() => {
    if (!session?.user?.id) return
    let active = true
    async function load() {
      const [jobR, appsR] = await Promise.all([
        supabase.from('jobs').select('title, status').eq('id', jobId).single(),
        supabase
          .from('applications')
          .select('*, students(id, student_id, department, batch, cgpa, phone, bio, users(id, name, email)), jobs(title), cvs(id, title, file_path), applicant:users!applications_applicant_user_id_fkey(id, name, email)')
          .eq('job_id', jobId)
          .order('applied_at', { ascending: false }),
      ])
      if (!active) return
      setJob(jobR.data ?? null)
      setApps(appsR.data ?? [])
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [session, jobId])

  const counts = useMemo(() => {
    const m = {}
    for (const a of apps) m[a.status] = (m[a.status] ?? 0) + 1
    return m
  }, [apps])

  const visible = filter === 'ALL' ? apps : apps.filter((a) => a.status === filter)

  const allVisibleSelected = visible.length > 0 && visible.every((a) => selectedIds.has(a.id))

  // Clear selection when filter or data changes
  useEffect(() => {
    setSelectedIds(new Set())
  }, [filter, apps])

  async function setStatus(id, status) {
    setBusyId(id)
    setError(null)
    setFlash(null)
    const { error: e, data: updatedApps } = await supabase
      .from('applications')
      .update({ status })
      .eq('id', id)
      .select('id')
    setBusyId(null)
    if (e) {
      setError(e.message)
      return
    }
    if (!updatedApps?.length) {
      setError('Update blocked by permissions or not found')
      return
    }
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)))
    setFlash({ type: 'success', text: `Application ${APPLICATION_STATUS[status]?.toLowerCase() ?? status.toLowerCase()}.` })
  }

  async function executeBulkStatusChange(targetStatus) {
    const ids = Array.from(selectedIds)
    if (!ids.length) return

    setBulkLoading(true)
    setError(null)
    setFlash(null)
    setBulkResults(null)

    try {
      // Filter valid transitions
      const validApps = apps.filter(
        (a) => selectedIds.has(a.id) && canTransition(a.status, targetStatus)
      )
      const invalidApps = ids.filter((id) => {
        const app = apps.find((a) => a.id === id)
        return !app || !canTransition(app.status, targetStatus)
      })

      if (!validApps.length) {
        setError('No valid applicants for this transition.')
        setBulkLoading(false)
        return
      }

      // Per-applicant updates with Promise.allSettled
      const results = await Promise.allSettled(
        validApps.map(async (app) => {
          const { error, data: updatedApps } = await supabase
            .from('applications')
            .update({ status: targetStatus })
            .eq('id', app.id)
            .select('id')
          if (error) throw error
          if (!updatedApps?.length) throw new Error('Update blocked by RLS or not found')
          return app.id
        })
      )

      const successIds = []
      const failed = []

      results.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          successIds.push(result.value)
        } else {
          failed.push({ id: validApps[idx].id, error: result.reason?.message ?? 'Unknown error' })
        }
      })

      // Update local state for successful ones
      if (successIds.length) {
        setApps((prev) =>
          prev.map((a) => (successIds.includes(a.id) ? { ...a, status: targetStatus } : a))
        )
      }

      // Send emails sequentially in background (non-blocking)
      sendStatusEmailsSequentially(
        validApps.filter((a) => successIds.includes(a.id)),
        targetStatus,
        job?.title
      )

      // Clear selection on any success
      if (successIds.length) {
        setSelectedIds(new Set())
      }

      // Report results
      const successCount = successIds.length
      const failCount = failed.length + invalidApps.length

      if (successCount > 0 && failCount === 0) {
        setFlash({
          type: 'success',
          text: `${successCount} applicant${successCount !== 1 ? 's' : ''} updated to ${APPLICATION_STATUS[targetStatus]}.`,
        })
      } else if (successCount > 0 && failCount > 0) {
        setBulkResults({
          success: successCount,
          failed: [
            ...failed.map((f) => ({ name: apps.find((a) => a.id === f.id)?.students?.users?.name ?? f.id, reason: f.reason })),
            ...invalidApps.map((id) => ({ name: apps.find((a) => a.id === id)?.students?.users?.name ?? id, reason: `Invalid transition from ${apps.find((a) => a.id === id)?.status}` })),
          ],
        })
      } else {
        setError(`${failCount} failed, none succeeded.`)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBulkLoading(false)
    }
  }

  function handleBulkAction() {
    if (!bulkAction) return

    if (bulkAction === 'REJECTED') {
      setBulkRejectConfirm(true)
    } else if (bulkAction === 'INTERVIEW') {
      const selectedApps = apps.filter((a) => selectedIds.has(a.id))
      const validForInterview = selectedApps.filter((a) => canTransition(a.status, 'INTERVIEW_SCHEDULED'))
      const invalidForInterview = selectedApps.filter((a) => !canTransition(a.status, 'INTERVIEW_SCHEDULED'))

      if (!validForInterview.length) {
        setError('No valid applicants for interview scheduling.')
        return
      }

      if (invalidForInterview.length) {
        setFlash({
          type: 'warning',
          text: `${invalidForInterview.length} applicant${invalidForInterview.length !== 1 ? 's' : ''} skipped (invalid status for interview).`,
        })
      }

      setBulkInterviewing({ applications: validForInterview, jobTitle: job?.title })
      setBulkAction('')
    } else {
      executeBulkStatusChange(bulkAction)
    }
  }

  function handleBulkRejectConfirmed() {
    setBulkRejectConfirm(false)
    executeBulkStatusChange('REJECTED')
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function toggleSelectAllVisible() {
    if (allVisibleSelected) {
      visible.forEach((a) => setSelectedIds((prev) => { const n = new Set(prev); n.delete(a.id); return n }))
    } else {
      visible.forEach((a) => setSelectedIds((prev) => { const n = new Set(prev); n.add(a.id); return n }))
    }
  }

  function clearSelection() {
    setSelectedIds(new Set())
    setBulkAction('')
    setBulkResults(null)
  }

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">{job?.title ?? 'Applicants'}</h1>
        <div className="mt-1 flex items-center gap-3 text-sm text-base-content/70">
          <span>{apps.length} applicants</span>
          <Link to={role === 'ALUMNI' ? '/alumni/dashboard' : '/recruiter/jobs'} className="link link-primary">
            ← Back to my jobs
          </Link>
        </div>
      </div>

      {error && (
        <div role="alert" className="alert alert-error">
          {error}
        </div>
      )}

      {flash && (
        <div role="alert" className={`alert alert-${flash.type}`}>
          {flash.text}
          <button className="btn btn-sm btn-ghost ml-2" onClick={() => setFlash(null)}>✕</button>
        </div>
      )}

      {bulkResults && (
        <div role="alert" className="alert alert-warning">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-medium">{bulkResults.success} updated</span>
              {bulkResults.failed.length > 0 && (
                <span className="ml-2 text-error">, {bulkResults.failed.length} failed</span>
              )}
            </div>
            <button className="btn btn-sm btn-ghost" onClick={() => setBulkResults(null)}>✕</button>
          </div>
          {bulkResults.failed.length > 0 && (
            <details className="mt-2">
              <summary className="text-sm cursor-pointer text-base-content/70">Show failures</summary>
              <ul className="mt-1 text-sm text-error list-disc list-inside">
                {bulkResults.failed.map((f, i) => (
                  <li key={i}>{f.name}: {f.reason}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilter(f)}
          >
            {f === 'ALL' ? 'All' : APPLICATION_STATUS[f]}
            {f !== 'ALL' && <span className="badge badge-ghost badge-sm">{counts[f] ?? 0}</span>}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="card bg-base-100 p-10 text-center text-sm text-base-content/60 shadow-sm">
          No applicants in this stage.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-box bg-base-100 shadow-sm">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-10">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAllVisible}
                      aria-label="Select all visible"
                    />
                  </th>
                  <th>Applicant</th>
                  <th>Status</th>
                  <th>Applied</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((a) => {
                  const student = a.students
                  const name = student?.users?.name ?? a.applicant?.name ?? 'Applicant'
                  const isAlumni = a.applicant != null
                  return (
                    <tr key={a.id}>
                      <td className="w-10">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-primary"
                          checked={selectedIds.has(a.id)}
                          onChange={() => toggleSelect(a.id)}
                          aria-label={`Select ${name}`}
                        />
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{name}</span>
                          {isAlumni && <span className="badge badge-ghost badge-sm">Alumni</span>}
                          <span className={`badge badge-sm ${APPLICATION_BADGE[a.status] ?? 'badge-ghost'}`}>
                            {APPLICATION_STATUS[a.status] ?? a.status}
                          </span>
                        </div>
                        <div className="mt-0.5 text-sm text-base-content/60">
                          Applied {formatDate(a.applied_at)}
                          {!isAlumni && student?.department && ` · ${student.department}`}
                          {!isAlumni && student?.batch && ` (Batch ${student.batch})`}
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge-sm ${APPLICATION_BADGE[a.status] ?? 'badge-ghost'}`}>
                          {APPLICATION_STATUS[a.status] ?? a.status}
                        </span>
                      </td>
                      <td className="text-sm text-base-content/70">{formatDate(a.applied_at)}</td>
                      <td className="text-right">
                        <div className="flex justify-end gap-2">
                          {!isAlumni && a.cvs?.file_path && (
                            <button className="btn btn-sm btn-outline" onClick={() => openCv(a.cvs)}>
                              View CV
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-sm btn-outline btn-info"
                            disabled={busyId === a.id}
                            onClick={async () => {
                              const applicantUserId = isAlumni ? a.applicant?.id : a.students?.users?.id
                              if (!applicantUserId) return
                              setBusyId(a.id)
                              setError(null)
                              const { data, error: e } = await supabase.rpc('start_conversation', {
                                p_other_user: applicantUserId,
                              })
                              setBusyId(null)
                              if (e) {
                                setError(e.message)
                                return
                              }
                              navigate(`/messages/${data}`)
                            }}
                          >
                            Message
                          </button>
                          <Link to={`/recruiter/applicants/${a.id}`} className="btn btn-sm btn-neutral">
                            Review
                          </Link>
                          {a.status !== 'REJECTED' && (
                            <button
                              className="btn btn-sm btn-outline btn-error"
                              disabled={busyId === a.id}
                              onClick={() => setStatus(a.id, 'REJECTED')}
                            >
                              Reject
                            </button>
                          )}
                          {a.status !== 'INTERVIEW_SCHEDULED' && a.status !== 'SELECTED' && (
                            <button
                              className="btn btn-sm btn-outline btn-success"
                              disabled={busyId === a.id}
                              onClick={() => setStatus(a.id, 'SHORTLISTED')}
                            >
                              Shortlist
                            </button>
                          )}
                          {a.status !== 'INTERVIEW_SCHEDULED' && a.status !== 'SELECTED' && a.status !== 'REJECTED' && (
                            <button className="btn btn-sm btn-primary" disabled={busyId === a.id} onClick={() => setInterviewing(a)}>
                              Schedule interview
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {selectedIds.size > 0 && (
            <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 card bg-base-100 shadow-xl p-3 z-50">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <span className="text-sm font-medium">
                  {selectedIds.size} applicant{selectedIds.size !== 1 ? 's' : ''} selected
                </span>
                <div className="flex flex-wrap gap-2">
                  <select
                    className="select select-bordered select-sm w-full sm:w-auto"
                    value={bulkAction}
                    onChange={(e) => setBulkAction(e.target.value)}
                    disabled={bulkLoading}
                  >
                    <option value="">Action…</option>
                    {BULK_ACTIONS.map((action) => (
                      <option key={action.value} value={action.value}>
                        {action.label}
                      </option>
                    ))}
                  </select>
                  <button
                    className={`btn btn-sm ${bulkAction ? STATUS_COLORS[bulkAction] : 'btn-outline'}`}
                    onClick={handleBulkAction}
                    disabled={!bulkAction || bulkLoading}
                  >
                    {bulkLoading ? <span className="loading loading-spinner loading-sm" /> : 'Apply'}
                  </button>
                  <button className="btn btn-sm btn-ghost" onClick={clearSelection} disabled={bulkLoading}>
                    Clear
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {bulkRejectConfirm && (
        <div className="modal modal-middle" role="dialog">
          <form method="dialog" className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setBulkRejectConfirm(false)}>
            <button>close</button>
          </form>
          <div className="modal-box">
            <h3 className="font-bold text-lg">Confirm bulk reject</h3>
            <p className="mt-2 text-sm text-base-content/70">
              Are you sure you want to reject <strong>{selectedIds.size}</strong> applicant{selectedIds.size !== 1 ? 's' : ''}?
              This will send rejection notifications.
            </p>
            <div className="modal-action mt-4">
              <button className="btn btn-outline" onClick={() => setBulkRejectConfirm(false)}>
                Cancel
              </button>
              <button className="btn btn-error" onClick={handleBulkRejectConfirmed} disabled={bulkLoading}>
                {bulkLoading ? <span className="loading loading-spinner loading-sm" /> : 'Yes, reject all'}
              </button>
            </div>
          </div>
        </div>
      )}

      <InterviewModal
        open={Boolean(interviewing)}
        application={interviewing}
        jobTitle={job?.title}
        onClose={() => setInterviewing(null)}
        onScheduled={() => {
          if (interviewing?.id) setStatus(interviewing.id, 'INTERVIEW_SCHEDULED')
          setInterviewing(null)
        }}
      />

      <BulkInterviewModal
        open={Boolean(bulkInterviewing)}
        applications={bulkInterviewing?.applications ?? []}
        jobTitle={bulkInterviewing?.jobTitle}
        gapMinutes={30}
        onClose={() => setBulkInterviewing(null)}
        onScheduled={(successIds) => {
          if (successIds.length) {
            setApps((prev) =>
              prev.map((a) => (successIds.includes(a.id) ? { ...a, status: 'INTERVIEW_SCHEDULED' } : a))
            )
            setSelectedIds(new Set())
            setFlash({ type: 'success', text: `${successIds.length} interview${successIds.length !== 1 ? 's' : ''} scheduled.` })
          }
        }}
      />
    </div>
  )
}