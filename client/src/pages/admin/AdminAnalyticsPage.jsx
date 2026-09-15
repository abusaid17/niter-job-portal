import { useEffect, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { LoadingScreen } from '../../components/ui/LoadingScreen'

const CHART_COLORS = ['#2563eb', '#7c3aed', '#0891b2', '#db2777', '#ca8a04', '#16a34a', '#dc2626', '#4b5563', '#f59e0b', '#ec4899']

function StatTile({ label, value }) {
  return (
    <div className="card bg-base-100 p-5 text-center shadow-sm">
      <div className="text-4xl font-extrabold text-primary">{value}</div>
      <div className="mt-1 text-sm text-base-content/70">{label}</div>
    </div>
  )
}

function ChartCard({ title, children, height = 300 }) {
  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        <h2 className="card-title text-base mb-3">{title}</h2>
        <ResponsiveContainer width="100%" height={height}>
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default function AdminAnalyticsPage() {
  const { session } = useAuth()
  const [jobs, setJobs] = useState([])
  const [applications, setApplications] = useState([])
  const [placements, setPlacements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!session?.user?.id) return
    let active = true
    Promise.all([
      supabase.from('jobs').select('id, title, department, status, created_at, companies(name)').order('created_at', { ascending: false }).limit(500),
      supabase.from('applications').select('id, status, applied_at, students(department), jobs(title, department), companies(name)').order('applied_at', { ascending: false }).limit(1000),
      supabase.from('placements').select('*, students(department, users(name)), companies(name), jobs(title, department)').order('offer_date', { ascending: false }).limit(500),
    ]).then(([jR, aR, pR]) => {
      if (!active) return
      if (jR.error || aR.error || pR.error) {
        setError(jR.error?.message ?? aR.error?.message ?? pR.error?.message)
      } else {
        setJobs(jR.data ?? [])
        setApplications(aR.data ?? [])
        setPlacements(pR.data ?? [])
      }
      setLoading(false)
    })
    return () => { active = false }
  }, [session])

  // --- Applications over time (line chart) ---
  const appsByMonth = useMemo(() => {
    const map = {}
    for (const a of applications) {
      const month = a.applied_at ? a.applied_at.slice(0, 7) : 'Unknown'
      map[month] = (map[month] ?? 0) + 1
    }
    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, value]) => ({ name, value }))
  }, [applications])

  // --- Jobs by department (bar chart) ---
  const jobsByDept = useMemo(() => {
    const map = {}
    for (const j of jobs) {
      const dept = j.department || 'Unspecified'
      map[dept] = (map[dept] ?? 0) + 1
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }))
  }, [jobs])

  // --- Placement rate by department (bar chart) ---
  const placementRateByDept = useMemo(() => {
    // Get total students per department
    const studentsByDept = {}
    for (const a of applications) {
      const dept = a.students?.department || a.jobs?.department || 'Unspecified'
      studentsByDept[dept] = (studentsByDept[dept] ?? 0) + 1
    }

    // Get placements per department
    const placementsByDept = {}
    for (const p of placements) {
      const dept = p.students?.department || p.jobs?.department || 'Unspecified'
      placementsByDept[dept] = (placementsByDept[dept] ?? 0) + 1
    }

    // Calculate rate
    const allDepts = new Set([...Object.keys(studentsByDept), ...Object.keys(placementsByDept)])
    return Array.from(allDepts)
      .map((dept) => {
        const apps = studentsByDept[dept] ?? 0
        const placed = placementsByDept[dept] ?? 0
        const rate = apps > 0 ? ((placed / apps) * 100).toFixed(1) : 0
        return { name: dept, value: Number(rate) }
      })
      .sort((a, b) => b.value - a.value)
  }, [applications, placements])

  // --- Application status breakdown (pie chart) ---
  const appsByStatus = useMemo(() => {
    const map = {}
    for (const a of applications) {
      map[a.status] = (map[a.status] ?? 0) + 1
    }
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [applications])

  const totalJobs = jobs.length
  const totalApps = applications.length
  const totalPlacements = placements.length
  const placementRate = totalApps > 0 ? ((totalPlacements / totalApps) * 100).toFixed(1) : 0

  if (loading) return <LoadingScreen />

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics dashboard</h1>
        <p className="mt-1 text-base-content/70">Platform-wide hiring and placement analytics.</p>
      </div>

      {error && (
        <div role="alert" className="alert alert-error">{error}</div>
      )}

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatTile label="Total jobs" value={totalJobs} />
        <StatTile label="Applications" value={totalApps} />
        <StatTile label="Placements" value={totalPlacements} />
        <StatTile label="Placement rate" value={`${placementRate}%`} />
        <StatTile label="Departments" value={jobsByDept.length} />
      </div>

      {/* Row 1: Applications over time + Jobs by department */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Applications over time" height={300}>
          {appsByMonth.length === 0 ? (
            <p className="text-sm text-base-content/60 text-center py-8">No data yet.</p>
          ) : (
            <AreaChart data={appsByMonth}>
              <defs>
                <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} width={40} tick={{ fontSize: 12 }} />
              <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} formatter={(v) => [v, 'Applications']} />
              <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorApps)" />
            </AreaChart>
          )}
        </ChartCard>

        <ChartCard title="Jobs by department" height={300}>
          {jobsByDept.length === 0 ? (
            <p className="text-sm text-base-content/60 text-center py-8">No data yet.</p>
          ) : (
            <BarChart data={jobsByDept} layout="vertical">
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [v, 'Jobs']} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {jobsByDept.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ChartCard>
      </div>

      {/* Row 2: Placement rate by department + Application status breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Placement rate by department (%)" height={300}>
          {placementRateByDept.length === 0 ? (
            <p className="text-sm text-base-content/60 text-center py-8">No data yet.</p>
          ) : (
            <BarChart data={placementRateByDept} layout="vertical">
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${v}%`, 'Placement rate']} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} fill="#0891b2" />
            </BarChart>
          )}
        </ChartCard>

        <ChartCard title="Application status breakdown" height={300}>
          {appsByStatus.length === 0 ? (
            <p className="text-sm text-base-content/60 text-center py-8">No data yet.</p>
          ) : (
            <PieChart>
              <Pie
                data={appsByStatus}
                dataKey="value"
                nameKey="name"
                outerRadius={100}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                labelLine={false}
              >
                {appsByStatus.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [v, 'Applications']} />
              <Legend />
            </PieChart>
          )}
        </ChartCard>
      </div>

      {/* Row 3: Jobs by status + Applications by status */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Jobs by status" height={280}>
          {jobs.length === 0 ? (
            <p className="text-sm text-base-content/60 text-center py-8">No data yet.</p>
          ) : (
            <BarChart data={jobsByDept}>
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [v, 'Jobs']} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} fill="#7c3aed" />
            </BarChart>
          )}
        </ChartCard>

        <ChartCard title="Applications by department" height={280}>
          {appsByMonth.length === 0 ? (
            <p className="text-sm text-base-content/60 text-center py-8">No data yet.</p>
          ) : (
            <BarChart data={appsByMonth}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} width={40} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => [v, 'Applications']} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#db2777" />
            </BarChart>
          )}
        </ChartCard>
      </div>
    </div>
  )
}