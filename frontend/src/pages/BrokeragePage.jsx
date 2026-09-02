/**
 * pages/BrokeragePage.jsx
 * Brokerage summary by party.
 */
import React from 'react';

const money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

export default function BrokeragePage({ brokerage }) {
  return (
    <div className="page-section">
      <div className="panel">
        <div className="panel-header">
          <h2>Brokerage Summary by Party</h2>
        </div>
        <div className="table-container table-mobile-cards">
          <table>
            <thead>
              <tr>
                <th>Party</th>
                <th>Total Order Value</th>
                <th>Total Brokerage Earned</th>
              </tr>
            </thead>
            <tbody>
              {brokerage.map((row, idx) => (
                <tr key={idx}>
                  <td data-label="Party"><strong>{row.party_name}</strong></td>
                  <td data-label="Total Order Value">{money(row.order_value)}</td>
                  <td data-label="Total Brokerage Earned">
                    <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>
                      {money(row.brokerage)}
                    </span>
                  </td>
                </tr>
              ))}
              {brokerage.length === 0 && (
                <tr>
                  <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No brokerage logged.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
