import { supabase } from '../lib/supabase'
import { formatDate } from './format'
import { sendEmail } from './email'

export const VALID_STATUS_TRANSITIONS = {
  APPLIED: ['UNDER_REVIEW', 'SHORTLISTED', 'REJECTED', 'INTERVIEW_SCHEDULED'],
  UNDER_REVIEW: ['SHORTLISTED', 'REJECTED', 'INTERVIEW_SCHEDULED', 'APPLIED'],
  SHORTLISTED: ['INTERVIEW_SCHEDULED', 'SELECTED', 'REJECTED', 'UNDER_REVIEW'],
  INTERVIEW_SCHEDULED: ['SELECTED', 'REJECTED', 'SHORTLISTED'],
  SELECTED: [],
  REJECTED: [],
  WITHDRAWN: [],
  EXPIRED: [],
}

export function canTransition(fromStatus, toStatus) {
  return VALID_STATUS_TRANSITIONS[fromStatus]?.includes(toStatus) ?? false
}

export function addMinutesToTime(timeStr, minutes) {
  if (!timeStr) return timeStr
  const [hours, mins] = timeStr.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, mins + minutes, 0, 0)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function timeCrossesMidnight(startTime, endTime, gapMinutes) {
  if (!endTime) return false
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const startMins = sh * 60 + sm
  const endMins = eh * 60 + em
  const duration = endMins - startMins
  if (duration <= 0) return false // overnight or invalid
  const finalEndMins = startMins + gapMinutes + duration
  return finalEndMins >= 24 * 60
}

export async function scheduleSingleInterview({
  application,
  jobTitle,
  interviewDate,
  startTime,
  endTime,
  venue,
  meetingLink,
  notes,
  session,
}) {
  const applicantEmail = application?.students?.users?.email ?? application?.applicant?.email

  // 1. Create interview record
  const { error: insError } = await supabase.from('interviews').insert({
    application_id: application.id,
    scheduled_by: session.user.id,
    interview_date: interviewDate,
    start_time: startTime,
    end_time: endTime || null,
    venue: venue || null,
    meeting_link: meetingLink || null,
    notes: notes || null,
  })
  if (insError) throw insError

  // 2. Update application status to INTERVIEW_SCHEDULED
  const { error: appError, data: updatedApps } = await supabase
    .from('applications')
    .update({ status: 'INTERVIEW_SCHEDULED' })
    .eq('id', application.id)
    .select('id')
  if (appError) throw appError
  if (!updatedApps?.length) throw new Error('Application update blocked by RLS or not found')

  // 3. Send email (non-blocking, fire-and-forget)
  if (applicantEmail) {
    sendEmail('interview_scheduled', applicantEmail, {
      detail:
        `Job: ${jobTitle ?? '—'}\n` +
        `Date: ${formatDate(interviewDate)}\n` +
        `Time: ${startTime}${endTime ? ` – ${endTime}` : ''}\n` +
        (venue ? `Venue: ${venue}\n` : '') +
        (meetingLink ? `Meeting link: ${meetingLink}\n` : '') +
        (notes ? `Notes: ${notes}\n` : ''),
    }).catch(() => {})
  }

  return { success: true, applicationId: application.id }
}

export async function sendStatusEmailsSequentially(applications, targetStatus, jobTitle) {
  for (const app of applications) {
    const applicantEmail = app.students?.users?.email ?? app.applicant?.email
    if (applicantEmail) {
      await new Promise(r => setTimeout(r, 400)) // 400ms delay
      sendEmail('status_change', applicantEmail, {
        detail: `Your application for "${jobTitle}" is now: ${targetStatus}.`
      }).catch(() => {})
    }
  }
}