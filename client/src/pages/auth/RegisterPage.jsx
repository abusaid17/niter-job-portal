import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../hooks/useAuth'
import { REGISTERABLE_ROLES, ROLE_LABELS, ROLES, roleHome } from '../../utils/roles'
import { AuthLayout } from '../../components/auth/AuthLayout'
import { LoadingScreen } from '../../components/ui/LoadingScreen'

export default function RegisterPage() {
  const { session, role, loading, signUp } = useAuth()
  const navigate = useNavigate()
  const [formError, setFormError] = useState(null)
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { role: ROLES.STUDENT } })

  if (loading || (session && !role)) {
    return <LoadingScreen />
  }
  if (session) {
    return <Navigate to={roleHome(role)} replace />
  }

  async function onSubmit(values) {
    setFormError(null)
    const { data, error } = await signUp(values)
    if (error) {
      setFormError(error.message)
      return
    }
    if (data.session) {
      navigate('/', { replace: true })
    } else {
      navigate('/verify-email', { replace: true })
    }
  }

  return (
    <AuthLayout title="Create your account" subtitle="Join NITER Job Portal to start connecting.">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        {formError && (
          <div role="alert" className="alert alert-error text-sm">
            {formError}
          </div>
        )}

        <label className="form-control w-full">
          <div className="label">
            <span className="label-text">Full name</span>
          </div>
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder="Your full name"
            {...register('name', { required: 'Name is required' })}
          />
          {errors.name && (
            <div className="label">
              <span className="label-text-alt text-error">{errors.name.message}</span>
            </div>
          )}
        </label>

        <label className="form-control w-full">
          <div className="label">
            <span className="label-text">Role</span>
          </div>
          <select
            className="select select-bordered w-full"
            {...register('role', { required: 'Role is required' })}
          >
            {REGISTERABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          <div className="label">
            <span className="label-text-alt text-base-content/60">
              Select the role that best describes you.
            </span>
          </div>
        </label>

        <label className="form-control w-full">
          <div className="label">
            <span className="label-text">Email</span>
          </div>
          <input
            type="email"
            className="input input-bordered w-full"
            placeholder="you@niter.edu.bd"
            {...register('email', {
              required: 'Email is required',
              pattern: {
                value: /\S+@\S+\.\S+/,
                message: 'Enter a valid email address',
              },
            })}
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
            placeholder="At least 8 characters"
            {...register('password', {
              required: 'Password is required',
              minLength: { value: 8, message: 'Password must be at least 8 characters' },
            })}
          />
          {errors.password && (
            <div className="label">
              <span className="label-text-alt text-error">{errors.password.message}</span>
            </div>
          )}
        </label>

        <label className="form-control w-full">
          <div className="label">
            <span className="label-text">Confirm password</span>
          </div>
          <input
            type="password"
            className="input input-bordered w-full"
            placeholder="Repeat your password"
            {...register('confirmPassword', {
              required: 'Please confirm your password',
              validate: (value) => value === watch('password') || 'Passwords do not match',
            })}
          />
          {errors.confirmPassword && (
            <div className="label">
              <span className="label-text-alt text-error">{errors.confirmPassword.message}</span>
            </div>
          )}
        </label>

        <button type="submit" className="btn btn-primary btn-block" disabled={isSubmitting}>
          {isSubmitting ? <span className="loading loading-spinner loading-xs" /> : 'Create account'}
        </button>
      </form>

      <div className="mt-4 text-center text-sm">
        Already have an account?{' '}
        <Link to="/login" className="link link-primary">
          Sign in
        </Link>
      </div>
    </AuthLayout>
  )
}