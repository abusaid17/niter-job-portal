import { useEffect, useRef, useState } from 'react'
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
  { to: '/messages', label: 'Messages', icon: MessageSquare },
  { to: '/notifications', label: 'Notifications', icon: Bell },
]

const MESSAGES_NAV = { to: '/messages', label: 'Messages' }
const NOTIFICATIONS_NAV = { to: '/notifications', label: 'Notifications' }

function NotificationsBell({ unread, items }) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (e.currentTarget !== e.target && !e.currentTarget.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('click', handleOutsideClick)
    return () => document.removeEventListener('click', handleOutsideClick)
  }, [])

  return (
    <div
      className="relative dropdown dropdown-end"
      onClick={(e) => e.stopPropagation()}
    >
      <summary className="btn btn-ghost btn-sm relative">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="badge badge-error badge-sm absolute -right-1 -top-1">{unread}</span>
        )}
      </summary>
      {isOpen && (
        <ul
          className="menu z-40 w-80 max-h-96 overflow-y-auto rounded-box bg-base-100 p-2 shadow-lg absolute top-full left-1/2 transform -translate-x-1/2"
        >
          <li className="menu-title">
            <span>Notifications {unread > 0 && `(${unread} unread)`}</span>
          </li>
          {items.length === 0 && (
            <li className="p-3 text-sm text-base-content/60">No notifications yet.</li>
          )}
          {items.map((n) => (
            <li key={n.id}>
              <div className={`flex flex-col items-start gap-0.5 ${n.is_read ? '' : 'bg-base-200'}`}>
                <span className="text-sm font-medium">{n.title}</span>
                {n.message && <span className="text-xs text-base-content/70">{n.message}</span>}
                <span className="text-xs text-base-content/40">{formatDateTime(n.created_at)}</span>
              </div>
            </li>
          ))}
          <li className="border-t border-base-200">
            <Link to="/notifications" className="text-sm font-medium text-primary">
              View all notifications
            </Link>
          </li>
        </ul>
      )}
    </div>
  )
}

export function DashboardLayout() {
  const { session, profile, role, signOut } = useAuth()
  const { items, unread, markAllRead } = useNotifications()
  const { unread: unreadMessages } = useConversations()
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)
  const [open, setOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const drawerToggleRef = useRef(null)

  useEffect(() => {
    if (open) markAllRead()
  }, [open, markAllRead])

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
  const messagesLabel = unreadMessages > 0 ? `Messages (${unreadMessages})` : 'Messages'
  const navLinks = [
    ...nav,
    { to: MESSAGES_NAV.to, label: messagesLabel },
    { to: NOTIFICATIONS_NAV.to, label: NOTIFICATIONS_NAV.label },
  ]

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
              <NotificationsBell unread={unread} items={items} />
            </div>
          </header>

          <header className="navbar sticky top-0 z-20 hidden bg-base-100 shadow-sm lg:flex">
            <div className="flex-1 px-4 text-sm text-base-content/60">
              {ROLE_LABELS[role]} panel
            </div>
            <div className="flex items-center gap-2 px-2">
              <NotificationsBell unread={unread} items={items} />
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
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span className="truncate">{item.label}</span>
                      {item.to === '/messages' && unreadMessages > 0 && (
                        <span className="badge badge-error badge-sm ml-auto">{unreadMessages}</span>
                      )}
                    </NavLink>
                  </li>
                ))}
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
          <NotificationsBell unread={unread} items={items} />

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