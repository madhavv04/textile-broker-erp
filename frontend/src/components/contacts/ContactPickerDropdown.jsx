/**
 * components/contacts/ContactPickerDropdown.jsx
 * Reusable contact picker dropdown for the Parties form.
 *
 * IMPORTANT: selecting a contact ONLY populates the mobile/phone number.
 * Party Name is NEVER auto-populated. The user must enter it manually.
 *
 * Handles multiple phone numbers per contact by showing each as a separate item.
 */
import React, { useRef, useEffect } from 'react';

export default function ContactPickerDropdown({
  contacts,
  searchValue,
  onSelect,
  onClose,
}) {
  const dropdownRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Flatten contacts into individual phone entries for easy matching
  const query = (searchValue || '').toLowerCase().trim();
  const allOptions = contacts.flatMap((c) =>
    (c.phones || []).map((phone) => ({ name: c.name, phone }))
  );

  const filtered = allOptions.filter((item) => {
    if (!query) return true;
    return item.name.toLowerCase().includes(query) || item.phone.includes(query);
  });

  return (
    <div
      ref={dropdownRef}
      className="contact-picker-dropdown"
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: '#ffffff',
        border: '1px solid var(--border-color)',
        borderRadius: '10px',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 1000,
        maxHeight: '260px',
        overflowY: 'auto',
        marginTop: '4px',
      }}
    >
      {filtered.length === 0 ? (
        <div style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center' }}>
          No matching contacts
        </div>
      ) : (
        filtered.map((item, idx) => (
          <button
            key={idx}
            type="button"
            className="contact-picker-item"
            onClick={() => {
              // ONLY populate phone number — never auto-fill party name
              onSelect(item.phone);
              onClose();
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              padding: '10px 16px',
              cursor: 'pointer',
              borderBottom: idx < filtered.length - 1 ? '1px solid #f1f5f9' : 'none',
              transition: 'background 0.15s ease',
              width: '100%',
              background: 'none',
              border: 'none',
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {item.name}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
              {item.phone}
            </span>
          </button>
        ))
      )}
    </div>
  );
}
