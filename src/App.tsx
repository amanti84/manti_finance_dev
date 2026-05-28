import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { PayrollPage } from './modules/payroll'
import { PacPage } from './modules/pac'
import { CashFlowPage } from './modules/cashflow'
import { MutuoPage } from './pages/MutuoPage'
import { InvestimentiPage } from './pages/InvestimentiPage'
import { PrevidenzaPage } from './pages/PrevidenzaPage'
import { KindergartenPage } from './pages/KindergartenPage'
import { DocumentiPage } from './pages/DocumentiPage'
import { WhatIfPage } from './modules/whatIf'

function App(): React.ReactElement {
  const { user } = useAuth()

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route
              path="/"
              element={
                <div>
                  <h1>Dashboard</h1>
                  <p>Benvenuto, {user?.email}</p>
                </div>
              }
            />
            <Route path="/payroll" element={<PayrollPage />} />
            <Route path="/investimenti" element={<InvestimentiPage />} />
            <Route path="/investimenti/pac" element={user ? <PacPage uid={user.uid} /> : null} />
            <Route path="/cashflow" element={user ? <CashFlowPage uid={user.uid} /> : null} />
            <Route path="/mutuo" element={<MutuoPage />} />
            <Route path="/previdenza" element={<PrevidenzaPage />} />
            <Route path="/kindergarten" element={<KindergartenPage />} />
            <Route path="/documenti" element={<DocumentiPage />} />
            <Route path="/what-if" element={<WhatIfPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
