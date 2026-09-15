import { useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { formatDate } from '../../utils/format'
import { LoadingScreen } from '../../components/ui/LoadingScreen'

const CHART_COLORS = ['#2563eb', '#7c3aed', '#0891b2', '#db2777', '#ca8a04', '#16a34a', '#dc2626', '#4b5563']

function StatTile({ label, value }) {
  return (
    <div className="card bg-base-100 p-5 text-center shadow-sm">
      <div className="text-4xl font-extrabold text-primary">{value}</div>
      <div className="mt-1 text-sm text-base-content/70">{label}</div>
    </div>
  )
}

function MiniTable({ title, rows }) {
  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        <h2 className="card-title text-base">{title}</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-base-content/60">No data yet.</p>
        ) : (
          <div className="flex flex-col gap-1 text-sm">
            {rows.map(([label, value], i) => (
              <div key={i} className="flex items-center justify-between border-b border-base-200 py-1 last:border-0">
                <span className="text-base-content/80">{label}</span>
                <span className="font-semibold">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ChartCard({ title, children, height = 250 }) {
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

export default function AdminReportsPage() {
  const { session } = useAuth()
  const [stats, setStats] = useState({})
  const [placements, setPlacements] = useState([])
  const [jobReports, setJobReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session?.user?.id) return
    let active = true
    Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'STUDENT'),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'ALUMNI'),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'RECRUITER'),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'FACULTY'),
      supabase.from('jobs').select('id, title, status, companies(name), created_at').order('created_at', { ascending: false }).limit(200),
      supabase.from('applications').select('id, status, applied_at, students(department), jobs(title), companies(name)').order('applied_at', { ascending: false }).limit(500),
      supabase.from('placements').select('*, students(department, users(name)), companies(name), jobs(title)').order('offer_date', { ascending: false }).limit(500),
      supabase.from('job_reports').select('id, reason, status, created_at, jobs(title), users(name)').order('created_at', { ascending: false }),
    ]).then(([sR, aR, rR, fR, jR, apR, plR, jrR]) => {
      if (!active) return
      const valid = (plR.data ?? []).filter((p) => p.salary != null)
      setStats({
        students: sR.count ?? 0, alumni: aR.count ?? 0, recruiters: rR.count ?? 0, faculty: fR.count ?? 0,
        totalJobs: jR.data?.length ?? 0, totalApps: apR.data?.length ?? 0, placements: plR.data?.length ?? 0,
        reports: jrR.data?.length ?? 0,
        jobsByStatus: jR.data?.reduce((m, j) => { m[j.status] = (m[j.status] ?? 0) + 1; return m }, {}) ?? {},
        appsByStatus: apR.data?.reduce((m, a) => { m[a.status] = (m[a.status] ?? 0) + 1; return m }, {}) ?? {},
        avgSalary: valid.length ? valid.reduce((a, p) => a + Number(p.salary), 0) / valid.length : 0,
      })
      setPlacements(plR.data ?? [])
      setJobReports(jrR.data ?? [])
      setLoading(false)
    })
    return () => { active = false }
  }, [session])

  const byDept = useMemo(() => {
    const map = {}
    for (const p of placements) { const d = p.students?.department ?? 'Other'; map[d] = (map[d] ?? 0) + 1 }
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [placements])

  const byCompany = useMemo(() => {
    const map = {}
    for (const p of placements) { const n = p.companies?.name ?? 'Unknown'; map[n] = (map[n] ?? 0) + 1 }
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10)
  }, [placements])

  const byYear = useMemo(() => {
    const map = {}
    for (const p of placements) { const y = p.offer_date ? String(new Date(p.offer_date).getFullYear()) : 'Unknown'; map[y] = (map[y] ?? 0) + 1 }
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]))
  }, [placements])

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

  const placementRateByDept = useMemo(() => {
    const appsByDept = {}
    for (const a of applications) {
      const dept = a.students?.department || a.jobs?.department || 'Unspecified'
      appsByDept[dept] = (appsByDept[dept] ?? 0) + 1
    }
    const placedByDept = {}
    for (const p of placements) {
      const dept = p.students?.department || p.jobs?.department || 'Unspecified'
      placedByDept[dept] = (placedByDept[dept] ?? 0) + 1
    }
    const allDepts = new Set([...Object.keys(appsByDept), ...Object.keys(placedByDept)])
    return Array.from(allDepts)
      .map((dept) => {
        const apps = appsByDept[dept] ?? 0
        const placed = placedByDept[dept] ?? 0
        const rate = apps > 0 ? ((placed / apps) * 100).toFixed(1) : 0
        return { name: dept, value: Number(rate) }
      })
      .sort((a, b) => b.value - a.value)
  }, [applications, placements])

  const openReports = jobReports.filter((r) => r.status === 'OPEN')

  async function resolveReport(id) {
    const { error } = await supabase.from('job_reports').update({ status: 'RESOLVED' }).eq('id', id)
    if (!error) {
      setJobReports((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'RESOLVED' } : r)))
    }
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Reports & analytics</h1>
        <p className="mt-1 text-base-content/70">Platform-wide statistics and management.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Students" value={stats.students} />
        <StatTile label="Alumni" value={stats.alumni} />
        <StatTile label="Recruiters" value={stats.recruiters} />
        <StatTile label="Faculty" value={stats.faculty} />
        <StatTile label="Total jobs" value={stats.totalJobs} />
        <StatTile label="Applications" value={stats.totalApps} />
        <StatTile label="Placements" value={stats.placements} />
        <StatTile label="Open reports" value={stats.reports} />
      </div>

      {/* Summary Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Applications over time" height={260}>
          {appsByMonth.length === 0 ? (
            <p className="text-sm text-base-content/60 text-center py-8">No data yet.</p>
          ) : (
            <AreaChart data={appsByMonth}>
              <defs>
                <linearGradient id="colorAppsSummary" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} width={40} tick={{ fontSize: 12 }} />
              <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} formatter={(v) => [v, 'Applications']} />
              <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorAppsSummary)" />
            </AreaChart>
          )}
        </ChartCard>

        <ChartCard title="Placement rate by department (%)" height={260}>
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
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <MiniTable title="Jobs by status" rows={Object.entries(stats.jobsByStatus ?? {}).sort((a, b) => b[1] - a[1])} />
        <MiniTable title="Applications by status" rows={Object.entries(stats.appsByStatus ?? {}).sort((a, b) => b[1] - a[1])} />
        <div className="card bg-base-100 text-center shadow-sm">
          <div className="card-body flex flex-col items-center justify-center">
            <div className="text-4xl font-extrabold text-primary">
              {Number.isFinite(stats.avgSalary) && stats.avgSalary > 0 ? `৳${Math.round(stats.avgSalary).toLocaleString()}` : '—'}
            </div>
            <div className="text-sm text-base-content/70">Average placement salary</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-base">Jobs by status</h2>
            {Object.keys(stats.jobsByStatus ?? {}).length === 0 ? (
              <p className="text-sm text-base-content/60">No data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={Object.entries(stats.jobsByStatus).map(([name, value]) => ({ name, value }))}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} width={30} tick={{ fontSize: 12 }} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {Object.entries(stats.jobsByStatus).map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-base">Applications by status</h2>
            {Object.keys(stats.appsByStatus ?? {}).length === 0 ? (
              <p className="text-sm text-base-content/60">No data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={Object.entries(stats.appsByStatus).map(([name, value]) => ({ name, value }))}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} height={55} />
                  <YAxis allowDecimals={false} width={30} tick={{ fontSize: 12 }} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {Object.entries(stats.appsByStatus).map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <MiniTable title="Top hiring companies" rows={byCompany} />
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-base">Placements by department</h2>
            {byDept.length === 0 ? (
              <p className="text-sm text-base-content/60">No data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={byDept.map(([name, value]) => ({ name, value }))} dataKey="value" nameKey="name" outerRadius={90} label>
                    {byDept.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        <MiniTable title="Placements by year" rows={byYear} />
      </div>

      {jobReports.length > 0 && (
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <h2 className="card-title text-base">Job reports</h2>
              {openReports.length > 0 && <span className="badge badge-warning">{openReports.length} open</span>}
            </div>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Job</th>
                    <th>Reason</th>
                    <th>Reported by</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobReports.map((r) => (
                    <tr key={r.id}>
                      <td className="text-sm font-medium">{r.jobs?.title ?? '—'}</td>
                      <td className="text-sm">{r.reason}</td>
                      <td className="text-sm text-base-content/70">{r.users?.name ?? 'Anonymous'}</td>
                      <td>
                        <span className={`badge badge-sm ${r.status === 'OPEN' ? 'badge-warning' : 'badge-success'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="text-right">
                        {r.status === 'OPEN' ? (
                          <button className="btn btn-sm btn-outline btn-success" onClick={() => resolveReport(r.id)}>
                            Mark resolved
                          </button>
                        ) : (
                          <span className="text-sm text-base-content/40">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <h2 className="card-title text-base">Recent placements</h2>
          {placements.length === 0 ? (
            <p className="text-sm text-base-content/60">No placements recorded.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Job / Company</th>
                    <th>Date</th>
                    <th className="text-right">Salary</th>
                  </tr>
                </thead>
                <tbody>
                  {placements.slice(0, 20).map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="font-medium">{p.students?.users?.name ?? 'Student'}</div>
                        <div className="text-xs text-base-content/60">{p.students?.department ?? ''}</div>
                      </td>
                      <td className="text-sm">
                        {p.jobs?.title ?? '—'}
                        <div className="text-xs text-base-content/60">{p.companies?.name ?? ''}</div>
                      </td>
                      <td className="text-sm">{formatDate(p.offer_date)}</td>
                      <td className="text-right text-sm">{p.salary != null ? `৳${Number(p.salary).toLocaleString()}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}