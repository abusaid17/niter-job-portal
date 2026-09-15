import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { LoadingScreen } from '../ui/LoadingScreen'

export function ProtectedRoute({ allowedRoles, children }) {
  const { session, role, loading } = useAuth()
  const location = useLocation()

  if (loading || (session && !role)) {
    return <LoadingScreen />
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />
  }

  return children
}