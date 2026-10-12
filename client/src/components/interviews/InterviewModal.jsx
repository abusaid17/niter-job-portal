import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { formatDate } from '../../utils/format'
import { sendEmail } from '../../utils/email'
import {
  AlertCircle,
  CalendarDays,
  Clock,
  Link2,
  MapPin,
  NotebookPen,
  Send,
  User,
  X,
} from 'lucide-react'

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

  const applicantName = application?.students?.users?.name ?? application?.applicant?.name ?? 'Applicant'
  const hasSchedule = Boolean(form.interview_date && form.start_time)

  return (
    <dialog className="modal" open>
      <div className="modal-box max-w-lg p-0 overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-secondary px-6 py-5 text-primary-content">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-white/20 p-2.5">
                <CalendarDays className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold leading-tight">Schedule interview</h3>
                <p className="mt-0.5 text-sm text-primary-content/80">
                  Pick a time — the applicant is notified instantly.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-circle btn-ghost btn-sm text-primary-content"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 font-medium">
              <User className="h-3.5 w-3.5" />
              {applicantName}
            </span>
            {jobTitle && (
              <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 font-medium">
                {jobTitle}
              </span>
            )}
          </div>
        </div>

        <div className="px-6 py-5">
          {error && (
            <div role="alert" className="alert alert-error mb-4 text-sm shadow-sm">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {hasSchedule && (
            <div className="mb-4 flex items-center gap-3 rounded-2xl border border-primary/25 bg-primary/5 px-4 py-3">
              <div className="rounded-xl bg-primary/10 p-2 text-primary">
                <Clock className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-base-content/50">Interview preview</p>
                <p className="truncate text-sm font-bold">
                  {formatDate(form.interview_date)} · {form.start_time}
                  {form.end_time ? ` – ${form.end_time}` : ''}
                </p>
                {(form.venue || form.meeting_link) && (
                  <p className="truncate text-xs text-base-content/60">
                    {form.venue || 'Online — link below'}
                  </p>
                )}
              </div>
            </div>
          )}

          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="form-control">
                <label className="label pb-1">
                  <span className="label-text flex items-center gap-1 text-sm font-medium">
                    <CalendarDays className="h-3.5 w-3.5 text-base-content/50" /> Date *
                  </span>
                </label>
                <input className="input input-bordered w-full" type="date" required value={form.interview_date} onChange={set('interview_date')} />
              </div>
              <div className="form-control">
                <label className="label pb-1">
                  <span className="label-text flex items-center gap-1 text-sm font-medium">
                    <Clock className="h-3.5 w-3.5 text-base-content/50" /> Starts *
                  </span>
                </label>
                <input className="input input-bordered w-full" type="time" required value={form.start_time} onChange={set('start_time')} />
              </div>
              <div className="form-control col-span-2 sm:col-span-1">
                <label className="label pb-1">
                  <span className="label-text flex items-center gap-1 text-sm font-medium">
                    <Clock className="h-3.5 w-3.5 text-base-content/50" /> Ends
                  </span>
                </label>
                <input className="input input-bordered w-full" type="time" value={form.end_time} onChange={set('end_time')} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="form-control">
                <label className="label pb-1">
                  <span className="label-text flex items-center gap-1 text-sm font-medium">
                    <MapPin className="h-3.5 w-3.5 text-base-content/50" /> Venue
                  </span>
                </label>
                <input className="input input-bordered w-full" value={form.venue} onChange={set('venue')} placeholder="On-campus or office address" />
              </div>
              <div className="form-control">
                <label className="label pb-1">
                  <span className="label-text flex items-center gap-1 text-sm font-medium">
                    <Link2 className="h-3.5 w-3.5 text-base-content/50" /> Meeting link
                  </span>
                </label>
                <input className="input input-bordered w-full" type="url" value={form.meeting_link} onChange={set('meeting_link')} placeholder="https://meet.google.com/…" />
              </div>
            </div>
            <div className="form-control">
              <label className="label pb-1">
                <span className="label-text flex items-center gap-1 text-sm font-medium">
                  <NotebookPen className="h-3.5 w-3.5 text-base-content/50" /> Notes
                </span>
                <span className="label-text-alt text-base-content/50">visible to the applicant</span>
              </label>
              <textarea className="textarea textarea-bordered min-h-20 w-full" rows={2} value={form.notes} onChange={set('notes')} placeholder="Bring your CV / laptop…" />
            </div>

            <div className="modal-action mt-1">
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button className="btn btn-primary" disabled={saving}>
                {saving ? <span className="loading loading-spinner loading-sm" /> : <Send className="h-4 w-4" />}
                {saving ? 'Scheduling…' : 'Schedule interview'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </dialog>
  )
}