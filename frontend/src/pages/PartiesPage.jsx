/**
 * pages/PartiesPage.jsx
 * Parties management — register, list, edit, delete.
 *
 * Mobile / WhatsApp field has a contact picker (dropdown) when the user
 * is Google-authenticated and has loaded contacts.
 *
 * IMPORTANT: Contact picker ONLY populates the mobile number.
 * Party Name is NEVER auto-filled. The user must enter it manually.
 */
import React, { useState, useRef } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import SwipeDismissModal from '../components/common/SwipeDismissModal.jsx';
import ContactPickerDropdown from '../components/contacts/ContactPickerDropdown.jsx';
import { createParty, updateParty, deleteParty } from '../api/parties.js';

export default function PartiesPage({
  token, onUnauthorized, showNotification, fetchData,
  parties, contacts, userProfile,
}) {
  const [partyForm, setPartyForm] = useState({
    name: '', mobile: '', terms: '',
    address: '', weaver_name: '', gst_number: '', quality_name: '',
  });
  const [editParty, setEditParty] = useState(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const pickerRef = useRef(null);

  // ── Add party ───────────────────────────────────────────────────────────────
  const handleAddParty = async (e) => {
    e.preventDefault();
    const { ok, data } = await createParty(token, onUnauthorized, {
      name: partyForm.name.trim(),
      mobile: partyForm.mobile.trim() || null,
      terms: partyForm.terms ? parseInt(partyForm.terms) : null,
      address: partyForm.address.trim() || null,
      weaver_name: partyForm.weaver_name.trim() || null,
      gst_number: partyForm.gst_number.trim() || null,
      quality_name: partyForm.quality_name.trim() || null,
    });
    if (ok) {
      showNotification('Party registered successfully!');
      setPartyForm({ name: '', mobile: '', terms: '', address: '', weaver_name: '', gst_number: '', quality_name: '' });
      setIsPickerOpen(false);
      fetchData();
    } else {
      showNotification(data?.detail || 'Error registering party', 'error');
    }
  };

  // ── Edit party ──────────────────────────────────────────────────────────────
  const handleUpdateParty = async (e) => {
    e.preventDefault();
    const { ok, data } = await updateParty(token, onUnauthorized, editParty.id, {
      name: editParty.name,
      mobile: editParty.mobile || null,
      terms: editParty.terms ? parseInt(editParty.terms) : null,
      address: editParty.address || null,
      weaver_name: editParty.weaver_name || null,
      gst_number: editParty.gst_number || null,
      quality_name: editParty.quality_name || null,
    });
    if (ok) {
      showNotification('Party details updated!');
      setEditParty(null);
      fetchData();
    } else {
      showNotification(data?.detail || 'Error updating party', 'error');
    }
  };

  // ── Delete party ────────────────────────────────────────────────────────────
  const handleDeleteParty = async (id) => {
    // Use window.confirm as a lightweight confirmation (full modal handled by parent)
    const { ok } = await deleteParty(token, onUnauthorized, id);
    if (ok) {
      showNotification('Party deleted successfully');
      fetchData();
    } else {
      showNotification('Error deleting party', 'error');
    }
  };

  const isGoogleUser = !!userProfile?.google_id;
  const hasContacts = contacts.length > 0;

  return (
    <div className="page-section">
      {/* ── Edit Modal ── */}
      {editParty && (
        <SwipeDismissModal onClose={() => setEditParty(null)} maxWidth={450}>
          <button
            onClick={() => setEditParty(null)}
            style={{ position: 'absolute', right: '20px', top: '20px', background: 'none', border: 'none', cursor: 'pointer' }}
            aria-label="Close"
          >
            <X size={20} className="text-secondary" />
          </button>
          <h2 style={{ marginBottom: '20px' }}><Edit2 size={18} /> Edit Party</h2>
          <form onSubmit={handleUpdateParty} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="input-group">
              <label>Party Name</label>
              <input
                required
                value={editParty.name}
                onChange={(e) => setEditParty({ ...editParty, name: e.target.value })}
              />
            </div>
            <div className="input-group">
              <label>Mobile / WhatsApp</label>
              <input
                value={editParty.mobile || ''}
                onChange={(e) => setEditParty({ ...editParty, mobile: e.target.value })}
              />
            </div>
            <div className="input-group">
              <label>Payment Terms (Days)</label>
              <input
                type="number"
                value={editParty.terms || ''}
                onChange={(e) => setEditParty({ ...editParty, terms: e.target.value })}
              />
            </div>
            <div className="input-group">
              <label>Address</label>
              <input
                value={editParty.address || ''}
                onChange={(e) => setEditParty({ ...editParty, address: e.target.value })}
              />
            </div>
            <div className="input-group">
              <label>Weaver Name</label>
              <input
                value={editParty.weaver_name || ''}
                onChange={(e) => setEditParty({ ...editParty, weaver_name: e.target.value })}
              />
            </div>
            <div className="input-group">
              <label>GST Number</label>
              <input
                value={editParty.gst_number || ''}
                onChange={(e) => setEditParty({ ...editParty, gst_number: e.target.value })}
              />
            </div>
            <div className="input-group">
              <label>Quality Name</label>
              <input
                value={editParty.quality_name || ''}
                onChange={(e) => setEditParty({ ...editParty, quality_name: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button type="button" className="btn" style={{ backgroundColor: '#f1f5f9' }} onClick={() => setEditParty(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">Save Changes</button>
            </div>
          </form>
        </SwipeDismissModal>
      )}

      {/* ── Register New Party ── */}
      <div className="panel">
        <div className="panel-header">
          <h2>Register New Party</h2>
        </div>
        <form onSubmit={handleAddParty} className="form-grid">
          {/* Party Name — manually entered, never auto-filled from contacts */}
          <div className="input-group">
            <label>Party Name</label>
            <input
              required
              placeholder="e.g. Vardhman Textiles"
              value={partyForm.name}
              onChange={(e) => setPartyForm({ ...partyForm, name: e.target.value })}
            />
          </div>

          {/* Mobile / WhatsApp — contact picker when Google-authenticated */}
          <div className="input-group" style={{ position: 'relative' }} ref={pickerRef}>
            <label>Mobile / WhatsApp</label>
            <div style={{ position: 'relative' }}>
              <input
                placeholder={isGoogleUser && hasContacts ? 'Search contact or enter phone... ▾' : 'e.g. +91 98765 43210'}
                value={partyForm.mobile || ''}
                onChange={(e) => {
                  setPartyForm({ ...partyForm, mobile: e.target.value });
                  if (isGoogleUser) setIsPickerOpen(true);
                }}
                onFocus={() => {
                  if (isGoogleUser && hasContacts) setIsPickerOpen(true);
                }}
              />
              {isGoogleUser && hasContacts && (
                <span
                  onClick={() => setIsPickerOpen((prev) => !prev)}
                  aria-hidden="true"
                  style={{
                    position: 'absolute', right: '12px', top: '50%',
                    transform: 'translateY(-50%)', cursor: 'pointer',
                    color: 'var(--text-secondary)', fontSize: '12px', userSelect: 'none',
                  }}
                >
                  ▼
                </span>
              )}
            </div>

            {/* Contact picker dropdown */}
            {isPickerOpen && isGoogleUser && hasContacts && (
              <ContactPickerDropdown
                contacts={contacts}
                searchValue={partyForm.mobile}
                onSelect={(phone) => {
                  // ONLY populate mobile — Party Name stays independent
                  setPartyForm((prev) => ({ ...prev, mobile: phone }));
                  setIsPickerOpen(false);
                }}
                onClose={() => setIsPickerOpen(false)}
              />
            )}
          </div>

          <div className="input-group">
            <label>Payment Terms (Days)</label>
            <input
              type="number"
              placeholder="e.g. 30"
              value={partyForm.terms}
              onChange={(e) => setPartyForm({ ...partyForm, terms: e.target.value })}
            />
          </div>

          <div className="input-group">
            <label>Address</label>
            <input
              placeholder="e.g. Ring Road, Surat"
              value={partyForm.address}
              onChange={(e) => setPartyForm({ ...partyForm, address: e.target.value })}
            />
          </div>

          <div className="input-group">
            <label>Weaver Name</label>
            <input
              placeholder="e.g. ABC Mill"
              value={partyForm.weaver_name}
              onChange={(e) => setPartyForm({ ...partyForm, weaver_name: e.target.value })}
            />
          </div>

          <div className="input-group">
            <label>GST Number</label>
            <input
              placeholder="e.g. 24ABCDE1234F1Z5"
              value={partyForm.gst_number}
              onChange={(e) => setPartyForm({ ...partyForm, gst_number: e.target.value })}
            />
          </div>

          <div className="input-group">
            <label>Quality Name</label>
            <input
              placeholder="e.g. Cotton 60x60"
              value={partyForm.quality_name}
              onChange={(e) => setPartyForm({ ...partyForm, quality_name: e.target.value })}
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary"><Plus size={16} /> Add Party</button>
          </div>
        </form>
      </div>

      {/* ── Parties List ── */}
      <div className="panel">
        <div className="panel-header">
          <h2>Registered Parties</h2>
        </div>
        <div className="table-container table-mobile-cards">
          <table>
            <thead>
              <tr>
                <th>Party Name</th>
                <th>Mobile</th>
                <th>Payment Terms</th>
                <th>Address</th>
                <th>Weaver Name</th>
                <th>GST Number</th>
                <th>Quality Name</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {parties.map((p) => (
                <tr key={p.id}>
                  <td data-label="Party Name"><strong>{p.name}</strong></td>
                  <td data-label="Mobile">{p.mobile || '-'}</td>
                  <td data-label="Payment Terms">{p.terms ? `${p.terms} days` : '-'}</td>
                  <td data-label="Address">{p.address || '-'}</td>
                  <td data-label="Weaver Name">{p.weaver_name || '-'}</td>
                  <td data-label="GST Number">{p.gst_number || '-'}</td>
                  <td data-label="Quality Name">{p.quality_name || '-'}</td>
                  <td data-label="Actions">
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button
                        className="btn"
                        style={{ padding: '6px 10px', background: '#f1f5f9', border: '1px solid #cbd5e1' }}
                        onClick={() => setEditParty(p)}
                        aria-label={`Edit ${p.name}`}
                      >
                        <Edit2 size={13} className="text-secondary" />
                      </button>
                      <button
                        className="btn"
                        style={{ padding: '6px 10px', background: '#fef2f2', border: '1px solid #fee2e2', color: '#ef4444' }}
                        onClick={() => handleDeleteParty(p.id)}
                        aria-label={`Delete ${p.name}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {parties.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No registered parties.
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