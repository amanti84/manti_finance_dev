import type { FC } from 'react'
import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { auth } from '../firebase'
import { signOut } from 'firebase/auth'

export const Navbar: FC = () => {
  const [isOpen, setIsOpen] = useState(false)

  const navLinks = [
    { to: '/', label: 'Dashboard' },
    { to: '/payroll', label: 'Cedolini' },
    { to: '/investimenti/pac', label: 'PAC' },
    { to: '/cashflow', label: 'Cash Flow' },
    { to: '/mutuo', label: 'Mutuo' },
    { to: '/previdenza', label: 'Previdenza' },
    { to: '/kindergarten', label: 'Kindergarten' },
    { to: '/documenti', label: 'Documenti' },
    { to: '/what-if', label: 'What-if' },
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
        <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>Manti Finance</div>

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

        {/* Hamburger (Simple implementation for now) */}
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

      {/* Basic styles to handle desktop/mobile toggle without external CSS file if possible */}
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
