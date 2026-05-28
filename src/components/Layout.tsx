import type { FC } from 'react'
import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'

export const Layout: FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <main style={{ flex: 1, padding: '24px' }}>
        <Outlet />
      </main>
      <footer style={{ padding: '16px', textAlign: 'center', borderTop: '1px solid #ddd', fontSize: '0.8rem', color: '#666' }}>
        &copy; {new Date().getFullYear()} Manti Finance - Personal Finance Copilot
      </footer>
    </div>
  )
}
