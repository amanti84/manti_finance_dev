import type { FC } from 'react'
import { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Bell,
  Inbox,
  Banknote,
  TrendingUp,
  PieChart,
  Wallet,
  Home,
  Baby,
  Umbrella,
  Target,
  Zap,
  FileText,
  Archive,
  ShieldCheck,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  LogOut,
  User as UserIcon
} from 'lucide-react'
import { auth } from '../firebase'
import { signOut } from 'firebase/auth'
import { useAuth } from '../hooks/useAuth'
import { getActiveAlerts } from '../services/alert'
import { listInboxItems, calculateBadgeCount } from '../services/inbox'
import { InboxBadge } from '../modules/inbox'
import type { InboxBadgeCount } from '../types'

interface NavItem {
  label: string
  to: string
  icon: typeof LayoutDashboard
  adminOnly?: boolean
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', to: '/', icon: LayoutDashboard },
      { label: 'Alert', to: '/alerts', icon: Bell },
      { label: 'Inbox', to: '/inbox', icon: Inbox },
    ],
  },
  {
    title: 'Entrate',
    items: [
      { label: 'Cedolini', to: '/payroll', icon: Banknote },
    ],
  },
  {
    title: 'Investimenti',
    items: [
      { label: 'Investimenti', to: '/investimenti', icon: TrendingUp },
      { label: 'PAC', to: '/investimenti/pac', icon: PieChart },
    ],
  },
  {
    title: 'Uscite & Debiti',
    items: [
      { label: 'Cash Flow', to: '/cashflow', icon: Wallet },
      { label: 'Mutuo', to: '/mutuo', icon: Home },
      { label: 'Kindergarten', to: '/kindergarten', icon: Baby },
    ],
  },
  {
    title: 'Pianificazione',
    items: [
      { label: 'Previdenza', to: '/previdenza', icon: Umbrella },
      { label: 'Obiettivi', to: '/goals', icon: Target },
      { label: 'What If', to: '/what-if', icon: Zap },
    ],
  },
  {
    title: 'Archivio',
    items: [
      { label: 'Documenti', to: '/documenti', icon: FileText },
      { label: 'Chiusura Mensile', to: '/monthly-close', icon: Archive },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { label: 'Admin', to: '/admin', icon: ShieldCheck, adminOnly: true },
    ],
  },
]

const Logo: FC<{ collapsed?: boolean }> = ({ collapsed }) => (
  <div className="flex items-center gap-2 px-2 py-1">
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-primary"
    >
      <rect width="32" height="32" rx="6" fill="currentColor" fillOpacity="0.1" />
      <path
        d="M8 24V8H12L16 14L20 8H24V24H20V14L16 20L12 14V24H8Z"
        fill="currentColor"
      />
      <path
        d="M14 24H18M14 20H22"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="hidden"
      />
    </svg>
    {!collapsed && (
      <span className="text-xl font-bold tracking-tight text-text whitespace-nowrap">
        Manti<span className="text-primary">Finance</span>
      </span>
    )}
  </div>
)

interface NavContentProps {
  isSidebarCollapsed: boolean
  isAdmin: boolean
  setIsMobileMenuOpen: (open: boolean) => void
  alertCount: number
  inboxCount: InboxBadgeCount
}

