/**
 * components/layout/Sidebar.jsx
 * Desktop sidebar (fixed left) + mobile left drawer.
 * NO bottom navigation bar.
 *
 * Mobile behavior:
 *   - Hidden off-screen (left: -260px) by default
 *   - Slides in when `isOpen` is true
 *   - Hamburger button shown in AppHeader
 *   - Backdrop rendered here when open
 */
import React from 'react';
import {
  LayoutDashboard, Handshake, ShoppingCart,
  FileText, Calculator, PieChart, Users, Layers, X,
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard',  Icon: LayoutDashboard },
  { id: 'contacts',  label: 'Contacts',   Icon: Users },
  { id: 'parties',   label: 'Parties',    Icon: Handshake },
  { id: 'orders',    label: 'Orders',     Icon: ShoppingCart },
  { id: 'payments',  label: 'Payments',   Icon: FileText },
  { id: 'brokerage', label: 'Brokerage',  Icon: Calculator },
  { id: 'reports',   label: 'Reports',    Icon: PieChart },
];

export default function Sidebar({ activeTab, onNavigate, isOpen, onClose }) {
  return (
    <>
      {/* Backdrop — mobile only, shown when drawer is open */}
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          style={{
            position: 'fixed', top: 0, left: 0,
            width: '100vw', height: '100vh',
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 99,
          }}
        />
      )}

      {/* Sidebar / Drawer */}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Logo row */}
        <div
          className="logo"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Layers className="logo-icon" size={24} />
            <span>TEXTILE</span>
          </div>
          {/* Close button — visible only on mobile inside open drawer */}
          <button
            type="button"
            className="mobile-only-close-btn"
            onClick={onClose}
            aria-label="Close navigation menu"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'none' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="nav-links">
          {NAV_ITEMS.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`nav-btn ${activeTab === id ? 'active' : ''}`}
              onClick={() => onNavigate(id)}
              aria-current={activeTab === id ? 'page' : undefined}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
}
