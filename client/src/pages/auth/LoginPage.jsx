import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../hooks/useAuth'
import { roleHome } from '../../utils/roles'
import { AuthLayout } from '../../components/auth/AuthLayout'
import { LoadingScreen } from '../../components/ui/LoadingScreen'

export default function LoginPage() {
  const { session, role, loading, signIn } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [formError, setFormError] = useState(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm()

  if (loading || (session && !role)) {
    return <LoadingScreen />
  }
  if (session) {
    return <Navigate to={roleHome(role)} replace />
  }

  async function onSubmit({ email, password }) {
    setFormError(null)
    const { error } = await signIn({ email, password })
    if (error) {
      setFormError(error.message)
      return
    }
    navigate('/', { replace: true })
  }

  return (
    <AuthLayout title="Sign in" subtitle="Welcome back. Sign in to continue.">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        {searchParams.get('verified') === 'true' && (
          <div role="status" className="alert alert-success text-sm">
            Email verified! You can now sign in.
          </div>
        )}
        {formError && (
          <div role="alert" className="alert alert-error text-sm">
            {formError}
          </div>
        )}

        <label className="form-control w-full">
          <div className="label">
            <span className="label-text">Email</span>
          </div>
          <input
            type="email"
            className="input input-bordered w-full"
            placeholder="you@niter.edu.bd"
            {...register('email', { required: 'Email is required' })}
          />
          {errors.email && (
            <div className="label">
              <span className="label-text-alt text-error">{errors.email.message}</span>
            </div>
          )}
        </label>

        <label className="form-control w-full">
          <div className="label">
            <span className="label-text">Password</span>
          </div>
          <input
            type="password"
            className="input input-bordered w-full"
            placeholder="Your password"
            {...register('password', { required: 'Password is required' })}
          />
          {errors.password && (
            <div className="label">
              <span className="label-text-alt text-error">{errors.password.message}</span>
            </div>
          )}
        </label>

        <button type="submit" className="btn btn-primary btn-block" disabled={isSubmitting}>
          {isSubmitting ? <span className="loading loading-spinner loading-xs" /> : 'Sign in'}
        </button>
      </form>

      <div className="mt-4 flex items-center justify-between text-sm">
        <Link to="/forgot-password" className="link link-primary">
          Forgot password?
        </Link>
        <Link to="/register" className="link link-primary">
          Create account
        </Link>
      </div>
    </AuthLayout>
  )
}