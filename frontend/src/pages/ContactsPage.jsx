import React, { useState, useEffect } from 'react';
import { Users, RefreshCw, Plus, Edit, Trash2, Smartphone } from 'lucide-react';
import { fetchContacts, syncContactsWithServer, registerDevice } from '../api/sync.js';

export default function ContactsPage({ token, userProfile, onUnauthorized, showNotification }) {
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  
  // Device registration
  const [deviceId, setDeviceId] = useState(localStorage.getItem('deviceId') || '');

  useEffect(() => {
    if (!deviceId) {
      const newId = 'web-' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('deviceId', newId);
      setDeviceId(newId);
    }
  }, [deviceId]);

  const loadContacts = async () => {
    setLoading(true);
    const result = await fetchContacts(token, onUnauthorized);
    if (result.ok) {
      setContacts(result.data);
    } else {
      showNotification?.(result.detail || 'Failed to load contacts', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadContacts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSync = async () => {
    if (!deviceId) return;
    setSyncing(true);
    
    // Register device first
    await registerDevice(deviceId, 'web', token, onUnauthorized);
    
    // In a full implementation, we'd pull pending changes from IndexedDB/localStorage.
    // For this simple version, we'll just push an empty changes list to get server updates.
    // Real implementation would track local changes in a queue.
    const lastSyncVersion = parseInt(localStorage.getItem('lastSyncVersion') || '0', 10);
    
    const result = await syncContactsWithServer(lastSyncVersion, deviceId, [], token, onUnauthorized);
    
    if (result.ok) {
      localStorage.setItem('lastSyncVersion', result.data.server_version);
      showNotification?.('Contacts synchronized successfully', 'success');
      loadContacts(); // reload all active
    } else {
      showNotification?.(result.detail || 'Sync failed', 'error');
    }
    setSyncing(false);
  };

  const filtered = contacts.filter((c) => {
    const term = search.toLowerCase().trim();
    if (!term) return true;
    const matchesName = (c.name || '').toLowerCase().includes(term);
    return matchesName;
  });

  return (
    <div className="page-section">
      <div className="panel">
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Contacts (Multi-Device Sync)</h2>
          <button
            className="btn"
            onClick={handleSync}
            disabled={syncing || loading}
            aria-label="Sync contacts"
            style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '8px 12px', fontSize: '13px' }}
          >
            <RefreshCw size={14} className={syncing ? 'spin' : ''} /> Sync
          </button>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: '12px 16px', fontSize: '14px', width: '100%', maxWidth: '400px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
          />
        </div>

        <div
          className="table-container table-mobile-cards"
          style={{
            maxHeight: '600px', overflowY: 'auto',
            border: '1px solid var(--border-color)', borderRadius: '12px',
          }}
        >
          <table>
            <thead>
              <tr>
                <th>Contact Name</th>
                <th>Phone Number(s)</th>
                <th>Sync Ver</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '30px' }}>
                    {contacts.length === 0 ? 'No contacts found. Use a mobile app to sync contacts to this account.' : 'No contacts match your search.'}
                  </td>
                </tr>
              ) : (
                filtered.map((c, idx) => (
                  <tr key={c.id || idx}>
                    <td data-label="Contact Name"><strong>{c.name || `${c.first_name || ''} ${c.last_name || ''}`}</strong></td>
                    <td data-label="Phone Number(s)">
                      {(c.phone_numbers || []).length > 0 ? (
                        c.phone_numbers.map((phone, pIdx) => (
                          <span key={pIdx} style={{ display: 'block' }}>{phone.value || phone}</span>
                        ))
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>No phone number</span>
                      )}
                    </td>
                    <td data-label="Sync Ver">{c.sync_version}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
