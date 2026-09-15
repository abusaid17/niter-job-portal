import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { formatDate } from '../../utils/format'
import { sendEmail } from '../../utils/email'

export default function InterviewModal({ open, application, jobTitle, onClose, onScheduled }) {
  const { session } = useAuth()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({
    interview_date: '',
    start_time: '',
    end_time: '',
    venue: '',
    meeting_link: '',
    notes: '',
  })

  if (!open) return null

  const applicantUserId = application?.students?.user_id ?? application?.applicant?.id

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (!form.interview_date || !form.start_time) throw new Error('Date and start time are required.')
      const { error: insError } = await supabase.from('interviews').insert({
        application_id: application.id,
        scheduled_by: session.user.id,
        interview_date: form.interview_date,
        start_time: form.start_time,
        end_time: form.end_time || null,
        venue: form.venue || null,
        meeting_link: form.meeting_link || null,
        notes: form.notes || null,
      })
      if (insError) throw insError

      const { error: appError } = await supabase
        .from('applications')
        .update({ status: 'INTERVIEW_SCHEDULED' })
        .eq('id', application.id)
      if (appError) throw appError

      if (applicantUserId) {
        await supabase.rpc('notify_user', {
          p_user_id: applicantUserId,
          p_title: 'Interview scheduled',
          p_message: `You have an interview for ${jobTitle ?? 'a job'} on ${formatDate(form.interview_date)} ${form.start_time}.`,
        })
      }

      const applicantEmail =
        application?.students?.users?.email ?? application?.applicant?.email
      if (applicantEmail) {
        sendEmail('interview_scheduled', applicantEmail, {
          detail:
            `Job: ${jobTitle ?? '—'}\n` +
            `Date: ${formatDate(form.interview_date)}\n` +
            `Time: ${form.start_time}${form.end_time ? ` – ${form.end_time}` : ''}\n` +
            (form.venue ? `Venue: ${form.venue}\n` : '') +
            (form.meeting_link ? `Meeting link: ${form.meeting_link}\n` : '') +
            (form.notes ? `Notes: ${form.notes}\n` : ''),
        })
      }

      onScheduled()
      onClose()
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  return (
    <dialog className="modal" open>
      <div className="modal-box">
        <h3 className="font-bold text-lg">Schedule interview</h3>
        <p className="text-sm text-base-content/70">
          {application?.students?.users?.name ?? 'Applicant'}
          {jobTitle ? ` — ${jobTitle}` : ''}
        </p>

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
              Schedule interview
            </button>
          </div>
        </form>
      </div>
    </dialog>
  )
}