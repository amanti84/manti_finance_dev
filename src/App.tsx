import React from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { PayrollPage } from './modules/payroll'
import { PacPage } from './modules/pac'

function App(): React.ReactElement {
  const { user, loading } = useAuth()

  if (loading) {
    return <div style={{ padding: '24px' }}>Caricamento...</div>
  }

  return (
    <BrowserRouter>
      <div>
        <nav style={{ padding: '16px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #ddd' }}>
          <Link to="/" style={{ marginRight: '16px', textDecoration: 'none', color: '#007bff' }}>
            Home
          </Link>
          <Link to="/payroll" style={{ marginRight: '16px', textDecoration: 'none', color: '#007bff' }}>
            Cedolini
          </Link>
          <Link to="/investimenti/pac" style={{ textDecoration: 'none', color: '#007bff' }}>
            PAC
          </Link>
        </nav>

        <Routes>
          <Route
            path="/"
            element={
              <div style={{ padding: '24px' }}>
                <h1>Manti Finance</h1>
                {user ? (
                  <p>Benvenuto, {user.email}</p>
                ) : (
                  <p>Effettua il login per accedere</p>
                )}
              </div>
            }
          />
          <Route
            path="/payroll"
            element={<PayrollPage />}
          />
          <Route
            path="/investimenti/pac"
            element={
              user ? (
                <PacPage uid={user.uid} />
              ) : (
                <div style={{ padding: '24px' }}>Effettua il login per accedere ai PAC</div>
              )
            }
          />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
