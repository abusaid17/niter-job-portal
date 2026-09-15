import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { formatDate } from '../../utils/format'
import { LoadingScreen } from '../../components/ui/LoadingScreen'

const CHART_COLORS = ['#2563eb', '#7c3aed', '#0891b2', '#db2777', '#ca8a04', '#16a34a', '#dc2626', '#4b5563']

function MiniTable({ title, rows, valueFormatter }) {
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
                <span className="font-semibold">{valueFormatter ? valueFormatter(value) : value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function FacultyReportsPage() {
  const { session } = useAuth()
  const [students, setStudents] = useState([])
  const [placements, setPlacements] = useState([])
  const [events, setEvents] = useState([])
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!session?.user?.id) return
    let active = true
    Promise.all([
      supabase.from('students').select('id, department, batch, cgpa, users(is_verified)').order('id'),
      supabase.from('placements').select('*, students(department, users(name)), companies(name), jobs(title)').order('offer_date', { ascending: false }).limit(500),
      supabase.from('events').select('id, title, starts_at').order('starts_at', { ascending: false }).limit(200),
      supabase.from('event_registrations').select('id, event_id, status'),
    ]).then(([stR, plR, evR, rgR]) => {
      if (!active) return
      if (plR.error) {
        setError(plR.error.message)
      }
      setStudents(stR.data ?? [])
      setPlacements(plR.data ?? [])
      setEvents(evR.data ?? [])
      setRegistrations(rgR.data ?? [])
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [session])

  const stats = useMemo(() => {
    const verified = students.filter((s) => s.users?.is_verified).length
    const avgCgpa = students.length ? students.reduce((a, s) => a + (Number(s.cgpa) || 0), 0) / students.length : 0
    return { students: students.length, verified, unverified: students.length - verified, avgCgpa }
  }, [students])

  const byDept = useMemo(() => {
    const map = {}
    for (const pl of placements) {
      const dept = pl.students?.department ?? 'Other'
      map[dept] = (map[dept] ?? 0) + 1
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [placements])

  const byYear = useMemo(() => {
    const map = {}
    for (const pl of placements) {
      const year = pl.offer_date ? String(new Date(pl.offer_date).getFullYear()) : 'Unknown'
      map[year] = ((map[year] ?? 0) + 1)
    }
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]))
  }, [placements])

  const byCompany = useMemo(() => {
    const map = {}
    for (const pl of placements) {
      const name = pl.companies?.name ?? 'Unknown'
      map[name] = (map[name] ?? 0) + 1
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [placements])

  const participation = useMemo(() => {
    const counts = {}
    for (const r of registrations) {
      counts[r.event_id] = (counts[r.event_id] ?? 0) + 1
    }
    return events
      .map((ev) => [ev.title, counts[ev.id] ?? 0])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
  }, [events, registrations])

  const avgSalary = placements.length
    ? placements.reduce((a, pl) => a + (Number(pl.salary) || 0), 0) / placements.filter((pl) => pl.salary != null).length
    : 0

  const placementRateByDept = useMemo(() => {
    const studentsByDept = {}
    for (const s of students) {
      const dept = s.department ?? 'Unspecified'
      studentsByDept[dept] = (studentsByDept[dept] ?? 0) + 1
    }

    const placementsByDept = {}
    for (const pl of placements) {
      const dept = pl.students?.department ?? 'Unspecified'
      placementsByDept[dept] = (placementsByDept[dept] ?? 0) + 1
    }

    const allDepts = new Set([...Object.keys(studentsByDept), ...Object.keys(placementsByDept)])
    return Array.from(allDepts)
      .map((dept) => {
        const total = studentsByDept[dept] ?? 0
        const placed = placementsByDept[dept] ?? 0
        const rate = total > 0 ? ((placed / total) * 100).toFixed(1) : 0
        return { name: dept, value: Number(rate) }
      })
      .sort((a, b) => b.value - a.value)
  }, [students, placements])

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Reports & analytics</h1>
        <p className="mt-1 text-base-content/70">Placement outcomes and event participation.</p>
      </div>

      {error && (
        <div role="alert" className="alert alert-error">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {[
          ['Total students', stats.students],
          ['Verified', stats.verified],
          ['Pending', stats.unverified],
          ['Placements', placements.length],
          ['Events', events.length],
        ].map(([label, value]) => (
          <div key={label} className="card bg-base-100 p-5 text-center shadow-sm">
            <div className="text-3xl font-extrabold text-primary">{value}</div>
            <div className="mt-1 text-sm text-base-content/70">{label}</div>
          </div>
        ))}
        <div className="card bg-base-100 p-5 text-center shadow-sm lg:col-span-2">
          <div className="text-3xl font-extrabold text-primary">{stats.avgCgpa ? stats.avgCgpa.toFixed(2) : '—'}</div>
          <div className="mt-1 text-sm text-base-content/70">Avg. listed CGPA</div>
        </div>
        <div className="card bg-base-100 p-5 text-center shadow-sm lg:col-span-2">
          <div className="text-3xl font-extrabold text-primary">
            {Number.isFinite(avgSalary) ? `৳${Number(avgSalary).toLocaleString()}` : '—'}
          </div>
          <div className="mt-1 text-sm text-base-content/70">Avg. placement salary</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-base">Placements by department</h2>
            {byDept.length === 0 ? (
              <p className="text-sm text-base-content/60">No data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={byDept.map(([name, value]) => ({ name, value }))}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} width={30} tick={{ fontSize: 12 }} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {byDept.map((_, i) => (
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
            <h2 className="card-title text-base">Placement rate by department (%)</h2>
            {placementRateByDept.length === 0 ? (
              <p className="text-sm text-base-content/60">No data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={placementRateByDept} layout="vertical">
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`${v}%`, 'Placement rate']} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} fill="#0891b2" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-base">Placements by year</h2>
            {byYear.length === 0 ? (
              <p className="text-sm text-base-content/60">No data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={[...byYear].reverse().map(([name, value]) => ({ name, value }))}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} width={30} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-base">Shares by department</h2>
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

        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-base">Event participation</h2>
            {participation.length === 0 ? (
              <p className="text-sm text-base-content/60">No data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart layout="vertical" data={participation.map(([name, value]) => ({ name, value }))}>
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0891b2" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <MiniTable title="Top hiring companies" rows={byCompany} />
      </div>

      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <h2 className="card-title text-base">Recent placements</h2>
          {placements.length === 0 ? (
            <p className="text-sm text-base-content/60">No placements recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Job / Company</th>
                    <th>Offer date</th>
                    <th className="text-right">Salary</th>
                  </tr>
                </thead>
                <tbody>
                  {placements.slice(0, 30).map((pl) => (
                    <tr key={pl.id}>
                      <td>
                        <div className="font-medium">{pl.students?.users?.name ?? 'Student'}</div>
                        <div className="text-xs text-base-content/60">{pl.students?.department ?? ''}</div>
                      </td>
                      <td className="text-sm">
                        {pl.jobs?.title ?? '—'}
                        <div className="text-xs text-base-content/60">{pl.companies?.name ?? ''}</div>
                      </td>
                      <td className="text-sm">{pl.offer_date ? formatDate(pl.offer_date) : '—'}</td>
                      <td className="text-right text-sm">{pl.salary != null ? `৳${Number(pl.salary).toLocaleString()}` : '—'}</td>
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