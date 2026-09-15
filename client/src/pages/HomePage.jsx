import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { roleHome } from '../utils/roles'
import { LoadingScreen } from '../components/ui/LoadingScreen'

export default function HomePage() {
  const { session, role, loading } = useAuth()

  if (loading || (session && !role)) {
    return <LoadingScreen />
  }
  if (session) {
    return <Navigate to={roleHome(role)} replace />
  }

  return (
    <main className="min-h-svh bg-gradient-to-b from-base-200 to-base-100">
      <div className="mx-auto flex min-h-svh max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="text-5xl font-extrabold text-primary">NITER Job Portal</h1>
        <p className="mt-4 max-w-xl text-lg text-base-content/70">
          University Career &amp; Recruitment Management System — connect NITER students, alumni,
          recruiters, and faculty.
        </p>

        <div className="mt-10 flex gap-4">
          <Link to="/register" className="btn btn-primary btn-lg">
            Get started
          </Link>
          <Link to="/login" className="btn btn-outline btn-lg">
            Sign in
          </Link>
        </div>

        <div className="mt-16 grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { title: 'Job Listings', body: 'Browse opportunities posted by verified companies.' },
            { title: 'Alumni Network', body: 'Stay connected and find mentors in your field.' },
            { title: 'Career Events', body: 'Workshops, webinars, and campus recruitment drives.' },
          ].map((item) => (
            <div key={item.title} className="card bg-base-100 shadow-sm">
              <div className="card-body">
                <h2 className="card-title text-primary">{item.title}</h2>
                <p className="text-sm text-base-content/70">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}