import { supabase } from '../lib/supabase'
import { APPLICATION_STATUS } from './labels'

const TEMPLATES = {
  status_change: 'status_change',
  interview_scheduled: 'interview_scheduled',
  job_approval: 'job_approval',
  interview_reminder: 'interview_reminder',
}

// Best-effort transactional email. Never throws: email delivery is optional
// and must not block the core workflow.
export async function sendEmail(type, to, data = {}) {
  if (!to || !TEMPLATES[type]) return
  try {
    await supabase.functions.invoke('send-email', {
      body: { type, to, data },
    })
  } catch (err) {
    console.warn('Email send failed (non-blocking):', err?.message ?? err)
  }
}

export function statusEmailMessage(newStatus) {
  switch (newStatus) {
    case 'SHORTLISTED':
      return 'You have been shortlisted. Your recruiter will reach out about next steps.'
    case 'INTERVIEW_SCHEDULED':
      return 'An interview has been scheduled for your application.'
    case 'SELECTED':
      return 'Congratulations! You have been selected.'
    case 'REJECTED':
      return 'Unfortunately your application was not successful this time.'
    default:
      return `Your application status is now "${APPLICATION_STATUS[newStatus] ?? newStatus}".`
  }
}
