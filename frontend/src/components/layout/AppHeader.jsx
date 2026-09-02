/**
 * components/layout/AppHeader.jsx
 * Top application header — hamburger (mobile), page title, user profile, logout.
 */
import React from 'react';
import { RefreshCw, CircleUser, LogOut } from 'lucide-react';

export default function AppHeader({
  activeTab,
  todayDateStr,
  userProfile,
  onHamburgerClick,
  onRefresh,
  onLogout,
}) {
  const pageTitle = activeTab.charAt(0).toUpperCase() + activeTab.slice(1);

  return (
    <header className="top-header">
      {/* Hamburger — visible on mobile only (CSS-controlled) */}
      <button
        type="button"
        className="hamburger-btn"
        onClick={onHamburgerClick}
        aria-label="Open navigation menu"
        aria-expanded={false}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-primary)', display: 'none',
          alignItems: 'center', justifyContent: 'center', padding: '6px',
        }}
      >
        <span style={{ fontSize: '24px', lineHeight: 1 }}>☰</span>
      </button>

      {/* Page title + date */}
      <div className="header-title">
        <h1>{pageTitle}</h1>
        <p className="subtitle">{todayDateStr}</p>
      </div>

      {/* Right-side actions */}
      <div
        className="header-actions"
        style={{
          display: 'flex', gap: '10px', alignItems: 'center',
          flexWrap: 'wrap', minWidth: 0, maxWidth: '100%',
        }}
      >
        <button
          className="btn"
          onClick={onRefresh}
          aria-label="Refresh data"
          style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '10px 14px' }}
        >
          <RefreshCw size={16} className="text-secondary" />
        </button>

        <div className="user-profile">
          <CircleUser className="profile-icon" />
          <span className="user-name">
            {userProfile?.full_name || userProfile?.username || 'Broker Portal'}
          </span>
        </div>

        <button
          className="btn"
          onClick={onLogout}
          aria-label="Logout"
          style={{ background: '#fef2f2', border: '1px solid #fee2e2', padding: '10px 14px', color: '#ef4444' }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
