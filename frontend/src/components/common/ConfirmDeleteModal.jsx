/**
 * components/common/ConfirmDeleteModal.jsx
 * Confirmation dialog for destructive delete actions.
 */
import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import SwipeDismissModal from './SwipeDismissModal.jsx';

export default function ConfirmDeleteModal({ confirmDelete, onCancel }) {
  if (!confirmDelete) return null;

  return (
    <SwipeDismissModal onClose={onCancel} zIndex={300} maxWidth={420}>
      <div style={{ padding: '12px 8px 8px', textAlign: 'center' }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '50%',
          background: '#fef2f2', display: 'flex', alignItems: 'center',
          justifyContent: 'center', margin: '0 auto 16px',
        }}>
          <AlertTriangle size={28} color="#ef4444" />
        </div>
        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Confirm Deletion</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '28px', lineHeight: 1.6 }}>
          {confirmDelete.message}
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            id="cancel-delete-btn"
            className="btn"
            style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '10px 24px', fontWeight: 600 }}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            id="confirm-delete-btn"
            className="btn"
            style={{ background: '#ef4444', color: 'white', padding: '10px 24px', fontWeight: 600 }}
            onClick={() => { confirmDelete.onConfirm(); onCancel(); }}
          >
            <Trash2 size={15} /> Yes, Delete
          </button>
        </div>
      </div>
    </SwipeDismissModal>
  );
}
