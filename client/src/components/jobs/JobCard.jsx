import { Link } from 'react-router-dom'
import { EMPLOYMENT_TYPE, EXPERIENCE_LEVEL } from '../../utils/labels'
import { formatDate, formatMoney } from '../../utils/format'
import { calculateSkillMatch, getMatchBadgeClass } from '../../utils/matching'

export function JobCard({ job, studentSkills = [] }) {
  const company = job.companies?.name
  const salary = [job.salary_min, job.salary_max]
    .filter((v) => v != null)
    .map(formatMoney)
    .join(' – ')

  const matchPercentage = calculateSkillMatch(studentSkills, job.skills)
  const showMatch = job.skills && job.skills.length > 0

  return (
    <Link to={`/jobs/${job.id}`} className="card bg-base-100 shadow-sm transition hover:shadow-md">
      <div className="card-body">
        <div className="flex items-start justify-between gap-3">
          <h2 className="card-title text-lg">{job.title}</h2>
          <div className="flex flex-col items-end gap-1">
            <span className="badge badge-outline badge-sm whitespace-nowrap">
              {EMPLOYMENT_TYPE[job.employment_type] ?? job.employment_type}
            </span>
            {showMatch && (
              <span className={`badge badge-sm ${getMatchBadgeClass(matchPercentage)}`}>
                {matchPercentage}% match
              </span>
            )}
          </div>
        </div>
        <p className="text-sm text-base-content/70">
          {company ? `at ${company}` : 'Company'} · {job.location ?? 'Location not specified'}
        </p>
        <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
          {job.experience_level && (
            <span className="badge badge-ghost badge-sm">
              {EXPERIENCE_LEVEL[job.experience_level] ?? job.experience_level}
            </span>
          )}
          {(job.skills ?? []).slice(0, 4).map((s) => (
            <span key={s} className="badge badge-outline badge-sm">{s}</span>
          ))}
          {(job.skills ?? []).length > 4 && (
            <span className="badge badge-ghost badge-sm">+{(job.skills ?? []).length - 4} more</span>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-base-content/60">
          {salary && (
            <span>
              <strong>Salary:</strong> {salary}
            </span>
          )}
          {job.vacancy_count != null && (
            <span>
              <strong>Vacancies:</strong> {job.vacancy_count}
            </span>
          )}
          {job.deadline && (
            <span className={new Date(job.deadline) < new Date() ? 'text-error' : ''}>
              <strong>Deadline:</strong> {formatDate(job.deadline)}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}