import React, { useEffect, useState, useRef } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import axios from 'axios'
import html2pdf from 'html2pdf.js'
import {
  getGrandTotalsFromWeights,
  getStatementNumberFromBillNo,
  formatPeelingDate,
} from '../../utils/billingUtils'
import albaMarineHeading from '../../assets/alba Marine.png'

const PrintPeelingStatement = () => {
  const { id } = useParams()
  const location = useLocation()
  const articleRef = useRef(null)

  const [bill, setBill] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const handleDownloadPDF = async () => {
    if (!articleRef.current) return

    const element = articleRef.current
    const statementNumber = getStatementNumberFromBillNo(bill?.billNo || '')
    const filename = `PEELING_STATEMENT_${statementNumber}.pdf`

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

  useEffect(() => {
    // If bill data is passed via navigation state (e.g. from CreateBill preview), use it directly
    if (location.state?.billData) {
      setBill(location.state.billData)
      setIsLoading(false)
      return
    }

    // Otherwise, fetch by ID
    if (!id) {
      setIsLoading(false)
      return
    }

    const fetchBill = async () => {
      try {
        const baseURL = import.meta.env.VITE_API_BASE_URL
        const token = localStorage.getItem('authToken')

        const response = await axios.get(`${baseURL}/billing/bills/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.status === 200) {
          setBill(response.data.data)
        }
      } catch (error) {
        console.error('Error fetching bill for print:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBill()
  }, [id, location.state])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-600">
        Loading bill for print...
      </div>
    )
  }

  if (!bill) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        Unable to load bill data for printing.
      </div>
    )
  }

  const { grandTotalKgs, grandTotalBoxes } = getGrandTotalsFromWeights(
    bill.MeatDetails || []
  )
  const statementNumber = getStatementNumberFromBillNo(bill.billNo)
  const formattedDate = formatPeelingDate(bill.date)

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

      <article ref={articleRef} className="peeling-statement">
        <header className="ps-header">
          <div className="ps-header__title">
            <img
              src={albaMarineHeading}
              alt="ALBA MARINE"
              className="ps-logo"
            />
            <h1>PEELING STATEMENT</h1>
          </div>
          <div className="ps-header__meta">
            <div className="ps-header__shed">Shed ALBA MARINE</div>
            <div className="ps-header__statement">
              <span>Statement No:</span>
              <span className="ps-header__statement-number">
                {statementNumber}
              </span>
            </div>
            <div className="ps-header__date">
              <span>Date</span>
              <span>{formattedDate}</span>
            </div>
          </div>
        </header>

        <section className="ps-section ps-section--purchase">
          <h2>Purchase Details</h2>
          <div className="ps-grid">
            <div className="ps-grid__row">
              <span className="ps-label">Purchase Whole Count.:</span>
              <span className="ps-value">{bill.wholeCount}</span>
            </div>
            <div className="ps-grid__row">
              <span className="ps-label">Vehicle No.:</span>
              <span className="ps-value">{bill.vehicleNo}</span>
            </div>
            <div className="ps-grid__row">
              <span className="ps-label">Purchase Spot.:</span>
              <span className="ps-value">{bill.purchaseSpot}</span>
            </div>
            <div className="ps-grid__row">
              <span className="ps-label">No. of Box.:</span>
              <span className="ps-value">{bill.boxCount}</span>
            </div>
            <div className="ps-grid__row">
              <span className="ps-label">Total Kgs.:</span>
              <span className="ps-value">{grandTotalKgs} kg</span>
            </div>
          </div>
        </section>

        <section className="ps-section ps-section--table">
          <h2>Meat Details</h2>
          <table className="ps-table">
            <thead>
              <tr>
                <th>Variety</th>
                <th>Count</th>
                <th>Kgs.</th>
                <th>Gms</th>
                <th>No. of Box</th>
              </tr>
            </thead>
            <tbody>
              {(bill.MeatDetails || []).flatMap((meat, idx) =>
                (meat.weight || []).map((weight, wIdx) => (
                  <tr key={`${idx}-${wIdx}`}>
                    <td>{meat.varity}</td>
                    <td>{meat.count}</td>
                    <td>{weight.kgs || '-'}</td>
                    <td>{weight.grams || '-'}</td>
                    <td>{meat.noOfBox}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        <section className="ps-section ps-section--totals">
          <h2>Grand Total</h2>
          <div className="ps-grid">
            <div className="ps-grid__row">
              <span className="ps-label">Total Kgs.:</span>
              <span className="ps-value">{grandTotalKgs} kg</span>
            </div>
            <div className="ps-grid__row">
              <span className="ps-label">Total Boxes:</span>
              <span className="ps-value">{grandTotalBoxes} BOX</span>
            </div>
          </div>
        </section>

        <section className="ps-section ps-section--stock">
          <div className="ps-peeling-status">Peeling Completed / Not:</div>

          <h2>Stock Details</h2>
        </section>

        <footer className="ps-footer">
          <div className="ps-footer__company">For ALBA MARINE</div>
        </footer>
      </article>
    </div>
  )
}

export default PrintPeelingStatement


