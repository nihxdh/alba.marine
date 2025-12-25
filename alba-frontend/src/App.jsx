import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import TokenEntry from './pages/TokenEntry'
import Billing from './pages/Billing'
import CreateBill from './pages/CreateBill'
import WeeklyPayout from './pages/WeeklyPayout'
import PrintPeelingStatement from './pages/print/PrintPeelingStatement'

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Default route redirects to login */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* Login page route */}
          <Route path="/login" element={<Login />} />
          
          {/* Dashboard route (protected) */}
          <Route path="/dashboard" element={<Dashboard />} />
          
          {/* Token Entry route (protected) */}
          <Route path="/tokens" element={<TokenEntry />} />
          
          {/* Billing route (protected) */}
          <Route path="/billing" element={<Billing />} />
          
          {/* Create Bill route (protected) */}
          <Route path="/billing/create" element={<CreateBill />} />
          
          {/* Weekly Payout route (protected) */}
          <Route path="/payout" element={<WeeklyPayout />} />

          {/* Print Peeling Statement routes (preview + by id) */}
          <Route path="/print/peeling/preview" element={<PrintPeelingStatement />} />
          <Route path="/print/peeling/:id" element={<PrintPeelingStatement />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
