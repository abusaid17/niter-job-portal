import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../hooks/useAuth'
import { AuthLayout } from '../../components/auth/AuthLayout'

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const [formError, setFormError] = useState(null)
  const [sent, setSent] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm()

  async function onSubmit({ email }) {
    setFormError(null)
    const { error } = await resetPassword(email)
    if (error) {
      setFormError(error.message)
      return
    }
    setSent(true)
  }

  return (
    <AuthLayout title="Reset password" subtitle="We'll email you a link to set a new password.">
      {formError && (
        <div role="alert" className="alert alert-error text-sm">
          {formError}
        </div>
      )}

      {sent ? (
        <div role="status" className="alert alert-success text-sm">
          If an account exists for that email, a password reset link has been sent.
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
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
                pattern: { value: /\S+@\S+\.\S+/, message: 'Enter a valid email address' },
              })}
            />
            {errors.email && (
              <div className="label">
                <span className="label-text-alt text-error">{errors.email.message}</span>
              </div>
            )}
          </label>

          <button type="submit" className="btn btn-primary btn-block" disabled={isSubmitting}>
            {isSubmitting ? <span className="loading loading-spinner loading-xs" /> : 'Send reset link'}
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