// Edge Function: process-approval
// Writes an audit log + triggers notifications when a job is approved/rejected by admin.

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

Deno.serve(async (req) => {
  const { job_id, decision, performed_by } = await req.json()

  if (!job_id || !['approved', 'rejected'].includes(decision)) {
    return Response.json({ error: 'job_id and decision (approved|rejected) are required' }, { status: 400 })
  }

  await supabase.from('audit_logs').insert({
    action: `job_${decision}`,
    resource: 'jobs',
    resource_id: job_id,
    performed_by,
  })

  const { data: job, error } = await supabase
    .from('jobs')
    .select('posted_by, title')
    .eq('id', job_id)
    .single()

  if (!error && job?.posted_by) {
    await supabase.from('notifications').insert({
      user_id: job.posted_by,
      title: decision === 'approved' ? 'Job approved' : 'Job rejected',
      message: `Your job post "${job.title}" was ${decision}.`,
      type: 'job_approval',
    })
  }

  return Response.json({ ok: true })
})