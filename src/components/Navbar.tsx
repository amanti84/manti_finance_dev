import type { FC } from 'react'
import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { auth } from '../firebase'
import { signOut } from 'firebase/auth'
import { getActiveAlerts } from '../services/alert'
import { useAuth } from '../hooks/useAuth'
import { InboxBadge } from '../modules/inbox'
import { listInboxItems, calculateBadgeCount } from '../services/inbox'
import type { InboxBadgeCount } from '../types'

export const Navbar: FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [alertCount, setAlertCount] = useState(0)
  const [inboxCount, setInboxCount] = useState<InboxBadgeCount>({ total: 0, requiresReview: 0 })
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      const fetchAlerts = async () => {
        const result = await getActiveAlerts(user.uid)
        if (result.success && result.data) {
          setAlertCount(result.data.length)
        }
      }
      const fetchInbox = async () => {
        const result = await listInboxItems(user.uid)
        if (result.success && result.data) {
          setInboxCount(calculateBadgeCount(result.data))
        }
      }
      void fetchAlerts()
      void fetchInbox()
      // Optional: set up real-time listener if Firestore rules allow it,
      // but for now polling or refresh is enough as per requirements.
    }
  }, [user])

  const navLinks = [
    { to: '/', label: 'Dashboard' },
    { to: '/payroll', label: 'Cedolini' },
    { to: '/investimenti/pac', label: 'PAC' },
    { to: '/cashflow', label: 'Cash Flow' },
    { to: '/monthly-close', label: 'Chiusura Mensile' },
    { to: '/mutuo', label: 'Mutuo' },
    { to: '/previdenza', label: 'Previdenza' },
    { to: '/kindergarten', label: 'Kindergarten' },
    { to: '/documenti', label: 'Documenti' },
    { to: '/what-if', label: 'What-if' },
    { to: '/goals', label: 'Obiettivi' },
    { to: '/alerts', label: 'Alerts' },
    { to: '/inbox', label: 'Inbox' },
    ...(user?.email === 'amanti84@gmail.com' ? [{ to: '/admin', label: 'Admin' }] : []),
  ]

  const handleLogout = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error('Errore durante il logout:', error)
    }
  }

  const activeStyle = {
    fontWeight: 'bold',
    borderBottom: '2px solid #007bff',
    color: '#007bff',
  }

  const linkStyle = {
    textDecoration: 'none',
    color: '#333',
    padding: '8px 12px',
    display: 'block',
  }

  return (
    <nav style={{ backgroundColor: '#fff', borderBottom: '1px solid #ddd', padding: '0 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '60px' }}>
        <div style={{ fontWeight: 'bold', fontSize: '1.2rem', display: 'flex', alignItems: 'center' }}>
          Manti Finance
          {alertCount > 0 && (
            <NavLink
              to="/alerts"
              style={{
                backgroundColor: '#dc3545',
                color: 'white',
                borderRadius: '50%',
                padding: '2px 6px',
                fontSize: '0.7rem',
                marginLeft: '8px',
                minWidth: '18px',
                textAlign: 'center',
                textDecoration: 'none',
              }}
            >
              {alertCount}
            </NavLink>
          )}
          <NavLink to="/inbox" style={{ textDecoration: 'none' }}>
            <InboxBadge count={inboxCount} />
          </NavLink>
        </div>

        {/* Desktop Menu */}
        <div className="desktop-menu" style={{ display: 'none', gap: '8px' }}>
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              style={({ isActive }) => (isActive ? { ...linkStyle, ...activeStyle } : linkStyle)}
            >
              {link.label}
            </NavLink>
          ))}
          <button
            onClick={() => void handleLogout()}
            style={{ marginLeft: '16px', padding: '6px 12px', cursor: 'pointer', border: '1px solid #ddd', borderRadius: '4px', background: 'none' }}
          >
            Logout
          </button>
        </div>

        {/* Hamburger */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{ display: 'block', background: 'none', border: '1px solid #ddd', padding: '8px', cursor: 'pointer' }}
        >
          ☰
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div style={{ paddingBottom: '16px' }}>
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setIsOpen(false)}
              style={({ isActive }) => (isActive ? { ...linkStyle, ...activeStyle } : linkStyle)}
            >
              {link.label}
            </NavLink>
          ))}
          <button
            onClick={() => {
              setIsOpen(false)
              void handleLogout()
            }}
            style={{ width: '100%', textAlign: 'left', padding: '8px 12px', cursor: 'pointer', border: 'none', background: 'none', color: '#333' }}
          >
            Logout
          </button>
        </div>
      )}

      <style>{`
        .desktop-menu { display: none !important; }
        @media (min-width: 1024px) {
          .desktop-menu { display: flex !important; }
          nav button:not(.desktop-menu button) { display: none !important; }
        }
      `}</style>
    </nav>
  )
}
