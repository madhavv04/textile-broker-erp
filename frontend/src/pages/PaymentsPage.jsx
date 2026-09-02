/**
 * pages/PaymentsPage.jsx
 * Payments management — record, list, edit, delete.
 */
import React, { useState } from 'react';
import { Check, Edit2, Trash2, X } from 'lucide-react';
import SwipeDismissModal from '../components/common/SwipeDismissModal.jsx';
import { createPayment, updatePayment, deletePayment } from '../api/payments.js';

const EMPTY_FORM = {
  party_name: '', amount: '', date: new Date().toISOString().slice(0, 10),
};

const money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

export default function PaymentsPage({
  token, onUnauthorized, showNotification, fetchData, payments, parties,
}) {
  const [paymentForm, setPaymentForm] = useState(EMPTY_FORM);
  const [editPayment, setEditPayment] = useState(null);

  // ── Add payment ──────────────────────────────────────────────────────────────
  const handleAddPayment = async (e) => {
    e.preventDefault();
    const amount = parseFloat(paymentForm.amount);
    if (isNaN(amount)) return showNotification('Amount must be a valid number', 'error');
    const { ok, data } = await createPayment(token, onUnauthorized, {
      party_name: paymentForm.party_name.trim(),
      amount,
      date: paymentForm.date,
    });
    if (ok) {
      showNotification('Payment recorded successfully!');
      setPaymentForm({ ...EMPTY_FORM, date: new Date().toISOString().slice(0, 10) });
      fetchData();
    } else {
      showNotification(data?.detail || 'Error recording payment', 'error');
    }
  };

  // ── Update payment ────────────────────────────────────────────────────────────
  const handleUpdatePayment = async (e) => {
    e.preventDefault();
    const { ok, data } = await updatePayment(token, onUnauthorized, editPayment.id, {
      party_name: editPayment.party_name,
      amount: parseFloat(editPayment.amount),
      date: editPayment.date,
    });
    if (ok) {
      showNotification('Payment record updated!');
      setEditPayment(null);
      fetchData();
    } else {
      showNotification(data?.detail || 'Error updating payment', 'error');
    }
  };

  // ── Delete payment ────────────────────────────────────────────────────────────
  const handleDeletePayment = async (id) => {
    const { ok } = await deletePayment(token, onUnauthorized, id);
    if (ok) {
      showNotification('Payment record deleted');
      fetchData();
    } else {
      showNotification('Error deleting payment', 'error');
    }
  };

  return (
    <div className="page-section">
      {/* Shared party datalist */}
      <datalist id="parties-list-payments">
        {parties.map((p, idx) => <option key={idx} value={p.name} />)}
      </datalist>

      {/* ── Edit Payment Modal ── */}
      {editPayment && (
        <SwipeDismissModal onClose={() => setEditPayment(null)} maxWidth={450}>
          <button onClick={() => setEditPayment(null)} style={{ position: 'absolute', right: '20px', top: '20px', background: 'none', border: 'none', cursor: 'pointer' }} aria-label="Close">
            <X size={20} className="text-secondary" />
          </button>
          <h2 style={{ marginBottom: '20px' }}><Edit2 size={18} /> Edit Payment Record</h2>
          <form onSubmit={handleUpdatePayment} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="input-group">
              <label>Party Name</label>
              <input required list="parties-list-payments" value={editPayment.party_name} onChange={(e) => setEditPayment({ ...editPayment, party_name: e.target.value })} />
            </div>
            <div className="input-group">
              <label>Amount Received (₹)</label>
              <input type="number" step="0.01" required value={editPayment.amount} onChange={(e) => setEditPayment({ ...editPayment, amount: e.target.value })} />
            </div>
            <div className="input-group">
              <label>Payment Date</label>
              <input type="date" required value={editPayment.date} onChange={(e) => setEditPayment({ ...editPayment, date: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button type="button" className="btn" style={{ backgroundColor: '#f1f5f9' }} onClick={() => setEditPayment(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Changes</button>
            </div>
          </form>
        </SwipeDismissModal>
      )}

      {/* ── Record Payment ── */}
      <div className="panel">
        <div className="panel-header"><h2>Record Payment</h2></div>
        <form onSubmit={handleAddPayment} className="form-grid">
          <div className="input-group">
            <label>Party Name</label>
            <input required list="parties-list-payments" placeholder="Type or select party" value={paymentForm.party_name} onChange={(e) => setPaymentForm({ ...paymentForm, party_name: e.target.value })} />
          </div>
          <div className="input-group">
            <label>Amount Received (₹)</label>
            <input type="number" step="0.01" required placeholder="e.g. 50000" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
          </div>
          <div className="input-group">
            <label>Payment Date</label>
            <input type="date" required value={paymentForm.date} onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })} />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary"><Check size={16} /> Record Payment</button>
          </div>
        </form>
      </div>

      {/* ── Payment History ── */}
      <div className="panel">
        <div className="panel-header"><h2>Payment History</h2></div>
        <div className="table-container table-mobile-cards">
          <table>
            <thead>
              <tr>
                <th>Date</th><th>Party</th><th>Amount</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td data-label="Date">{new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td data-label="Party"><strong>{p.party_name}</strong></td>
                  <td data-label="Amount">{money(p.amount)}</td>
                  <td data-label="Actions">
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button className="btn" style={{ padding: '6px 10px', background: '#f1f5f9', border: '1px solid #cbd5e1' }} onClick={() => setEditPayment(p)} aria-label="Edit payment"><Edit2 size={13} className="text-secondary" /></button>
                      <button className="btn" style={{ padding: '6px 10px', background: '#fef2f2', border: '1px solid #fee2e2', color: '#ef4444' }} onClick={() => handleDeletePayment(p.id)} aria-label="Delete payment"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No payments recorded.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
