import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { formatDate } from '../../utils/format'
import { sendEmail } from '../../utils/email'
import { addMinutesToTime, timeCrossesMidnight } from '../../utils/scheduling'

function BulkInterviewModal({
  open,
  applications,
  jobTitle,
  gapMinutes: initialGapMinutes,
  onClose,
  onScheduled,
}) {
  const { session } = useAuth()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [warning, setWarning] = useState(null)
  const [form, setForm] = useState({
    interview_date: '',
    start_time: '',
    end_time: '',
    venue: '',
    meeting_link: '',
    notes: '',
    gap_minutes: initialGapMinutes ?? 30,
  })

  const checkMidnightCrossing = useCallback(() => {
    const gap = form.gap_minutes || 0
    if (gap > 0 && form.start_time && form.end_time) {
      if (timeCrossesMidnight(form.start_time, form.end_time, gap * (applications.length - 1))) {
        setWarning('Interview slots would cross midnight with this gap. Reduce gap or adjust times.')
      } else {
        setWarning(null)
      }
    } else if (gap === 0 && applications.length > 1) {
      setWarning('All candidates will get the exact same time slot.')
    } else {
      setWarning(null)
    }
  }, [form.gap_minutes, form.start_time, form.end_time, applications.length])

  useEffect(() => {
    checkMidnightCrossing()
  }, [checkMidnightCrossing])

  const set = (key) => (e) => {
    const value = e.target.type === 'number' ? parseInt(e.target.value, 10) || 0 : e.target.value
    setForm((f) => ({ ...f, [key]: value }))
    if (key === 'gap_minutes' || key === 'start_time' || key === 'end_time') {
      checkMidnightCrossing()
    }
  }

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const { interview_date, start_time, end_time, venue, meeting_link, notes, gap_minutes } = form
    if (!interview_date || !start_time) {
      setError('Date and start time are required.')
      setSaving(false)
      return
    }

    let currentTime = start_time
    const gap = gap_minutes || 0
    const resultsLocal = { success: [], failed: [] }

    for (const app of applications) {
      try {
        const applicantEmail = app.students?.users?.email ?? app.applicant?.email

        const { error: insError } = await supabase.from('interviews').insert({
          application_id: app.id,
          scheduled_by: session.user.id,
          interview_date,
          start_time: currentTime,
          end_time: end_time || null,
          venue: venue || null,
          meeting_link: meeting_link || null,
          notes: notes || null,
        })
        if (insError) throw insError

        const { error: appError, data: updatedApps } = await supabase
          .from('applications')
          .update({ status: 'INTERVIEW_SCHEDULED' })
          .eq('id', app.id)
          .select('id')
        if (appError) throw appError
        if (!updatedApps?.length) throw new Error('Application update blocked by RLS or not found')

        if (applicantEmail) {
          sendEmail('interview_scheduled', applicantEmail, {
            detail:
              `Job: ${jobTitle ?? '—'}\n` +
              `Date: ${formatDate(interview_date)}\n` +
              `Time: ${currentTime}${end_time ? ` – ${end_time}` : ''}\n` +
              (venue ? `Venue: ${venue}\n` : '') +
              (meeting_link ? `Meeting link: ${meeting_link}\n` : '') +
              (notes ? `Notes: ${notes}\n` : ''),
          }).catch(() => {})
        }

        resultsLocal.success.push(app.id)

        if (gap > 0) {
          currentTime = addMinutesToTime(currentTime, gap)
        }
      } catch (err) {
        resultsLocal.failed.push({ id: app.id, error: err.message })
      }
    }

    onScheduled(resultsLocal.success)
    onClose()

    if (resultsLocal.failed.length) {
      setError(`${resultsLocal.success.length} scheduled, ${resultsLocal.failed.length} failed`)
    }
    setSaving(false)
  }

  if (!open) return null

  return (
    <dialog className="modal modal-middle" open>
      <form method="dialog" className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <button>close</button>
      </form>
      <div className="modal-box max-w-xl">
        <h3 className="font-bold text-lg">Schedule interviews ({applications.length} candidate{applications.length !== 1 ? 's' : ''})</h3>
        <p className="text-sm text-base-content/70">{jobTitle}</p>

        {warning && (
          <div role="alert" className="alert alert-warning mt-3 text-sm">
            <span>⚠</span> {warning}
          </div>
        )}

        {error && (
          <div role="alert" className="alert alert-error mt-3 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Date *</span>
              </label>
              <input className="input input-bordered" type="date" required value={form.interview_date} onChange={set('interview_date')} />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Start time *</span>
              </label>
              <input className="input input-bordered" type="time" required value={form.start_time} onChange={set('start_time')} />
            </div>
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">End time</span>
            </label>
            <input className="input input-bordered" type="time" value={form.end_time} onChange={set('end_time')} />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Gap between slots (minutes)</span>
            </label>
            <input
              className="input input-bordered"
              type="number"
              min="0"
              max="120"
              value={form.gap_minutes}
              onChange={set('gap_minutes')}
              placeholder="30"
            />
            <div className="label">
              <span className="label-text-alt text-base-content/60">Set 0 for same time for all candidates. Default 30 min.</span>
            </div>
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Venue</span>
            </label>
            <input className="input input-bordered" value={form.venue} onChange={set('venue')} placeholder="On-campus or office address" />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Meeting link</span>
            </label>
            <input className="input input-bordered" type="url" value={form.meeting_link} onChange={set('meeting_link')} placeholder="https://meet.google.com/…" />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Notes</span>
            </label>
            <textarea className="textarea textarea-bordered" rows={2} value={form.notes} onChange={set('notes')} placeholder="Bring your CV / laptop…" />
          </div>

          <div className="modal-action">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary" disabled={saving}>
              {saving && <span className="loading loading-spinner loading-sm" />}
              Schedule {applications.length} interview{applications.length !== 1 ? 's' : ''}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  )
}

export default BulkInterviewModal