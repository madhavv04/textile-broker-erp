/**
 * pages/OrdersPage.jsx
 * Orders management — create, list, edit, delete.
 */
import React, { useState } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import SwipeDismissModal from '../components/common/SwipeDismissModal.jsx';
import { createOrder, updateOrder, deleteOrder } from '../api/orders.js';

const EMPTY_FORM = {
  no: '', date: new Date().toISOString().slice(0, 10), party_name: '',
  weaver: '', quality: '', lot: '', taka: '', qty: '', rate: '',
  b_percent: '1.0', terms: '', remarks: '',
};

export default function OrdersPage({
  token, onUnauthorized, showNotification, fetchData, orders, parties,
}) {
  const [orderForm, setOrderForm] = useState(EMPTY_FORM);
  const [editOrder, setEditOrder] = useState(null);

  // ── Add order ───────────────────────────────────────────────────────────────
  const handleAddOrder = async (e) => {
    e.preventDefault();
    const qty = parseFloat(orderForm.qty);
    const rate = parseFloat(orderForm.rate);
    const b_percent = parseFloat(orderForm.b_percent);
    if (isNaN(qty) || isNaN(rate)) {
      return showNotification('Quantity and Rate must be valid numbers', 'error');
    }
    const { ok, data } = await createOrder(token, onUnauthorized, {
      no: orderForm.no.trim() || null,
      date: orderForm.date,
      party_name: orderForm.party_name.trim(),
      weaver: orderForm.weaver.trim() || null,
      quality: orderForm.quality.trim() || null,
      lot: orderForm.lot.trim() || null,
      taka: orderForm.taka.trim() || null,
      qty,
      rate,
      b_percent: isNaN(b_percent) ? 1.0 : b_percent,
      terms: orderForm.terms ? parseInt(orderForm.terms) : null,
      remarks: orderForm.remarks.trim() || null,
    });
    if (ok) {
      showNotification('Order saved successfully!');
      setOrderForm({ ...EMPTY_FORM, date: new Date().toISOString().slice(0, 10) });
      fetchData();
    } else {
      showNotification(data?.detail || 'Error saving order', 'error');
    }
  };

  // ── Update order ─────────────────────────────────────────────────────────────
  const handleUpdateOrder = async (e) => {
    e.preventDefault();
    const { ok, data } = await updateOrder(token, onUnauthorized, editOrder.id, {
      no: editOrder.no,
      date: editOrder.date,
      party_name: editOrder.party_name,
      weaver: editOrder.weaver || null,
      quality: editOrder.quality || null,
      lot: editOrder.lot || null,
      taka: editOrder.taka || null,
      qty: parseFloat(editOrder.qty),
      rate: parseFloat(editOrder.rate),
      b_percent: parseFloat(editOrder.b_percent),
      terms: editOrder.terms ? parseInt(editOrder.terms) : null,
      remarks: editOrder.remarks || null,
    });
    if (ok) {
      showNotification('Order record updated!');
      setEditOrder(null);
      fetchData();
    } else {
      showNotification(data?.detail || 'Error updating order', 'error');
    }
  };

  // ── Delete order ─────────────────────────────────────────────────────────────
  const handleDeleteOrder = async (id) => {
    const { ok } = await deleteOrder(token, onUnauthorized, id);
    if (ok) {
      showNotification('Order record deleted');
      fetchData();
    } else {
      showNotification('Error deleting order', 'error');
    }
  };

  const money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

  return (
    <div className="page-section">
      {/* Shared party datalist */}
      <datalist id="parties-list">
        {parties.map((p, idx) => <option key={idx} value={p.name} />)}
      </datalist>

      {/* ── Edit Order Modal ── */}
      {editOrder && (
        <SwipeDismissModal onClose={() => setEditOrder(null)} maxWidth={600}>
          <button onClick={() => setEditOrder(null)} style={{ position: 'absolute', right: '20px', top: '20px', background: 'none', border: 'none', cursor: 'pointer' }} aria-label="Close">
            <X size={20} className="text-secondary" />
          </button>
          <h2 style={{ marginBottom: '20px' }}><Edit2 size={18} /> Edit Order Record</h2>
          <form onSubmit={handleUpdateOrder} className="form-grid modal-form-grid">
            <div className="input-group"><label>Order No.</label><input value={editOrder.no} onChange={(e) => setEditOrder({ ...editOrder, no: e.target.value })} /></div>
            <div className="input-group"><label>Date</label><input type="date" required value={editOrder.date} onChange={(e) => setEditOrder({ ...editOrder, date: e.target.value })} /></div>
            <div className="input-group" style={{ gridColumn: '1 / -1' }}><label>Party / Buyer</label><input required list="parties-list" value={editOrder.party_name} onChange={(e) => setEditOrder({ ...editOrder, party_name: e.target.value })} /></div>
            <div className="input-group"><label>Weaver</label><input value={editOrder.weaver || ''} onChange={(e) => setEditOrder({ ...editOrder, weaver: e.target.value })} /></div>
            <div className="input-group"><label>Quality</label><input value={editOrder.quality || ''} onChange={(e) => setEditOrder({ ...editOrder, quality: e.target.value })} /></div>
            <div className="input-group"><label>Lot</label><input value={editOrder.lot || ''} onChange={(e) => setEditOrder({ ...editOrder, lot: e.target.value })} /></div>
            <div className="input-group"><label>Taka</label><input value={editOrder.taka || ''} onChange={(e) => setEditOrder({ ...editOrder, taka: e.target.value })} /></div>
            <div className="input-group"><label>Quantity (Meters)</label><input type="number" required value={editOrder.qty} onChange={(e) => setEditOrder({ ...editOrder, qty: e.target.value })} /></div>
            <div className="input-group"><label>Rate</label><input type="number" step="0.01" required value={editOrder.rate} onChange={(e) => setEditOrder({ ...editOrder, rate: e.target.value })} /></div>
            <div className="input-group"><label>Brokerage (%)</label><input type="number" step="0.01" required value={editOrder.b_percent} onChange={(e) => setEditOrder({ ...editOrder, b_percent: e.target.value })} /></div>
            <div className="input-group"><label>Payment Days</label><input type="number" value={editOrder.terms || ''} onChange={(e) => setEditOrder({ ...editOrder, terms: e.target.value })} /></div>
            <div className="input-group" style={{ gridColumn: '1 / -1' }}><label>Remarks</label><input value={editOrder.remarks || ''} onChange={(e) => setEditOrder({ ...editOrder, remarks: e.target.value })} /></div>
            <div className="form-actions modal-actions" style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button type="button" className="btn" style={{ backgroundColor: '#f1f5f9' }} onClick={() => setEditOrder(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Changes</button>
            </div>
          </form>
        </SwipeDismissModal>
      )}

      {/* ── Create New Order ── */}
      <div className="panel">
        <div className="panel-header"><h2>Create New Order</h2></div>
        <form onSubmit={handleAddOrder} className="form-grid">
          <div className="input-group"><label>Order No. (Auto-gen if blank)</label><input placeholder="e.g. ORD-1001" value={orderForm.no} onChange={(e) => setOrderForm({ ...orderForm, no: e.target.value })} /></div>
          <div className="input-group"><label>Order Date</label><input type="date" required value={orderForm.date} onChange={(e) => setOrderForm({ ...orderForm, date: e.target.value })} /></div>
          <div className="input-group"><label>Party / Buyer Name</label><input required list="parties-list" placeholder="Type or select party" value={orderForm.party_name} onChange={(e) => setOrderForm({ ...orderForm, party_name: e.target.value })} /></div>
          <div className="input-group"><label>Weaver / Mill</label><input placeholder="e.g. ABC Mill" value={orderForm.weaver} onChange={(e) => setOrderForm({ ...orderForm, weaver: e.target.value })} /></div>
          <div className="input-group"><label>Quality</label><input placeholder="e.g. Cotton 60x60" value={orderForm.quality} onChange={(e) => setOrderForm({ ...orderForm, quality: e.target.value })} /></div>
          <div className="input-group"><label>Lot</label><input placeholder="e.g. L-502" value={orderForm.lot} onChange={(e) => setOrderForm({ ...orderForm, lot: e.target.value })} /></div>
          <div className="input-group"><label>Taka</label><input placeholder="e.g. 10" value={orderForm.taka} onChange={(e) => setOrderForm({ ...orderForm, taka: e.target.value })} /></div>
          <div className="input-group"><label>Quantity (Meters)</label><input type="number" required placeholder="e.g. 5000" value={orderForm.qty} onChange={(e) => setOrderForm({ ...orderForm, qty: e.target.value })} /></div>
          <div className="input-group"><label>Rate per Meter (₹)</label><input type="number" step="0.01" required placeholder="e.g. 45.50" value={orderForm.rate} onChange={(e) => setOrderForm({ ...orderForm, rate: e.target.value })} /></div>
          <div className="input-group"><label>Brokerage (%)</label><input type="number" step="0.01" required value={orderForm.b_percent} onChange={(e) => setOrderForm({ ...orderForm, b_percent: e.target.value })} /></div>
          <div className="input-group"><label>Payment Days</label><input type="number" placeholder="e.g. 30" value={orderForm.terms} onChange={(e) => setOrderForm({ ...orderForm, terms: e.target.value })} /></div>
          <div className="input-group"><label>Remarks</label><input placeholder="Any special instruction" value={orderForm.remarks} onChange={(e) => setOrderForm({ ...orderForm, remarks: e.target.value })} /></div>
          <div className="form-actions"><button type="submit" className="btn btn-primary"><Plus size={16} /> Save Order</button></div>
        </form>
      </div>

      {/* ── Order Ledger ── */}
      <div className="panel">
        <div className="panel-header"><h2>Order Ledger</h2></div>
        <div className="table-container table-mobile-cards">
          <table>
            <thead>
              <tr>
                <th>Order No.</th><th>Date</th><th>Party</th><th>Quality</th>
                <th>Lot</th><th>Taka</th><th>Meters</th><th>Value</th><th>Brokerage</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td data-label="Order No."><strong>{o.no}</strong></td>
                  <td data-label="Date">{new Date(o.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                  <td data-label="Party">{o.party_name}</td>
                  <td data-label="Quality">{o.quality || '-'}</td>
                  <td data-label="Lot">{o.lot || '-'}</td>
                  <td data-label="Taka">{o.taka || '-'}</td>
                  <td data-label="Meters">{o.qty.toLocaleString('en-IN')}</td>
                  <td data-label="Value">{money(o.value)}</td>
                  <td data-label="Brokerage">{money(o.b_value)}</td>
                  <td data-label="Actions">
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button className="btn" style={{ padding: '6px 10px', background: '#f1f5f9', border: '1px solid #cbd5e1' }} onClick={() => setEditOrder(o)} aria-label="Edit order"><Edit2 size={13} className="text-secondary" /></button>
                      <button className="btn" style={{ padding: '6px 10px', background: '#fef2f2', border: '1px solid #fee2e2', color: '#ef4444' }} onClick={() => handleDeleteOrder(o.id)} aria-label="Delete order"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan="10" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No orders logged.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}