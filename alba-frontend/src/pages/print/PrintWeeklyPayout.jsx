import React, { useEffect, useState, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import html2pdf from 'html2pdf.js'
import albaMarineHeading from '../../assets/alba Marine.png'

const PrintWeeklyPayout = () => {
  const location = useLocation()
  const articleRef = useRef(null)

  const [payoutData, setPayoutData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Get payout data from navigation state
    if (location.state?.payoutData) {
      setPayoutData(location.state.payoutData)
      setIsLoading(false)
    } else {
      setIsLoading(false)
    }
  }, [location.state])

  const handleDownloadPDF = async () => {
    if (!articleRef.current || !payoutData) return

    const element = articleRef.current
    const weekInfo = payoutData.weekInfo
    const filename = `WEEKLY_PAYOUT_${weekInfo.start}_${weekInfo.end}.pdf`

    const opt = {
      margin: [12, 12, 14, 12],
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }

    try {
      await html2pdf().set(opt).from(element).save()
    } catch (error) {
      console.error('Error generating PDF:', error)
    }
  }

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    })
  }

  // Format date display with weekday
  const formatDateDisplay = (dateString) => {
    const date = new Date(dateString)
    const weekday = date.toLocaleDateString('en-IN', { weekday: 'short' })
    const formattedDate = date.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    })
    
    return {
      dayName: weekday.toUpperCase(),
      date: formattedDate,
      isSunday: date.getDay() === 0
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-600">
        Loading payout data for print...
      </div>
    )
  }

  if (!payoutData) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        Unable to load payout data for printing.
      </div>
    )
  }

  const { employees, weekDates, weekInfo, summary } = payoutData

  return (
    <div className="print-page">
      {/* Controls visible only on screen, not in printed PDF */}
      <div className="no-print fixed top-4 right-6 z-40 flex items-center space-x-3">
        <button
          type="button"
          onClick={handleDownloadPDF}
          className="px-4 py-2 text-xs font-medium rounded-full bg-slate-800 text-white shadow-md hover:bg-slate-700 transition-colors"
        >
          Download PDF
        </button>
      </div>

      <article ref={articleRef} className="weekly-payout-statement">
        <header className="wp-header">
          <div className="wp-header__title">
            <img
              src={albaMarineHeading}
              alt="ALBA MARINE"
              className="wp-logo"
            />
            <h1>WEEKLY PAYOUT STATEMENT</h1>
          </div>
          <div className="wp-header__meta">
            <div className="wp-header__week">
              Week: {formatDate(weekInfo.start)} - {formatDate(weekInfo.end)}
            </div>
            <div className="wp-header__date">
              Generated: {new Date().toLocaleDateString('en-IN', { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric' 
              })}
            </div>
          </div>
        </header>

        <section className="wp-section wp-section--table">
          <h2>Employee Payout Details</h2>
          <table className="wp-table">
            <thead>
              <tr>
                <th className="wp-th-id">ID</th>
                <th className="wp-th-name">Employee</th>
                {weekDates.map(date => {
                  const dateDisplay = formatDateDisplay(date)
                  const isSunday = dateDisplay.isSunday
                  
                  return (
                    <th key={date} className={`wp-th-day ${isSunday ? 'wp-th-sunday' : ''}`}>
                      <div className="wp-th-day-name">{dateDisplay.dayName}</div>
                      <div className="wp-th-day-date">{dateDisplay.date}</div>
                      {isSunday && <div className="wp-th-holiday">H</div>}
                    </th>
                  )
                })}
                <th className="wp-th-total">Weekly</th>
                <th className="wp-th-total">Onam</th>
                <th className="wp-th-total">Net</th>
                <th className="wp-th-total">Net×19.5</th>
                <th className="wp-th-total">Bata Days</th>
                <th className="wp-th-total">Total</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee, index) => {
                const weeklyTotal = weekDates.reduce((sum, date) => 
                  sum + (employee.dailyTokens[date]?.tokens || 0), 0
                )
                const onamBata = employee.onamBata || 0
                const netTotal = employee.netTotal || 0
                const netTotalAmount = netTotal * 19.5
                const morningBataDays = employee.morningBataDays || 0
                const totalAmount = netTotalAmount + (morningBataDays * 17)
                
                return (
                  <tr key={employee._id || index} className={index !== 0 ? 'wp-tr-border' : ''}>
                    <td className="wp-td-id">{employee.employeeId || employee._id?.slice(-4)}</td>
                    <td className="wp-td-name">{employee.name}</td>
                    {weekDates.map(date => {
                      const tokens = employee.dailyTokens[date]?.tokens || 0
                      const bata = employee.dailyTokens[date]?.bata || false
                      const dateDisplay = formatDateDisplay(date)
                      const isSunday = dateDisplay.isSunday
                      
                      return (
                        <td key={date} className={`wp-td-day ${isSunday ? 'wp-td-sunday' : ''}`}>
                          <div className="wp-token-value">
                            {isSunday ? 'H' : (tokens > 0 ? tokens : '0')}
                          </div>
                          {bata && <div className="wp-bata-indicator">+</div>}
                        </td>
                      )
                    })}
                    <td className="wp-td-total">{weeklyTotal}</td>
                    <td className="wp-td-total">{onamBata}</td>
                    <td className="wp-td-total">{netTotal}</td>
                    <td className="wp-td-total">₹{netTotalAmount.toFixed(0)}</td>
                    <td className="wp-td-total">{morningBataDays}</td>
                    <td className="wp-td-total wp-td-total-amount">₹{totalAmount.toFixed(0)}</td>
                  </tr>
                )
              })}
              
              {/* Total Row */}
              <tr className="wp-tr-total">
                <td className="wp-td-id">—</td>
                <td className="wp-td-name wp-td-total-label">Total</td>
                {weekDates.map(date => {
                  const dailyTotal = employees.reduce((sum, employee) => 
                    sum + (employee.dailyTokens[date]?.tokens || 0), 0
                  )
                  const dateDisplay = formatDateDisplay(date)
                  const isSunday = dateDisplay.isSunday
                  
                  return (
                    <td key={date} className={`wp-td-day ${isSunday ? 'wp-td-sunday' : ''}`}>
                      <div className="wp-token-value wp-token-total">
                        {isSunday ? 'H' : (dailyTotal || '0')}
                      </div>
                    </td>
                  )
                })}
                <td className="wp-td-total">{summary.weeklyTotal}</td>
                <td className="wp-td-total">{summary.onamBataTotal}</td>
                <td className="wp-td-total">{summary.netTotal}</td>
                <td className="wp-td-total">₹{summary.netTotalAmount.toFixed(0)}</td>
                <td className="wp-td-total">{summary.morningBataDays}</td>
                <td className="wp-td-total wp-td-total-amount">₹{summary.totalPayout.toFixed(0)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="wp-section wp-section--summary">
          <h2>Summary</h2>
          <div className="wp-summary-grid">
            <div className="wp-summary-card">
              <div className="wp-summary-value">{summary.employeeCount}</div>
              <div className="wp-summary-label">Employees</div>
            </div>
            <div className="wp-summary-card">
              <div className="wp-summary-value">{summary.weeklyTotal}</div>
              <div className="wp-summary-label">Weekly Total Tokens</div>
            </div>
            <div className="wp-summary-card">
              <div className="wp-summary-value">{summary.onamBataTotal}</div>
              <div className="wp-summary-label">Total Onam Bata</div>
            </div>
            <div className="wp-summary-card">
              <div className="wp-summary-value">{summary.morningBataDays}</div>
              <div className="wp-summary-label">Morning Bata Days</div>
            </div>
            <div className="wp-summary-card">
              <div className="wp-summary-value">₹{summary.netTotalAmount.toFixed(2)}</div>
              <div className="wp-summary-label">Net Total × 19.5</div>
            </div>
            <div className="wp-summary-card">
              <div className="wp-summary-value">₹{summary.morningBataAmount}</div>
              <div className="wp-summary-label">Morning Bata Amount</div>
            </div>
            <div className="wp-summary-card wp-summary-card-total">
              <div className="wp-summary-value">₹{summary.totalPayout.toFixed(2)}</div>
              <div className="wp-summary-label">Total Payout</div>
            </div>
          </div>
        </section>

        <footer className="wp-footer">
          <div className="wp-footer__company">For ALBA MARINE</div>
        </footer>
      </article>
    </div>
  )
}

export default PrintWeeklyPayout

