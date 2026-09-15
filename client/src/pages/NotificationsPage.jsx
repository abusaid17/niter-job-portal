import { useNotifications } from '../hooks/useProfiles'
import { formatDateTime } from '../utils/format'
import { LoadingScreen } from '../components/ui/LoadingScreen'
export default function NotificationsPage() {
  const { items, loading, markAllRead, markRead, remove } = useNotifications({ limit: 100 })

  if (loading) return <LoadingScreen />

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-base-content/60">Updates on your applications, interviews and account.</p>
        </div>
        {items.some((n) => !n.is_read) && (
          <button className="btn btn-sm btn-outline" onClick={markAllRead}>
            Mark all read
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body text-center text-base-content/70">You have no notifications.</div>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((n) => (
            <li key={n.id} className={`card bg-base-100 shadow-sm ${n.is_read ? '' : 'ring-1 ring-primary/30'}`}>
              <div className="card-body flex-row items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{n.title}</span>
                    {!n.is_read && <span className="badge badge-primary badge-sm">New</span>}
                  </div>
                  {n.message && <p className="mt-0.5 text-sm text-base-content/70">{n.message}</p>}
                  <span className="mt-1 block text-xs text-base-content/40">{formatDateTime(n.created_at)}</span>
                </div>
                <div className="flex shrink-0 gap-1">
                  {!n.is_read && (
                    <button className="btn btn-sm btn-ghost" onClick={() => markRead(n.id)}>
                      Mark read
                    </button>
                  )}
                  <button
                    className="btn btn-sm btn-ghost btn-error"
                    onClick={() => remove(n.id)}
                    aria-label="Dismiss notification"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
