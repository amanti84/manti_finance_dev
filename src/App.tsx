import React from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { PayrollPage } from './modules/payroll'

function HomePage(): React.ReactElement {
  return (
    <div>
      <h1>Manti Finance</h1>
      <p>Benvenuto nella piattaforma di gestione finanziaria personale.</p>
    </div>
  )
}

function Navigation(): React.ReactElement {
  return (
    <nav style={{ padding: '16px', borderBottom: '1px solid #ddd', marginBottom: '24px' }}>
      <Link to="/" style={{ marginRight: '16px' }}>Home</Link>
      <Link to="/payroll">Cedolini</Link>
    </nav>
  )
}

function App(): React.ReactElement {
  return (
    <BrowserRouter>
      <Navigation />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/payroll" element={<PayrollPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
