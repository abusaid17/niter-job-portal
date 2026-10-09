import { useEffect, useRef, useState, useCallback } from 'react'
import { Link, NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  CalendarClock,
  CalendarDays,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  PieChart,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useNotifications } from '../../hooks/useProfiles'
import { useConversations } from '../../hooks/useMessages'
import { ROLE_LABELS } from '../../utils/roles'
import { formatDateTime } from '../../utils/format'
import { LoadingScreen } from '../ui/LoadingScreen'

const NAV = {
  STUDENT: [
    { to: '/student/dashboard', label: 'Dashboard', end: true },
    { to: '/jobs', label: 'Jobs' },
    { to: '/student/applications', label: 'Applications' },
    { to: '/student/events', label: 'Events' },
    { to: '/student/profile', label: 'My Profile' },
  ],
  ALUMNI: [
    { to: '/alumni/dashboard', label: 'Dashboard', end: true },
    { to: '/jobs', label: 'Jobs' },
    { to: '/alumni/applications', label: 'Applications' },
    { to: '/alumni/jobs/new', label: 'Post a Job' },
    { to: '/alumni/referrals', label: 'Referrals' },
    { to: '/alumni/profile', label: 'My Profile' },
  ],
  RECRUITER: [
    { to: '/recruiter/dashboard', label: 'Dashboard', end: true },
    { to: '/recruiter/jobs', label: 'My Jobs' },
    { to: '/recruiter/campus', label: 'Campus Recruitment' },
    { to: '/recruiter/company', label: 'Company' },
  ],
  FACULTY: [
    { to: '/faculty/dashboard', label: 'Dashboard', end: true },
    { to: '/faculty/students', label: 'Students' },
    { to: '/faculty/events', label: 'Career Events' },
    { to: '/faculty/reports', label: 'Reports' },
  ],
}

const ADMIN_NAV = [
  { to: '/admin/dashboard', label: 'Dashboard', end: true, icon: LayoutDashboard },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/jobs', label: 'Jobs', icon: Briefcase },
  { to: '/admin/companies', label: 'Companies', icon: Building2 },
  { to: '/admin/applications', label: 'Applications', icon: FileText },
  { to: '/admin/interviews', label: 'Interviews', icon: CalendarClock },
  { to: '/admin/events', label: 'Events', icon: CalendarDays },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { to: '/admin/analytics', label: 'Analytics', icon: PieChart },
  { to: '/admin/campus', label: 'Campus Recruitment', icon: GraduationCap },
  { to: '/notifications', label: 'Notifications', icon: Bell },
]

function MessagesBell({ unread }) {
  const displayCount = unread > 99 ? '99+' : unread

  return (
    <Link
      to="/messages"
      className="btn btn-ghost btn-sm relative"
      aria-label={`Messages${unread > 0 ? `, ${displayCount} unread` : ''}`}
    >
      <MessageSquare className="h-5 w-5" />
      {unread > 0 && (
        <span className="badge badge-primary badge-sm absolute -right-1 -top-1">{displayCount}</span>
      )}
    </Link>
  )
}

const LATEST_COUNT = 7

function timeAgo(value) {
  if (!value) return ''
  const t = new Date(value).getTime()
  if (Number.isNaN(t)) return ''
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000))
  if (s < 60) return 'Just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d === 1) return 'Yesterday'
  if (d < 7) return `${d}d ago`
  return formatDateTime(value)
}

/** Related page for a notification, or null when there is no confident mapping. */
function targetFor(n, role) {
  const hay = `${n?.type ?? ''} ${n?.title ?? ''} ${n?.message ?? ''}`.toLowerCase()
  if (/(message|chat|conversation)/.test(hay)) return '/messages'
  if (/(event|workshop|seminar|fair)/.test(hay)) {
    if (role === 'STUDENT') return '/student/events'
    if (role === 'FACULTY') return '/faculty/events'
    return null
  }
  if (/(interview)/.test(hay)) {
    if (role === 'STUDENT') return '/student/interviews'
    return null
  }
  if (/(application|applied|applicant|shortlist|select)/.test(hay)) {
    if (role === 'STUDENT') return '/student/applications'
    if (role === 'ALUMNI') return '/alumni/applications'
    if (role === 'RECRUITER') return '/recruiter/jobs'
    return null
  }
  if (/(job|vacancy|recruit|hire)/.test(hay)) {
    if (role === 'RECRUITER') return '/recruiter/jobs'
    if (role === 'STUDENT' || role === 'ALUMNI') return '/jobs'
    return null
  }
  return null
}

