import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ROLE_LABELS } from '../utils/roles'
import { LoadingScreen } from '../components/ui/LoadingScreen'

export default function DashboardPlaceholder({ role }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)

  if (!profile) {
    return <LoadingScreen />
  }

  async function onLogout() {
    setLoggingOut(true)
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-svh bg-base-200">
      <header className="navbar bg-base-100 shadow-sm">
        <div className="flex-1">
          <span className="px-4 text-xl font-bold text-primary">NITER Job Portal</span>
          <span className="badge badge-neutral badge-outline">{ROLE_LABELS[role]}</span>
        </div>
        <div className="flex-none pr-4">
          <button type="button" className="btn btn-sm btn-outline" onClick={onLogout} disabled={loggingOut}>
            {loggingOut ? <span className="loading loading-spinner loading-xs" /> : 'Logout'}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="hero rounded-box bg-base-100 p-8 shadow-sm">
          <div className="hero-content flex-col items-start text-left">
            <h1 className="text-3xl font-bold">
              Welcome{profile.name ? `, ${profile.name.split(' ')[0]}` : ''}
            </h1>
            <p className="text-base-content/70">
              Your {ROLE_LABELS[role].toLowerCase()} dashboard is being built. This area will host your
              personalized job portal experience.
            </p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[{ label: 'Messages', value: '—' }, { label: 'Applications', value: '—' }, { label: 'Events', value: '—' }].map(
            (stat) => (
              <div key={stat.label} className="card bg-base-100 shadow-sm">
                <div className="card-body items-center text-center">
                  <div className="stat-value text-4xl text-primary">{stat.value}</div>
                  <div className="text-sm text-base-content/70">{stat.label}</div>
                </div>
              </div>
            ),
          )}
        </div>
      </main>
    </div>
  )
}