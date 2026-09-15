import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { JobCard } from '../../components/jobs/JobCard'
import { EMPLOYMENT_TYPE, EXPERIENCE_LEVEL, JOB_DEPARTMENT } from '../../utils/labels'
import { useStudentSkills } from '../../hooks/useProfiles'

export default function JobsPage() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [type, setType] = useState('ALL')
  const [department, setDepartment] = useState('ALL')
  const [experience, setExperience] = useState('ALL')
  const { skills: studentSkills, loading: skillsLoading } = useStudentSkills()

  useEffect(() => {
    let active = true
    async function load() {
      const { data, error } = await supabase
        .from('jobs')
        .select('*, companies(name)')
        .eq('status', 'PUBLISHED')
        .order('created_at', { ascending: false })
      if (!active) return
      if (error) setError(error.message)
      else setJobs(data ?? [])
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return jobs.filter((j) => {
      const matchesQuery =
        !q ||
        j.title.toLowerCase().includes(q) ||
        (j.companies?.name ?? '').toLowerCase().includes(q) ||
        (j.location ?? '').toLowerCase().includes(q) ||
        (j.department ?? '').toLowerCase().includes(q) ||
        (j.skills ?? []).some((s) => s.toLowerCase().includes(q))
      const matchesType = type === 'ALL' || j.employment_type === type
      const matchesDept = department === 'ALL' || j.department === department
      const matchesExp = experience === 'ALL' || j.experience_level === experience
      return matchesQuery && matchesType && matchesDept && matchesExp
    })
  }, [jobs, query, type, department, experience])

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Job Listings</h1>
          <p className="text-sm text-base-content/70">Browse and apply to open opportunities.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="search"
            className="input input-bordered input-sm w-full sm:w-64"
            placeholder="Search by title, company, location, skill…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className="select select-bordered select-sm w-full sm:w-44"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="ALL">All types</option>
            {Object.entries(EMPLOYMENT_TYPE).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <select
          className="select select-bordered select-sm w-full sm:w-auto"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
        >
          <option value="ALL">All departments</option>
          {Object.entries(JOB_DEPARTMENT).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          className="select select-bordered select-sm w-full sm:w-auto"
          value={experience}
          onChange={(e) => setExperience(e.target.value)}
        >
          <option value="ALL">All experience levels</option>
          {Object.entries(EXPERIENCE_LEVEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div role="alert" className="alert alert-error mt-4 text-sm">
          {error}
        </div>
      )}

      {loading || skillsLoading ? (
        <div className="mt-10 flex justify-center">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((job) => (
            <JobCard key={job.id} job={job} studentSkills={studentSkills} />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="mt-10 text-center text-base-content/60">
          {jobs.length === 0
            ? 'No jobs have been published yet.'
            : 'No jobs match your filters.'}
        </div>
      )}
    </div>
  )
}