import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useStudentProfile } from '../../hooks/useProfiles'
import { APPLICATION_BADGE, APPLICATION_STATUS } from '../../utils/labels'
import { formatDate, todayISO } from '../../utils/format'
import { LoadingScreen } from '../../components/ui/LoadingScreen'
import { JobCard } from '../../components/jobs/JobCard'

function StatTile({ label, value, to }) {
  const inner = (
    <div className="card bg-base-100 p-5 text-center shadow-sm transition hover:shadow-md">
      <div className="text-4xl font-extrabold text-primary">{value}</div>
      <div className="mt-1 text-sm text-base-content/70">{label}</div>
    </div>
  )
  return to ? <Link to={to}>{inner}</Link> : inner
}

export default function StudentDashboardPage() {
  const { profile: user } = useAuth()
  const { profile: student, loading: profileLoading } = useStudentProfile()
  const [apps, setApps] = useState([])
  const [interviews, setInterviews] = useState([])
  const [recommended, setRecommended] = useState([])
  const [counts, setCounts] = useState({ education: 0, skills: 0, experience: 0, projects: 0, cvs: 0 })
  const [loading, setLoading] = useState(true)

  const studentId = student?.id

  useEffect(() => {
    if (!studentId) {
      setLoading(false)
      return
    }
    let active = true
    async function load() {
      const [appsR, interR, jobsR, eduR, skillsR, expR, projR, cvsR] = await Promise.all([
        supabase
          .from('applications')
          .select('id, status, applied_at, jobs(id, title, companies(name))')
          .order('applied_at', { ascending: false }),
        supabase.from('interviews').select('id, application_id, interview_date, start_time, end_time, venue, meeting_link, status'),
        supabase.from('jobs').select('*, companies(name)').eq('status', 'PUBLISHED').order('created_at', { ascending: false }).limit(5),
        supabase.from('education').select('id', { count: 'exact', head: true }),
        supabase.from('student_skills').select('id', { count: 'exact', head: true }),
        supabase.from('experience').select('id', { count: 'exact', head: true }),
        supabase.from('projects').select('id', { count: 'exact', head: true }),
        supabase.from('cvs').select('id', { count: 'exact', head: true }),
      ])
      if (!active) return
      setApps(appsR.data ?? [])
      setInterviews(interR.data ?? [])
      setRecommended(jobsR.data ?? [])
      setCounts({
        education: eduR.count ?? 0,
        skills: skillsR.count ?? 0,
        experience: expR.count ?? 0,
        projects: projR.count ?? 0,
        cvs: cvsR.count ?? 0,
      })
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [studentId])

  const stats = useMemo(() => {
    const byStatus = {}
    for (const a of apps) byStatus[a.status] = (byStatus[a.status] ?? 0) + 1
    return {
      total: apps.length,
      shortlisted: (byStatus.SHORTLISTED ?? 0) + (byStatus.INTERVIEW_SCHEDULED ?? 0) + (byStatus.SELECTED ?? 0),
      proactive: byStatus.APPLIED ?? 0,
      interviews: interviews.length,
    }
  }, [apps, interviews])

  const upcoming = useMemo(
    () =>
      interviews
        .filter((i) => i.interview_date >= todayISO())
        .sort((a, b) => a.interview_date.localeCompare(b.interview_date)),
    [interviews],
  )

  const completion = useMemo(() => {
    const checks = [
      student?.student_id && student?.department,
      student?.batch,
      student?.phone,
      student?.bio || student?.github_url || student?.linkedin_url,
      counts.education > 0,
      counts.skills > 0,
      counts.experience > 0,
      counts.projects > 0,
      counts.cvs > 0,
    ]
    const done = checks.filter(Boolean).length
    return { percent: Math.round((done / checks.length) * 100), done, total: checks.length }
  }, [student, counts])

  if (profileLoading) {
    return <LoadingScreen />
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome{user.name ? `, ${user.name.split(' ')[0]}` : ''} 👋
            {user.is_verified && <span className="badge badge-success ml-2 align-middle">Verified</span>}
          </h1>
          <p className="mt-1 text-base-content/70">Here is what is happening with your career so far.</p>
        </div>
        <Link to="/jobs" className="btn btn-primary">
          Browse jobs
        </Link>
      </div>

      {!student && (
        <div className="alert alert-warning">
          <span>
            Your student profile is not set up yet. Add your details so you can apply for jobs.
          </span>
          <Link to="/student/profile" className="btn btn-sm btn-primary">
            Complete profile
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Applications" value={stats.total} to="/student/applications" />
        <StatTile label="Shortlisted / In progress" value={stats.shortlisted} to="/student/applications" />
        <StatTile label="Upcoming interviews" value={upcoming.length} />
        <StatTile label="Open jobs" value={recommended.length} to="/jobs" />
      </div>

      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <h2 className="card-title">Profile completeness</h2>
            <span className={`text-2xl font-extrabold ${completion.percent >= 80 ? 'text-success' : 'text-primary'}`}>
              {loading ? '…' : `${completion.percent}%`}
            </span>
          </div>
          <progress className="progress progress-primary w-full" value={completion.percent} max="100" />
          <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
            {[
              'Student ID & department',
              'Session',
              'Phone number',
              'Bio or links',
              'Education',
              'Skills',
              'Experience',
              'Projects',
              'CV',
            ].map((label, i) => (
              <span key={label} className={`badge badge-sm gap-1 ${student && i <= completion.done - 1 ? 'badge-success' : 'badge-ghost'}`}>
                {i <= completion.done - 1 ? '✓' : '○'} {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Recent applications</h2>
            <Link to="/student/applications" className="link link-primary text-sm">
              View all
            </Link>
          </div>
          {loading ? (
            <div className="mt-4 flex justify-center">
              <span className="loading loading-spinner loading-lg text-primary" />
            </div>
          ) : apps.length === 0 ? (
            <div className="card mt-3 bg-base-100 p-6 text-center text-sm text-base-content/60 shadow-sm">
              No applications yet. Discover opportunities in the job board.
            </div>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-box bg-base-100 shadow-sm">
              <table className="table">
                <thead>
                  <tr>
                    <th>Job</th>
                    <th>Applied</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {apps.slice(0, 6).map((a) => (
                    <tr key={a.id}>
                      <td>
                        <Link to={`/jobs/${a.jobs?.id}`} className="link font-medium">
                          {a.jobs?.title ?? 'Job removed'}
                        </Link>
                        <div className="text-xs text-base-content/60">{a.jobs?.companies?.name}</div>
                      </td>
                      <td className="text-sm text-base-content/70">{formatDate(a.applied_at)}</td>
                      <td>
                        <span className={`badge badge-sm ${APPLICATION_BADGE[a.status] ?? 'badge-ghost'}`}>
                          {APPLICATION_STATUS[a.status] ?? a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h2 className="mt-8 text-lg font-bold">Upcoming interviews</h2>
          {upcoming.length === 0 ? (
            <div className="card mt-3 bg-base-100 p-6 text-center text-sm text-base-content/60 shadow-sm">
              No interviews scheduled yet.
            </div>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {upcoming.map((i) => (
                <div key={i.id} className="card bg-base-100 shadow-sm">
                  <div className="card-body">
                    <div className="card-title text-base">{formatDate(i.interview_date)}</div>
                    <p className="text-sm text-base-content/70">
                      {i.start_time?.slice(0, 5)}
                      {i.end_time ? ` – ${i.end_time.slice(0, 5)}` : ''} · {i.venue || 'Online'}
                    </p>
                    {i.meeting_link && (
                      <a className="link link-primary text-sm" href={i.meeting_link} target="_blank" rel="noreferrer noopener">
                        Join meeting
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-lg font-bold">Recommended for you</h2>
          {loading ? (
            <div className="mt-4 flex justify-center">
              <span className="loading loading-spinner loading-lg text-primary" />
            </div>
          ) : recommended.length === 0 ? (
            <div className="card mt-3 bg-base-100 p-6 text-center text-sm text-base-content/60 shadow-sm">
              No open jobs posted yet.
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              {recommended.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}