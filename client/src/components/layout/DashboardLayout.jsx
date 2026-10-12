import { useEffect, useRef, useState, useCallback } from 'react'
import { Link, NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  CalendarClock,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  PieChart,
  Plus,
  Share2,
  User,
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
    { to: '/faculty/profile', label: 'My Profile' },
    { to: '/faculty/students', label: 'Students' },
    { to: '/faculty/events', label: 'Career Events' },
    { to: '/faculty/reports', label: 'Reports' },
  ],
}

const NAV_ICONS = {
  Dashboard: LayoutDashboard,
  Jobs: Briefcase,
  Applications: FileText,
  Events: CalendarDays,
  'My Profile': User,
  'Post a Job': Plus,
  Referrals: Share2,
  'My Jobs': Briefcase,
  'Campus Recruitment': GraduationCap,
  Company: Building2,
  Students: Users,
  'Career Events': CalendarDays,
  Reports: BarChart3,
}

function useScrolled(threshold = 8) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])
  return scrolled
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

const PROFILE_HOME = {
  STUDENT: '/student/profile',
  ALUMNI: '/alumni/profile',
  RECRUITER: '/recruiter/company',
  FACULTY: '/faculty/profile',
}

function UserMenu({ name, email, profileTo, onLogout, loggingOut }) {
  const [open, setOpen] = useState(false)
  const initial = ((name || '').trim().charAt(0) || (email || '').trim().charAt(0) || 'U').toUpperCase()
  return (
    <details
      className="dropdown dropdown-end"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary
        className="btn btn-ghost btn-sm flex items-center gap-1 rounded-full py-1 pl-1 pr-2 transition-transform hover:scale-[1.03] active:scale-95"
        aria-label="Account menu"
        aria-expanded={open}
      >
        <span className="avatar placeholder">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-primary-content ring-2 ring-primary/20">
            <span className="text-xs font-bold">{initial}</span>
          </span>
        </span>
        <span className="hidden max-w-28 truncate text-sm font-medium xl:block">{name || email}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-base-content/60 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </summary>
      <ul className="dropdown-content menu z-30 w-60 max-w-[calc(100vw-2rem)] rounded-2xl border border-base-200 bg-base-100 p-2 shadow-xl">
        <li className="menu-title px-2 py-1">
          <span className="flex items-center gap-2.5 rounded-xl bg-base-200/60 px-2.5 py-2 normal-case">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-sm font-bold text-primary-content">
              {initial}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm">{name || 'Account'}</span>
              {name && <span className="block truncate text-[11px] font-normal opacity-60">{email}</span>}
            </span>
          </span>
        </li>
        <li>
          <Link to={profileTo} onClick={() => setOpen(false)} className="rounded-xl font-medium">
            <User className="h-4 w-4 text-primary" /> My Profile
            <ChevronRight className="ml-auto h-4 w-4 opacity-40" />
          </Link>
        </li>
        <li>
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onLogout()
            }}
            disabled={loggingOut}
            className="rounded-xl font-medium text-error"
          >
            {loggingOut ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            Logout
          </button>
        </li>
      </ul>
    </details>
  )
}

