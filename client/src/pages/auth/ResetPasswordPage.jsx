import { useEffect, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../hooks/useAuth'
import { AuthLayout } from '../../components/auth/AuthLayout'

export default function ResetPasswordPage() {
  const { session, updatePassword } = useAuth()
  const [searchParams] = useSearchParams()
  const [formError, setFormError] = useState(null)
  const [done, setDone] = useState(false)
  const [linkValid, setLinkValid] = useState(false)
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm()

  useEffect(() => {
    const type = searchParams.get('type')
    const hasAccessToken = searchParams.get('access_token') !== null
    if (type === 'recovery' || hasAccessToken || session) {
      setLinkValid(true)
    }
  }, [searchParams, session])

  if (done) {
    return <Navigate to="/login?reset=success" replace />
  }

  async function onSubmit({ password }) {
    setFormError(null)
    const { error } = await updatePassword(password)
    if (error) {
      if (error.message.includes('session') || error.message.includes('expired') || error.message.includes('invalid')) {
        setFormError('This reset link has expired or is invalid. Please request a new one.')
        setLinkValid(false)
        return
      }
      setFormError(error.message)
      return
    }
    setDone(true)
  }

  return (
    <AuthLayout title="Choose a new password" subtitle="Set a new password for your account.">
      {!linkValid && (
        <div role="alert" className="alert alert-warning text-sm">
          This password reset link is invalid or has expired.
          <br />
          <Link to="/forgot-password" className="link link-primary mt-2 inline-block">
            Request a new reset link
          </Link>
        </div>
      )}

      {formError && (
        <div role="alert" className="alert alert-error text-sm">
          {formError}
        </div>
      )}

      {linkValid && (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">New password</span>
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
              <span className="label-text">Confirm new password</span>
            </div>
            <input
              type="password"
              className="input input-bordered w-full"
              placeholder="Repeat your new password"
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

          <button type="submit" className="btn btn-primary btn-block" disabled={!linkValid || isSubmitting}>
            {isSubmitting ? <span className="loading loading-spinner loading-xs" /> : 'Update password'}
          </button>
        </form>
      )}

      <div className="mt-4 text-center text-sm">
        <Link to="/login" className="link link-primary">
          Back to sign in
        </Link>
      </div>
    </AuthLayout>
  )
}