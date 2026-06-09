import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { UnauthorizedPage } from './pages/UnauthorizedPage'
import { PayrollPage } from './modules/payroll'
import { PacPage } from './modules/pac'
import { CashFlowPage } from './modules/cashflow'
import { MonthlyClosePage } from './modules/monthlyClose'
import { MutuoPage } from './modules/mutuo'
import { InvestimentiPage } from './modules/investimenti'
import { PrevidenzaPage } from './modules/previdenza'
import { MonthlyAllocationPage } from './modules/monthly-allocation'
import KindergartenPage from './modules/kindergarten/KindergartenPage'
import { DocumentiPage } from './modules/documenti'
import { WhatIfPage } from './modules/whatIf'
import { AlertsPage } from './modules/alerts'
import { InboxPage } from './modules/inbox'
import { GoalsPage } from './modules/goals'
import { AdminPage } from './pages/AdminPage'
import DashboardPage from './pages/DashboardPage'
import { ComponentGallery } from './ComponentGallery'

function App(): React.ReactElement {
  const { user } = useAuth()

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Public Gallery */}
        <Route path="/ui-gallery" element={<ComponentGallery />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/payroll" element={<PayrollPage />} />
            <Route path="/investimenti" element={<InvestimentiPage />} />
            <Route path="/investimenti/pac" element={user ? <PacPage uid={user.uid} /> : null} />
            <Route path="/cashflow" element={user ? <CashFlowPage uid={user.uid} /> : null} />
            <Route path="/monthly-close" element={user ? <MonthlyClosePage uid={user.uid} /> : null} />
            <Route path="/mutuo" element={<MutuoPage />} />
            <Route path="/monthly-allocation" element={<MonthlyAllocationPage />} />
            <Route path="/previdenza" element={<PrevidenzaPage />} />
            <Route path="/kindergarten" element={user ? <KindergartenPage uid={user.uid} /> : null} />
            <Route path="/documenti" element={<DocumentiPage />} />
            <Route path="/what-if" element={<WhatIfPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/inbox" element={<InboxPage />} />
            <Route path="/goals" element={<GoalsPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
