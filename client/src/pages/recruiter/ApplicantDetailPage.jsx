import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { APPLICATION_BADGE, APPLICATION_STATUS } from '../../utils/labels'
import { formatDate } from '../../utils/format'
import { openCv } from '../../utils/cv'
import { sendEmail, statusEmailMessage } from '../../utils/email'
import { LoadingScreen } from '../../components/ui/LoadingScreen'
import InterviewModal from '../../components/interviews/InterviewModal'

function Section({ title, children }) {
  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        <h2 className="card-title text-base">{title}</h2>
        {children}
      </div>
    </div>
  )
}

function Timeline({ from, to, current, suffix }) {
  return (
    <span className="text-sm text-base-content/60">
      {from}
      {current ? ' — Present' : to ? ` — ${to}` : ''}
      {suffix}
    </span>
  )
}

export default function ApplicantDetailPage() {
  const { applicationId } = useParams()
  const { session } = useAuth()
  const navigate = useNavigate()
  const [app, setApp] = useState(null)
  const [alumni, setAlumni] = useState(null)
  const [education, setEducation] = useState([])
  const [experience, setExperience] = useState([])
  const [projects, setProjects] = useState([])
  const [skills, setSkills] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [interviewing, setInterviewing] = useState(false)
  const [cvError, setCvError] = useState(null)

  useEffect(() => {
    if (!session?.user?.id) return
    let active = true
    async function load() {
      const appR = await supabase
        .from('applications')
        .select('*, students(id, student_id, department, batch, semester, cgpa, phone, bio, linkedin_url, github_url, portfolio_url, users(id, name, email)), jobs(id, title), cvs(id, title, file_path), applicant:users!applications_applicant_user_id_fkey(id, name, email)')
        .eq('id', applicationId)
        .single()
      if (!active) return
      if (appR.error) {
        setError(appR.error.message)
        setLoading(false)
        return
      }
      setApp(appR.data)
      const studentId = appR.data?.students?.id
      const applicantUserId = appR.data?.applicant?.id
      if (studentId) {
        const [edR, exR, prR, skR] = await Promise.all([
          supabase.from('education').select('*').eq('student_id', studentId).order('start_year', { ascending: false }),
          supabase.from('experience').select('*').eq('student_id', studentId).order('start_date', { ascending: false }),
          supabase.from('projects').select('*').eq('student_id', studentId).order('start_year', { ascending: false }),
          supabase.from('student_skills').select('*, skills(name)').eq('student_id', studentId),
        ])
        if (active) {
          setEducation(edR.data ?? [])
          setExperience(exR.data ?? [])
          setProjects(prR.data ?? [])
          setSkills(skR.data ?? [])
        }
      }
      if (applicantUserId) {
        const aR = await supabase.from('alumni').select('*').eq('user_id', applicantUserId).maybeSingle()
        if (active) setAlumni(aR.data ?? null)
      }
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [session, applicationId])

  async function setStatus(status) {
    if (!app) return
    setBusy(true)
    setError(null)
    const { error: e } = await supabase.from('applications').update({ status }).eq('id', app.id)
    setBusy(false)
    if (e) {
      setError(e.message)
      return
    }
    setApp((prev) => (prev ? { ...prev, status } : prev))

    const applicantUserId = app.students?.user_id ?? app.applicant?.id
    const applicantEmail = app.students?.users?.email ?? app.applicant?.email
    if (applicantUserId) {
      await supabase.rpc('notify_user', {
        p_user_id: applicantUserId,
        p_title: 'Application status updated',
        p_message: statusEmailMessage(status),
      })
    }
    if (applicantEmail) {
      sendEmail('status_change', applicantEmail, {
        detail: statusEmailMessage(status),
      })
    }
  }

  async function startConversation() {
    const applicantUserId = app.students?.user_id ?? app.applicant?.id
    if (!applicantUserId) return
    const { data, error } = await supabase.rpc('start_conversation', {
      p_other_user: applicantUserId,
    })
    if (error) {
      setError(error.message)
      return
    }
    navigate(`/messages/${data}`)
  }

  if (loading) {
    return <LoadingScreen />
  }

  if (!app) {
    return (
      <div role="alert" className="alert alert-error max-w-xl">
        {error ?? 'Application not found or you do not have access.'}
      </div>
    )
  }

  const student = app.students ?? {}
  const user = student.users ?? {}
  const isAlumni = app.applicant != null
  const name = user.name ?? app.applicant?.name ?? 'Applicant'

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to={`/recruiter/jobs/${app.jobs?.id}/applicants`} className="link link-primary text-sm">
            ← Back to applicants
          </Link>
          <h1 className="mt-1 text-3xl font-bold">{name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-base-content/70">
            {isAlumni && <span className="badge badge-ghost badge-sm">Alumni</span>}
            <span className={`badge badge-sm ${APPLICATION_BADGE[app.status] ?? 'badge-ghost'}`}>
              {APPLICATION_STATUS[app.status] ?? app.status}
            </span>
            <span>Applied {formatDate(app.applied_at)}</span>
            <span>· for {app.jobs?.title}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-sm btn-outline" onClick={startConversation}>
            Message
          </button>
          {!isAlumni && app.cvs?.file_path && (
            <button
              className="btn btn-sm btn-outline"
              onClick={() =>
                openCv(app.cvs).catch((e) => setCvError(e.message))
              }
            >
              View CV
            </button>
          )}
          {app.status !== 'REJECTED' && (
            <button className="btn btn-sm btn-outline btn-error" disabled={busy} onClick={() => setStatus('REJECTED')}>
              Reject
            </button>
          )}
          {app.status !== 'INTERVIEW_SCHEDULED' && app.status !== 'SELECTED' && (
            <button className="btn btn-sm btn-outline btn-success" disabled={busy} onClick={() => setStatus('SHORTLISTED')}>
              Shortlist
            </button>
          )}
          {app.status !== 'INTERVIEW_SCHEDULED' && app.status !== 'SELECTED' && app.status !== 'REJECTED' && (
            <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => setInterviewing(true)}>
              Schedule interview
            </button>
          )}
        </div>
      </div>

      {(error || cvError) && (
        <div role="alert" className="alert alert-error">
          {error ?? cvError}
        </div>
      )}

      {isAlumni ? (
        <section className="flex flex-col gap-6">
          <Section title="Contact">
            <div className="flex flex-col gap-1 text-sm">
              <a className="link" href={`mailto:${app.applicant?.email}`}>
                {app.applicant?.email}
              </a>
              {alumni?.student_id && <span>Student ID: {alumni.student_id}</span>}
              {alumni?.linkedin_url && (
                <a className="link" href={alumni.linkedin_url} target="_blank" rel="noreferrer">
                  LinkedIn
                </a>
              )}
            </div>
          </Section>

          {(alumni?.current_company || alumni?.current_position || alumni?.graduation_year) && (
            <Section title="Currently">
              <div className="flex flex-col gap-1 text-sm">
                {alumni?.current_position && <span className="font-medium">{alumni.current_position}</span>}
                {alumni?.current_company && <span>{alumni.current_company}</span>}
                {alumni?.graduation_year && <span>Class of {alumni.graduation_year}</span>}
                {alumni?.department && <span>{alumni.department}</span>}
              </div>
            </Section>
          )}

          {alumni?.bio && <Section title="Bio">{alumni.bio}</Section>}

          <Section title="Application">
            <p className="whitespace-pre-wrap text-sm">{app.cover_letter || 'No cover letter provided.'}</p>
          </Section>
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6">
          <Section title="Contact">
            <div className="flex flex-col gap-1 text-sm">
              <span>{app.cvs?.title}</span>
              <a className="link" href={`mailto:${user.email}`}>
                {user.email}
              </a>
              {student.phone && <span>{student.phone}</span>}
              <div className="mt-1 flex flex-col gap-1">
                {student.linkedin_url && (
                  <a className="link" href={student.linkedin_url} target="_blank" rel="noreferrer">
                    LinkedIn
                  </a>
                )}
                {student.github_url && (
                  <a className="link" href={student.github_url} target="_blank" rel="noreferrer">
                    GitHub
                  </a>
                )}
                {student.portfolio_url && (
                  <a className="link" href={student.portfolio_url} target="_blank" rel="noreferrer">
                    Portfolio
                  </a>
                )}
              </div>
            </div>
          </Section>

          {student.bio && <Section title="Bio">{student.bio}</Section>}

          {(student.department || student.cgpa) && (
            <Section title="Academics">
              <div className="flex flex-col gap-1 text-sm">
                <span>
                  {[student.department, student.batch].filter(Boolean).join(' · ') || '—'}
                </span>
                {student.cgpa != null && <span>CGPA: {Number(student.cgpa).toFixed(2)}</span>}
                {student.semester && <span>Semester: {student.semester}</span>}
              </div>
            </Section>
          )}

          <Section title="Skills">
            {skills.length === 0 ? (
              <p className="text-sm text-base-content/60">No skills listed.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {skills.map((s) => (
                  <span key={s.id} className="badge badge-outline">
                    {s.skills?.name ?? 'skill'}
                  </span>
                ))}
              </div>
            )}
          </Section>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-2">
          <Section title="Application">
            <p className="whitespace-pre-wrap text-sm">{app.cover_letter || 'No cover letter provided.'}</p>
            {!app.cvs?.file_path && <p className="mt-2 text-xs text-base-content/50">No CV file attached.</p>}
          </Section>

          <Section title="Education">
            {education.length === 0 ? (
              <p className="text-sm text-base-content/60">No education listed.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {education.map((e) => (
                  <div key={e.id} className="border-b border-base-200 pb-3 last:border-0 last:pb-0">
                    <div className="font-medium">{e.degree ?? e.institution}</div>
                    {e.institution && <div className="text-sm">{e.institution}</div>}
                    {e.field && <div className="text-sm text-base-content/70">{e.field}</div>}
                    <Timeline from={e.start_year} to={e.end_year} />
                    {e.gpa != null && <div className="text-sm text-base-content/70">GPA: {Number(e.gpa).toFixed(2)}</div>}
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Experience">
            {experience.length === 0 ? (
              <p className="text-sm text-base-content/60">No experience listed.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {experience.map((x) => (
                  <div key={x.id} className="border-b border-base-200 pb-3 last:border-0 last:pb-0">
                    <div className="font-medium">{x.role ?? x.company}</div>
                    {x.company && <div className="text-sm">{x.company}</div>}
                    {x.location && <div className="text-sm text-base-content/60">{x.location}</div>}
                    <Timeline from={x.start_date ? formatDate(x.start_date) : undefined} to={x.end_date ? formatDate(x.end_date) : undefined} current={x.is_current} />
                    {x.description && <p className="mt-1 whitespace-pre-wrap text-sm text-base-content/70">{x.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Projects">
            {projects.length === 0 ? (
              <p className="text-sm text-base-content/60">No projects listed.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {projects.map((p) => (
                  <div key={p.id}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{p.title}</span>
                      <Timeline from={p.start_year} to={p.end_year} />
                    </div>
                    {p.description && <p className="mt-1 whitespace-pre-wrap text-sm">{p.description}</p>}
                    {p.link && (
                      <a className="mt-1 link link-primary text-sm" href={p.link} target="_blank" rel="noreferrer">
                        {p.link}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>
      )}

      <InterviewModal
        open={interviewing}
        application={app}
        jobTitle={app.jobs?.title}
        onClose={() => setInterviewing(false)}
        onScheduled={() => {
          setInterviewing(false)
          setStatus('INTERVIEW_SCHEDULED')
        }}
      />
    </div>
  )
}