function NotificationsBell({ unread, items, markRead, markAllRead, deleteNotification, clearAll, role }) {
  const navigate = useNavigate()

  async function onDelete(id, e) {
    e.stopPropagation()
    e.preventDefault()
    await deleteNotification(id)
  }

  async function onClearAll(e) {
    e.stopPropagation()
    e.preventDefault()
    if (window.confirm("Delete all notifications? This can't be undone.")) {
      await clearAll()
    }
  }

  const detailsRef = useRef(null)
  const wrapRef = useRef(null)

  const close = useCallback(() => {
    const details = detailsRef.current
    if (details) details.open = false
  }, [])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') close()
  }, [close])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    function onPointerDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) close()
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [close])

  return (
    <div ref={wrapRef} className="dropdown dropdown-end">
      <details ref={detailsRef} className="dropdown-trigger">
        <summary className="btn btn-ghost btn-sm relative" aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {unread > 0 && (
            <span className="badge badge-error badge-sm absolute -right-1 -top-1">{unread}</span>
          )}
        </summary>
        <div className="dropdown-content z-40 w-[22rem] max-w-[calc(100vw-1rem)] overflow-hidden rounded-box border border-base-200 bg-base-100 shadow-lg">
          <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
            <span className="text-sm font-bold">Notifications</span>
            {unread > 0 && (
              <span className="badge badge-primary badge-sm">{unread} unread</span>
            )}
          </div>
          <div className="mx-3 pb-1.5 border-b border-base-200 flex items-center justify-between min-h-8">
            {unread > 0 ? (
              <button
                className="btn btn-xs btn-ghost btn-primary"
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  markAllRead()
                }}
              >
                Mark all as read
              </button>
            ) : <span />}
            {items.length > 0 && (
              <button
                className="btn btn-xs btn-ghost text-error"
                onClick={onClearAll}
                aria-label="Delete all notifications"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="max-h-[60vh] overflow-y-auto overflow-x-hidden px-2 py-1.5">
          {items.length === 0 ? (
            <p className="p-4 text-center text-sm text-base-content/60">You&apos;re all caught up</p>
          ) : (
            <>
              {items.length > LATEST_COUNT && (
                <p className="px-2 pb-1 text-xs text-base-content/50">
                  Showing latest {LATEST_COUNT} of {items.length}
                </p>
              )}
              {items.slice(0, LATEST_COUNT).map((n) => (
                <div key={n.id} className="py-1">
                  <button
                    className={`group w-full text-left flex items-start gap-2.5 p-2 rounded-lg transition ${!n.is_read ? 'bg-base-200' : 'hover:bg-base-200'}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!n.is_read) markRead(n.id)
                      close()
                      const target = targetFor(n, role)
                      if (target) navigate(target)
                    }}
                  >
                    {!n.is_read && (
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-primary flex-shrink-0" aria-hidden="true" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className={`text-sm break-words ${!n.is_read ? 'font-bold' : 'font-medium'}`}>
                          {n.title}
                        </span>
                        <span className="text-xs text-base-content/40 whitespace-nowrap shrink-0" title={formatDateTime(n.created_at)}>
                          {timeAgo(n.created_at)}
                        </span>
                      </span>
                      {n.message && (
                        <span className="text-xs text-base-content/70 line-clamp-2 break-words block mt-0.5">
                          {n.message}
                        </span>
                      )}
                    </span>
                    <span className="flex shrink-0 flex-col items-center">
                      {!n.is_read && (
                        <button
                          className="btn btn-xs btn-ghost btn-primary mt-0.5"
                          onClick={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            markRead(n.id)
                          }}
                          aria-label={`Mark notification "${n.title}" as read`}
                        >
                          Mark read
                        </button>
                      )}
                      <button
                        className="btn btn-xs btn-ghost btn-circle text-error mt-0.5 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                        onClick={(e) => onDelete(n.id, e)}
                        aria-label={`Delete notification: ${n.title}`}
                        title="Delete notification"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </button>
                </div>
              ))}
            </>
          )}
          </div>
          <div className="border-t border-base-200 p-2">
            <Link
              to="/notifications"
              className="btn btn-sm btn-block btn-ghost"
              onClick={(e) => {
                e.stopPropagation()
                close()
              }}
            >
              View all notifications
            </Link>
          </div>
        </div>
      </details>
    </div>
  )
}

export function DashboardLayout() {
  const { session, profile, role, signOut } = useAuth()
  const { items, unread, markAllRead, markRead, deleteNotification, clearAll } = useNotifications()
  const { unread: unreadMessages } = useConversations()
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const drawerToggleRef = useRef(null)

  if (!session) {
    return <Navigate to="/login" replace />
  }
  if (!role) {
    return <LoadingScreen />
  }

  async function onLogout() {
    setLoggingOut(true)
    await signOut()
    navigate('/login', { replace: true })
  }

  const nav = NAV[role] ?? []
  const navLinks = [...nav]

  if (role === 'ADMIN') {
    return (
      <div className="drawer min-h-svh lg:drawer-open">
        <input
          ref={drawerToggleRef}
          id="admin-nav"
          type="checkbox"
          className="drawer-toggle"
          aria-label="Toggle navigation"
        />

        <div className="drawer-content flex min-h-svh flex-col bg-base-200">
          <header className="navbar sticky top-0 z-20 bg-base-100 shadow-sm lg:hidden">
            <label htmlFor="admin-nav" aria-label="Open navigation" className="btn btn-ghost btn-sm">
              <Menu className="h-5 w-5" />
            </label>
            <div className="flex-1 px-1">
              <Link to="/" className="text-xl font-bold text-primary">
                NITER Job Portal
              </Link>
            </div>
            <div className="flex items-center gap-2 px-1">
              <MessagesBell unread={unreadMessages} />
              <NotificationsBell unread={unread} items={items} markRead={markRead} markAllRead={markAllRead} deleteNotification={deleteNotification} clearAll={clearAll} role={role} />
            </div>
          </header>

          <header className="navbar sticky top-0 z-20 hidden bg-base-100 shadow-sm lg:flex">
            <div className="flex-1 px-4 text-sm text-base-content/60">
              {ROLE_LABELS[role]} panel
            </div>
            <div className="flex items-center gap-2 px-2">
              <MessagesBell unread={unreadMessages} />
              <NotificationsBell unread={unread} items={items} markRead={markRead} markAllRead={markAllRead} deleteNotification={deleteNotification} clearAll={clearAll} role={role} />
            </div>
          </header>

          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
            <Outlet />
          </main>
        </div>

        <div className="drawer-side z-40">
          <label htmlFor="admin-nav" aria-label="Close navigation" className="drawer-overlay" />
          <aside className="flex h-full w-64 flex-col border-r border-base-200 bg-base-100">
            <div className="flex items-center gap-3 px-6 py-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-box bg-primary text-lg font-extrabold text-primary-content">
                N
              </div>
              <div className="leading-tight">
                <div className="text-base font-bold text-primary">NITER Job Portal</div>
                <span className="badge badge-neutral badge-outline mt-0.5 badge-sm">
                  {ROLE_LABELS[role]}
                </span>
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 pb-4">
              <ul className="flex flex-col gap-1">
                {ADMIN_NAV.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={() => {
                        if (drawerToggleRef.current) drawerToggleRef.current.checked = false
                      }}
                      className={({ isActive }) =>
                        `relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-base-content/70 hover:bg-base-200 hover:text-base-content'
                        }`
                      }
                    >
                      {item.icon && <item.icon className="h-5 w-5 shrink-0" />}
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  </li>
                ))}
                <li>
                  <NavLink
                    to="/messages"
                    end
                    onClick={() => {
                      if (drawerToggleRef.current) drawerToggleRef.current.checked = false
                    }}
                    className={({ isActive }) =>
                      `relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-base-content/70 hover:bg-base-200 hover:text-base-content'
                      }`
                    }
                  >
                    <MessageSquare className="h-5 w-5 shrink-0" />
                    <span className="truncate">Messages</span>
                    {unreadMessages > 0 && (
                      <span className="badge badge-primary badge-sm ml-auto">{unreadMessages > 99 ? '99+' : unreadMessages}</span>
                    )}
                  </NavLink>
                </li>
              </ul>
            </nav>

            <div className="border-t border-base-200 p-4">
              <div className="truncate text-sm font-semibold text-base-content">{profile?.name || session.user.email}</div>
              {profile?.name && (
                <div className="truncate text-xs text-base-content/60">{session.user.email}</div>
              )}
              <button type="button" className="btn btn-outline btn-sm mt-3 w-full" onClick={onLogout} disabled={loggingOut}>
                {loggingOut ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  <>
                    <LogOut className="h-4 w-4" />
                    Logout
                  </>
                )}
              </button>
            </div>
          </aside>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-base-200">
      <header className="navbar sticky top-0 z-20 bg-base-100 shadow-sm">
        <div className="flex-1 px-2">
          <Link to="/" className="text-xl font-bold text-primary">
            NITER Job Portal
          </Link>
          <span className="badge badge-neutral badge-outline ml-3">{ROLE_LABELS[role]}</span>
        </div>

        <nav className="hidden gap-1 px-2 md:flex">
          {navLinks.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `btn btn-sm btn-ghost${isActive ? ' btn-active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2 px-2">
          <details
            className="dropdown dropdown-end md:hidden"
            open={menuOpen}
            onToggle={(e) => setMenuOpen(e.currentTarget.open)}
          >
            <summary className="btn btn-ghost btn-sm" aria-label="Open navigation menu">
              <Menu className="h-5 w-5" />
            </summary>
            <ul className="dropdown-content menu z-30 w-72 max-h-[70vh] overflow-y-auto rounded-box bg-base-100 p-2 shadow-lg">
              {navLinks.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) => (isActive ? 'bg-primary text-primary-content' : '')}
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </details>
          <MessagesBell unread={unreadMessages} />
          <NotificationsBell unread={unread} items={items} markRead={markRead} markAllRead={markAllRead} deleteNotification={deleteNotification} clearAll={clearAll} role={role} />

          <span className="hidden text-sm font-medium md:block">{profile?.name || session.user.email}</span>
          <button type="button" className="btn btn-sm btn-outline" onClick={onLogout} disabled={loggingOut}>
            {loggingOut ? <span className="loading loading-spinner loading-xs" /> : 'Logout'}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}