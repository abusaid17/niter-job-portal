import { Link } from 'react-router-dom'
import { AuthLayout } from '../../components/auth/AuthLayout'

export default function VerifyEmailPage() {
  return (
    <AuthLayout title="Check your email" subtitle="Confirm your email address to activate your account.">
      <div role="status" className="alert alert-success text-sm">
        We sent a confirmation link to your email. Click it to verify your address, then sign in.
      </div>
      <div className="mt-4 text-center text-sm">
        <Link to="/login" className="link link-primary">
          Go to sign in
        </Link>
      </div>
    </AuthLayout>
  )
}