// Edge Function: send-email
// Sends transactional emails through Resend (verification, reset, interview, status, approvals).

import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

Deno.serve(async (req) => {
  const { type, to, data } = await req.json()

  if (!type || !to) {
    return Response.json({ error: 'type and to are required' }, { status: 400 })
  }

  const templates = {
    verification: { subject: 'Verify your NITER Job Portal email', text: 'Click the link below to verify your email.' },
    password_reset: { subject: 'Reset your NITER Job Portal password', text: 'Click the link below to reset your password.' },
    interview_scheduled: { subject: 'Interview scheduled', text: 'Your interview has been scheduled. See details below.' },
    interview_reminder: { subject: 'Upcoming interview reminder', text: 'Reminder: you have an interview coming up.' },
    status_change: { subject: 'Application status update', text: 'Your application status has changed.' },
    job_approval: { subject: 'Your job post was approved', text: 'Your job post has been approved.' },
  }

  const tpl = templates[type]
  if (!tpl) {
    return Response.json({ error: `unknown email type: ${type}` }, { status: 400 })
  }

  const link = data?.link ?? ''
  const detail = data?.detail ?? ''
  const { data: email, error } = await resend.emails.send({
    from: 'NITER Job Portal <onboarding@resend.dev>',
    to,
    subject: tpl.subject,
    text: `${tpl.text}\n\n${link}\n${detail}\n`.trim(),
  })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  await supabase.from('email_logs').insert({ type, to, email_id: email?.id })

  return Response.json({ ok: true, email_id: email?.id })
})