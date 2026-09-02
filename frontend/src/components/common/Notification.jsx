/**
 * components/common/Notification.jsx
 * Toast notification component — shows success/error messages.
 */
import React from 'react';
import { Check, Info } from 'lucide-react';

export default function Notification({ notification }) {
  if (!notification) return null;
  const isError = notification.type === 'error';

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      left: '20px',
      zIndex: 2000,
      background: isError ? '#ef4444' : '#10b981',
      color: 'white',
      padding: '14px 20px',
      borderRadius: '12px',
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
      animation: 'slideUp 0.3s ease',
      maxWidth: '480px',
      margin: '0 auto',
    }}>
      {isError ? <Info size={18} /> : <Check size={18} />}
      {notification.message}
    </div>
  );
}
