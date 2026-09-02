/**
 * pages/DashboardPage.jsx
 * Dashboard — stats cards + recent transactions table.
 */
import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { ShoppingCart, Layers, DollarSign, Wallet } from 'lucide-react';

const money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

export default function DashboardPage({ stats, orders }) {
  return (
    <div className="page-section">
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="card-icon blue"><ShoppingCart size={22} /></div>
          <div className="card-info">
            <span className="card-label">Total Orders</span>
            <h2 className="card-value">{stats.order_count}</h2>
          </div>
        </div>
        <div className="stat-card">
          <div className="card-icon green"><Layers size={22} /></div>
          <div className="card-info">
            <span className="card-label">Total Meters</span>
            <h2 className="card-value">{stats.total_meters.toLocaleString('en-IN')}</h2>
          </div>
        </div>
        <div className="stat-card">
          <div className="card-icon yellow"><DollarSign size={22} /></div>
          <div className="card-info">
            <span className="card-label">Total Brokerage</span>
            <h2 className="card-value">{money(stats.total_brokerage)}</h2>
          </div>
        </div>
        <div className="stat-card">
          <div className="card-icon red"><Wallet size={22} /></div>
          <div className="card-info">
            <span className="card-label">Outstanding</span>
            <h2 className="card-value">{money(stats.outstanding)}</h2>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="panel">
        <div className="panel-header">
          <h2>Recent Transactions</h2>
        </div>
        <div className="table-container table-mobile-cards">
          <table>
            <thead>
              <tr>
                <th>Order No.</th>
                <th>Party</th>
                <th>Quality</th>
                <th>Meters</th>
                <th>Rate</th>
                <th>Brokerage</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 8).map((o) => (
                <tr key={o.id}>
                  <td data-label="Order No."><strong>{o.no}</strong></td>
                  <td data-label="Party">{o.party_name}</td>
                  <td data-label="Quality">{o.quality || '-'}</td>
                  <td data-label="Meters">{o.qty.toLocaleString('en-IN')}</td>
                  <td data-label="Rate">{money(o.rate)}</td>
                  <td data-label="Brokerage">
                    <span style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{money(o.b_value)}</span>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No orders logged yet.
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
