import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { ErrorBoundary } from './components/ErrorBoundary'
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
            <Route path="/" element={
              <ErrorBoundary moduleName="Dashboard">
                <DashboardPage />
              </ErrorBoundary>
            } />
            <Route path="/payroll" element={
              <ErrorBoundary moduleName="Payroll">
                <PayrollPage />
              </ErrorBoundary>
            } />
            <Route path="/investimenti" element={
              <ErrorBoundary moduleName="Investimenti">
                <InvestimentiPage />
              </ErrorBoundary>
            } />
            <Route path="/investimenti/pac" element={
              user ? (
                <ErrorBoundary moduleName="PAC">
                  <PacPage uid={user.uid} />
                </ErrorBoundary>
              ) : null
            } />
            <Route path="/cashflow" element={
              user ? (
                <ErrorBoundary moduleName="CashFlow">
                  <CashFlowPage uid={user.uid} />
                </ErrorBoundary>
              ) : null
            } />
            <Route path="/monthly-close" element={
              user ? (
                <ErrorBoundary moduleName="MonthlyClose">
                  <MonthlyClosePage uid={user.uid} />
                </ErrorBoundary>
              ) : null
            } />
            <Route path="/mutuo" element={
              <ErrorBoundary moduleName="Mutuo">
                <MutuoPage />
              </ErrorBoundary>
            } />
            <Route path="/monthly-allocation" element={
              <ErrorBoundary moduleName="MonthlyAllocation">
                <MonthlyAllocationPage />
              </ErrorBoundary>
            } />
            <Route path="/previdenza" element={
              <ErrorBoundary moduleName="Previdenza">
                <PrevidenzaPage />
              </ErrorBoundary>
            } />
            <Route path="/kindergarten" element={
              user ? (
                <ErrorBoundary moduleName="Kindergarten">
                  <KindergartenPage uid={user.uid} />
                </ErrorBoundary>
              ) : null
            } />
            <Route path="/documenti" element={
              <ErrorBoundary moduleName="Documenti">
                <DocumentiPage />
              </ErrorBoundary>
            } />
            <Route path="/what-if" element={
              <ErrorBoundary moduleName="WhatIf">
                <WhatIfPage />
              </ErrorBoundary>
            } />
            <Route path="/alerts" element={
              <ErrorBoundary moduleName="Alerts">
                <AlertsPage />
              </ErrorBoundary>
            } />
            <Route path="/inbox" element={
              <ErrorBoundary moduleName="Inbox">
                <InboxPage />
              </ErrorBoundary>
            } />
            <Route path="/goals" element={
              <ErrorBoundary moduleName="Goals">
                <GoalsPage />
              </ErrorBoundary>
            } />
            <Route path="/admin" element={
              <ErrorBoundary moduleName="Admin">
                <AdminPage />
              </ErrorBoundary>
            } />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
