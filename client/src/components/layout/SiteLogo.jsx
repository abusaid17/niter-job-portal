import { useState } from 'react'

/**
 * Official NITER logo. Place the supplied logo file at
 * `client/public/niter-logo.png` — it is picked up automatically.
 * Until then (or if it fails to load), falls back to the "N" monogram
 * so the UI never shows a broken image.
 */
export function SiteLogo({ className = 'h-10 w-10' }) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-box bg-primary text-lg font-extrabold text-primary-content ${className}`}
        aria-label="NITER"
      >
        N
      </div>
    )
  }

  return (
    <img
      src="/niter-logo.png"
      alt="NITER logo"
      className={`shrink-0 rounded-box bg-white object-contain p-0.5 ${className}`}
      onError={() => setFailed(true)}
    />
  )
}