function MessagesBell({ unread }) {
  const displayCount = unread > 99 ? '99+' : unread

  return (
    <Link
      to="/messages"
      className="btn btn-ghost btn-sm btn-circle relative transition-transform hover:scale-105 active:scale-95"
      aria-label={`Messages${unread > 0 ? `, ${displayCount} unread` : ''}`}
    >
      <MessageSquare className="h-5 w-5" />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
          <span className="badge badge-primary badge-sm relative">{displayCount}</span>
        </span>
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
        <summary className="btn btn-ghost btn-sm btn-circle relative transition-transform hover:scale-105 active:scale-95" aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-error opacity-60" />
              <span className="badge badge-error badge-sm relative">{unread}</span>
            </span>
          )}
        </summary>
        <div className="dropdown-content z-40 w-[22rem] max-w-[calc(100vw-1rem)] overflow-hidden rounded-box border border-base-200 bg-base-100 shadow-lg max-sm:fixed! max-sm:inset-x-2! max-sm:top-16! max-sm:w-auto! max-sm:max-w-none!">
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
  const scrolled = useScrolled()
  const glass = scrolled
    ? 'bg-base-100/85 shadow-md backdrop-blur-xl supports-[backdrop-filter]:bg-base-100/70'
    : 'bg-base-100 shadow-sm'

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
          <header className={`navbar sticky top-0 z-20 transition-all duration-300 lg:hidden ${glass}`}>
            <label htmlFor="admin-nav" aria-label="Open navigation" className="btn btn-ghost btn-sm">
              <Menu className="h-5 w-5" />
            </label>
            <div className="flex-1 min-w-0 px-1">
              <Link to="/" className="truncate text-lg font-bold text-primary sm:text-xl">
                NITER Job Portal
              </Link>
            </div>
            <div className="flex items-center gap-2 px-1">
              <MessagesBell unread={unreadMessages} />
              <NotificationsBell unread={unread} items={items} markRead={markRead} markAllRead={markAllRead} deleteNotification={deleteNotification} clearAll={clearAll} role={role} />
            </div>
          </header>

          <header className={`navbar sticky top-0 z-20 hidden transition-all duration-300 lg:flex ${glass}`}>
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
              <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-base-content/40">Manage</p>
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
                        `relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all hover:translate-x-0.5 ${
                          isActive
                            ? 'bg-primary text-primary-content shadow-md shadow-primary/25'
                            : 'text-base-content/70 hover:bg-base-200 hover:text-base-content'
                        }`
                      }
                    >
                      {item.icon && <item.icon className="h-5 w-5 shrink-0 opacity-90" />}
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
                      `relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all hover:translate-x-0.5 ${
                        isActive
                          ? 'bg-primary text-primary-content shadow-md shadow-primary/25'
                          : 'text-base-content/70 hover:bg-base-200 hover:text-base-content'
                      }`
                    }
                  >
                    <MessageSquare className="h-5 w-5 shrink-0 opacity-90" />
                    <span className="truncate">Messages</span>
                    {unreadMessages > 0 && (
                      <span className="badge badge-sm ml-auto bg-white/25 text-inherit">{unreadMessages > 99 ? '99+' : unreadMessages}</span>
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
      <header className={`navbar sticky top-0 z-20 gap-1 px-2 transition-all duration-300 sm:px-4 ${glass}`}>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Link to="/" className="truncate text-lg font-bold text-primary sm:text-xl">
            NITER Job Portal
          </Link>
          <span className="badge badge-neutral badge-outline hidden shrink-0 sm:inline-flex">{ROLE_LABELS[role]}</span>
        </div>

        <nav className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto px-2 md:flex" aria-label="Primary">
          {navLinks.map((item) => {
            const Icon = NAV_ICONS[item.label] ?? LayoutDashboard
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `btn btn-sm shrink-0 gap-1.5 whitespace-nowrap rounded-full transition-all hover:scale-[1.02] active:scale-95 ${
                    isActive
                      ? 'btn-primary shadow-md shadow-primary/25'
                      : 'btn-ghost text-base-content/70 hover:text-base-content'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <details
            className="dropdown dropdown-end md:hidden"
            open={menuOpen}
            onToggle={(e) => setMenuOpen(e.currentTarget.open)}
          >
            <summary className="btn btn-ghost btn-sm btn-circle" aria-label="Open navigation menu">
              <span className="relative">
                <Menu className={`h-5 w-5 transition-transform duration-200 ${menuOpen ? 'rotate-90 scale-90' : ''}`} />
                {!menuOpen && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary" aria-hidden="true" />}
              </span>
            </summary>
            <ul className="dropdown-content menu z-30 w-72 max-w-[calc(100vw-2rem)] max-h-[70vh] overflow-y-auto rounded-2xl border border-base-200 bg-base-100 p-2 shadow-xl max-sm:fixed! max-sm:inset-x-2! max-sm:top-16! max-sm:w-auto! max-sm:max-w-none!">
              <li className="menu-title flex items-center justify-between px-3 py-2">
                <span>Menu</span>
                <span className="badge badge-neutral badge-outline badge-sm">{ROLE_LABELS[role]}</span>
              </li>
              {navLinks.map((item) => {
                const Icon = NAV_ICONS[item.label] ?? LayoutDashboard
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={() => setMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex min-h-[44px] items-center gap-3 rounded-xl px-3 font-medium transition-colors ${
                          isActive ? 'bg-primary text-primary-content shadow-md shadow-primary/25' : 'hover:bg-base-200'
                        }`
                      }
                    >
                      <Icon className="h-5 w-5 shrink-0 opacity-80" />
                      {item.label}
                      <ChevronRight className="ml-auto h-4 w-4 opacity-40" />
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </details>
          <MessagesBell unread={unreadMessages} />
          <NotificationsBell unread={unread} items={items} markRead={markRead} markAllRead={markAllRead} deleteNotification={deleteNotification} clearAll={clearAll} role={role} />

          <UserMenu
            name={profile?.name}
            email={session.user.email}
            profileTo={PROFILE_HOME[role] ?? '/'}
            onLogout={onLogout}
            loggingOut={loggingOut}
          />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}