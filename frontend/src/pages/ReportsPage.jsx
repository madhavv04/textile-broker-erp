/**
 * pages/ReportsPage.jsx
 * Business reports — 4 filterable tables + PDF export (via browser print).
 */
import React, { useMemo, useState } from 'react';
import { Download, Calendar } from 'lucide-react';

const money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

export default function ReportsPage({ orders }) {
  const today = new Date().toISOString().slice(0, 10);
  const firstOfMonth = today.slice(0, 8) + '01';

  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate, setToDate] = useState(today);
  const [selectedMonth, setSelectedMonth] = useState(today.slice(0, 7)); // YYYY-MM

  // Orders within From–To range (used by reports 1, 2, 3)
  const rangeOrders = useMemo(() => (
    orders.filter((o) => o.date >= fromDate && o.date <= toDate)
  ), [orders, fromDate, toDate]);

  // Orders within selected month (used by report 4)
  const monthOrders = useMemo(() => (
    orders.filter((o) => (o.date || '').slice(0, 7) === selectedMonth)
  ), [orders, selectedMonth]);

  // ── Report 1: Party-wise Maal ──────────────────────────────────────────────
  const partyReport = useMemo(() => {
    const byParty = {};
    rangeOrders.forEach((o) => {
      const key = o.party_name || 'Unknown';
      if (!byParty[key]) byParty[key] = { party_name: key, meters: 0, value: 0 };
      byParty[key].meters += o.qty || 0;
      byParty[key].value += o.value || 0;
    });
    return Object.values(byParty).sort((a, b) => b.value - a.value);
  }, [rangeOrders]);

  // ── Report 2: Weaver-wise Maal ─────────────────────────────────────────────
  const weaverReport = useMemo(() => {
    const byWeaver = {};
    rangeOrders.forEach((o) => {
      const key = o.weaver || 'Unspecified';
      if (!byWeaver[key]) byWeaver[key] = { weaver: key, meters: 0, value: 0 };
      byWeaver[key].meters += o.qty || 0;
      byWeaver[key].value += o.value || 0;
    });
    return Object.values(byWeaver).sort((a, b) => b.meters - a.meters);
  }, [rangeOrders]);

  // ── Report 3: Quality-wise Quantity ────────────────────────────────────────
  const qualityReport = useMemo(() => {
    const byQuality = {};
    rangeOrders.forEach((o) => {
      const key = o.quality || 'Unspecified';
      if (!byQuality[key]) byQuality[key] = { quality: key, meters: 0, orderCount: 0 };
      byQuality[key].meters += o.qty || 0;
      byQuality[key].orderCount += 1;
    });
    return Object.values(byQuality).sort((a, b) => b.meters - a.meters);
  }, [rangeOrders]);

  // ── Report 4: Month-end Lot Sale ───────────────────────────────────────────
  const lotReport = useMemo(() => (
    monthOrders
      .filter((o) => o.lot)
      .map((o) => ({
        lot: o.lot, party_name: o.party_name, qty: o.qty, value: o.value, date: o.date,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  ), [monthOrders]);

  const monthOptions = useMemo(() => {
    const set = new Set(orders.map((o) => (o.date || '').slice(0, 7)).filter(Boolean));
    return Array.from(set).sort().reverse();
  }, [orders]);

  const handlePrint = () => window.print();

  return (
    <div className="page-section">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .page-section { padding: 0 !important; }
          .panel { break-inside: avoid; box-shadow: none !important; border: 1px solid #ddd !important; }
        }
      `}</style>

      {/* ── Filters ── */}
      <div className="panel no-print">
        <div className="panel-header"><h2><Calendar size={18} /> Report Filters</h2></div>
        <div className="form-grid" style={{ marginTop: '10px' }}>
          <div className="input-group">
            <label>From Date (Reports 1-3)</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="input-group">
            <label>To Date (Reports 1-3)</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div className="input-group">
            <label>Month (Report 4 - Lot Sale)</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              list="months-list"
            />
            <datalist id="months-list">
              {monthOptions.map((m) => <option key={m} value={m} />)}
            </datalist>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" onClick={handlePrint}>
              <Download size={16} /> Download PDF
            </button>
          </div>
        </div>
      </div>

      {/* ── Report 1: Party-wise Maal ── */}
      <div className="panel" style={{ marginTop: '20px' }}>
        <div className="panel-header"><h2>1. Party-wise Maal ({fromDate} to {toDate})</h2></div>
        <div className="table-container table-mobile-cards">
          <table>
            <thead><tr><th>Party Name</th><th>Total Meters</th><th>Total Value</th></tr></thead>
            <tbody>
              {partyReport.map((r) => (
                <tr key={r.party_name}>
                  <td data-label="Party Name"><strong>{r.party_name}</strong></td>
                  <td data-label="Total Meters">{r.meters.toLocaleString('en-IN')}</td>
                  <td data-label="Total Value">{money(r.value)}</td>
                </tr>
              ))}
              {partyReport.length === 0 && (
                <tr><td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No data in this range.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Report 2: Weaver-wise Maal ── */}
      <div className="panel" style={{ marginTop: '20px' }}>
        <div className="panel-header"><h2>2. Weaver-wise Maal ({fromDate} to {toDate})</h2></div>
        <div className="table-container table-mobile-cards">
          <table>
            <thead><tr><th>Weaver</th><th>Total Meters</th><th>Total Value</th></tr></thead>
            <tbody>
              {weaverReport.map((r) => (
                <tr key={r.weaver}>
                  <td data-label="Weaver"><strong>{r.weaver}</strong></td>
                  <td data-label="Total Meters">{r.meters.toLocaleString('en-IN')}</td>
                  <td data-label="Total Value">{money(r.value)}</td>
                </tr>
              ))}
              {weaverReport.length === 0 && (
                <tr><td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No data in this range.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Report 3: Quality-wise Quantity ── */}
      <div className="panel" style={{ marginTop: '20px' }}>
        <div className="panel-header"><h2>3. Quality-wise Quantity ({fromDate} to {toDate})</h2></div>
        <div className="table-container table-mobile-cards">
          <table>
            <thead><tr><th>Quality</th><th>Total Meters</th><th>Orders</th></tr></thead>
            <tbody>
              {qualityReport.map((r) => (
                <tr key={r.quality}>
                  <td data-label="Quality"><strong>{r.quality}</strong></td>
                  <td data-label="Total Meters">{r.meters.toLocaleString('en-IN')}</td>
                  <td data-label="Orders">{r.orderCount}</td>
                </tr>
              ))}
              {qualityReport.length === 0 && (
                <tr><td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No data in this range.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Report 4: Month-end Lot Sale ── */}
      <div className="panel" style={{ marginTop: '20px' }}>
        <div className="panel-header"><h2>4. Lot Sale — {selectedMonth}</h2></div>
        <div className="table-container table-mobile-cards">
          <table>
            <thead><tr><th>Lot</th><th>Party</th><th>Date</th><th>Qty (Meters)</th><th>Value</th></tr></thead>
            <tbody>
              {lotReport.map((r, idx) => (
                <tr key={idx}>
                  <td data-label="Lot"><strong>{r.lot}</strong></td>
                  <td data-label="Party">{r.party_name}</td>
                  <td data-label="Date">{new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                  <td data-label="Qty (Meters)">{r.qty.toLocaleString('en-IN')}</td>
                  <td data-label="Value">{money(r.value)}</td>
                </tr>
              ))}
              {lotReport.length === 0 && (
                <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No lots sold in this month.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}