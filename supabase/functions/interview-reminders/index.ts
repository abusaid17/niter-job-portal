// Edge Function: interview-reminders
// Scheduled task: notifies applicants about interviews starting within the
// next 24 hours. Intended to be invoked on a schedule (e.g. every hour).
// Requires the SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY secrets.

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

Deno.serve(async () => {
  const from = new Date()
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000)

  const { data: interviews, error } = await supabase
    .from('interviews')
    .select(`
      id,
      interview_date,
      start_time,
      meeting_link,
      application_id,
      applications(students(user_id))
    `)
    .eq('status', 'SCHEDULED')
    .gte('interview_date', from.toISOString().slice(0, 10))
    .lte('interview_date', to.toISOString().slice(0, 10))

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  let notified = 0
  for (const interview of interviews ?? []) {
    const user_id = interview.applications?.students?.user_id
    if (!user_id) continue

    const { data: existing } = await supabase
      .from('interview_reminders')
      .select('id')
      .eq('interview_id', interview.id)
      .limit(1)

    if ((existing ?? []).length > 0) continue

    const { error: ins } = await supabase.from('interview_reminders').insert({
      interview_id: interview.id,
    })
    if (ins) continue

    await supabase.from('notifications').insert({
      user_id,
      title: 'Upcoming interview reminder',
      message:
        `Your interview is on ${interview.interview_date} at ${interview.start_time}.` +
        (interview.meeting_link ? ` Join: ${interview.meeting_link}` : ''),
      type: 'interview_reminder',
    })
    notified++
  }

  return Response.json({ ok: true, notified, window: { from, to } })
})