const NavContent: FC<NavContentProps> = ({
  isSidebarCollapsed,
  isAdmin,
  setIsMobileMenuOpen,
  alertCount,
  inboxCount
}) => (
  <div className="flex flex-col h-full py-4 overflow-y-auto custom-scrollbar">
    {NAV_GROUPS.map((group) => {
      const visibleItems = group.items.filter(item => !item.adminOnly || isAdmin)
      if (visibleItems.length === 0) return null

      return (
        <div key={group.title} className="mb-6 last:mb-0">
          {!isSidebarCollapsed && (
            <h3 className="px-6 mb-2 text-xs font-semibold tracking-wider uppercase text-text-muted">
              {group.title}
            </h3>
          )}
          <div className="space-y-1">
            {visibleItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => `
                  flex items-center px-4 py-2 mx-2 rounded-md transition-colors
                  ${isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-text-muted hover:bg-surface hover:text-text'}
                  ${isSidebarCollapsed ? 'justify-center px-2' : 'gap-3'}
                `}
                title={isSidebarCollapsed ? item.label : undefined}
              >
                <item.icon size={20} className="shrink-0" />
                {!isSidebarCollapsed && (
                  <span className="truncate">{item.label}</span>
                )}
                {!isSidebarCollapsed && item.to === '/alerts' && alertCount > 0 && (
                  <span className="ml-auto bg-error text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {alertCount}
                  </span>
                )}
                {!isSidebarCollapsed && item.to === '/inbox' && (inboxCount.total > 0) && (
                  <div className="ml-auto">
                    <InboxBadge count={inboxCount} />
                  </div>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      )
    })}
  </div>
)

export const Layout: FC = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [alertCount, setAlertCount] = useState(0)
  const [inboxCount, setInboxCount] = useState<InboxBadgeCount>({ total: 0, requiresReview: 0, pending: 0 })

  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (user) {
      const fetchData = async () => {
        const [alertsResult, inboxResult] = await Promise.all([
          getActiveAlerts(user.uid),
          listInboxItems(user.uid)
        ])

        if (alertsResult.success && alertsResult.data) {
          setAlertCount(alertsResult.data.length)
        }
        if (inboxResult.success && inboxResult.data) {
          setInboxCount(calculateBadgeCount(inboxResult.data))
        }
      }
      void fetchData()
    }
  }, [user, location.pathname])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleDarkMode = () => {
    const newMode = !isDarkMode
    setIsDarkMode(newMode)
    document.documentElement.setAttribute('data-theme', newMode ? 'dark' : 'light')
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      navigate('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const isAdmin = user?.email === 'ant.manti@gmail.com'

  return (
    <div className="flex h-screen bg-bg text-text">
      {/* Sidebar - Desktop */}
      <aside
        className={`
          hidden md:flex flex-col border-r border-border bg-surface transition-all duration-300 ease-in-out
          ${isSidebarCollapsed ? 'w-[56px]' : 'w-[240px]'}
        `}
      >
        <div className="flex items-center h-16 px-3 border-bottom border-border">
          <Logo collapsed={isSidebarCollapsed} />
        </div>

        <NavContent
          isSidebarCollapsed={isSidebarCollapsed}
          isAdmin={isAdmin}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          alertCount={alertCount}
          inboxCount={inboxCount}
        />

        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="flex items-center justify-center h-12 border-t border-border text-text-muted hover:text-text hover:bg-bg transition-colors"
        >
          {isSidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between h-16 px-4 md:px-8 border-b border-border bg-surface sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button
              className="md:hidden p-2 -ml-2 text-text-muted hover:text-text"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
            <div className="md:hidden">
              <Logo collapsed />
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-full text-text-muted hover:bg-bg hover:text-text transition-colors"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* Inbox & Alert shortcuts for mobile or quick access */}
            <div className="flex items-center gap-1 md:hidden">
              <NavLink to="/alerts" className="p-2 text-text-muted relative">
                <Bell size={20} />
                {alertCount > 0 && (
                  <span className="absolute top-1 right-1 bg-error text-white text-[10px] font-bold px-1 rounded-full min-w-[16px] text-center">
                    {alertCount}
                  </span>
                )}
              </NavLink>
              <NavLink to="/inbox" className="p-1">
                <InboxBadge count={inboxCount} />
              </NavLink>
            </div>

            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1 rounded-full hover:bg-bg transition-colors"
              >
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName ?? 'User'}
                    className="w-8 h-8 rounded-full border border-border"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm border border-primary/20">
                    {user?.email?.[0].toUpperCase() ?? <UserIcon size={18} />}
                  </div>
                )}
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-surface border border-border rounded-lg shadow-md py-1 z-20">
                  <div className="px-4 py-2 border-b border-border">
                    <p className="text-sm font-medium text-text truncate">{user?.displayName ?? 'Utente'}</p>
                    <p className="text-xs text-text-muted truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={() => void handleLogout()}
                    className="flex items-center w-full px-4 py-2 text-sm text-error hover:bg-bg transition-colors"
                  >
                    <LogOut size={16} className="mr-2" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-bg p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="relative flex flex-col w-[280px] h-full bg-surface border-r border-border shadow-xl animate-in slide-in-from-left duration-300">
            <div className="flex items-center justify-between h-16 px-4 border-b border-border">
              <Logo />
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 text-text-muted hover:text-text"
              >
                <X size={24} />
              </button>
            </div>
            <NavContent
              isSidebarCollapsed={false}
              isAdmin={isAdmin}
              setIsMobileMenuOpen={setIsMobileMenuOpen}
              alertCount={alertCount}
              inboxCount={inboxCount}
            />
          </aside>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--color-border);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--color-text-muted);
        }
      `}</style>
    </div>
  )
}
