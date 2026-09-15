export function AuthLayout({ title, subtitle, children }) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-base-200 px-4 py-10">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="mb-4 text-center">
            <h1 className="text-2xl font-bold text-primary">NITER Job Portal</h1>
            <p className="mt-1 text-base-content/70">{subtitle ?? title}</p>
          </div>
          {children}
        </div>
      </div>
    </main>
  )
}