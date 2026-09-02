/**
 * App.jsx — Application root and composition layer.
 *
 * Responsibilities (only):
 *   1. Token/auth state management
 *   2. Google OAuth callback handling (detects ?code= in URL)
 *   3. User profile fetch on login
 *   4. Tab routing
 *   5. Data loading via useAppData hook
 *   6. Contacts state (shared between ContactsPage and PartiesPage picker)
 *   7. Compose layout: Sidebar + AppHeader + active page
 *
 * Does NOT contain:
 *   - Any page UI implementation
 *   - Any API calls directly
 *   - Any form logic
 *   - Any modal implementations
 */
import React, { useState, useEffect, useCallback } from 'react';

import { useNotification } from './hooks/useNotification.js';
import { useAppData } from './hooks/useAppData.js';
import { useSwipe } from './hooks/useSwipe.js';

import { fetchContacts } from './api/contacts.js';

import Notification from './components/common/Notification.jsx';
import Sidebar from './components/layout/Sidebar.jsx';
import AppHeader from './components/layout/AppHeader.jsx';

import DashboardPage from './pages/DashboardPage.jsx';
import ContactsPage from './pages/ContactsPage.jsx';
import PartiesPage from './pages/PartiesPage.jsx';
import OrdersPage from './pages/OrdersPage.jsx';
import PaymentsPage from './pages/PaymentsPage.jsx';
import BrokeragePage from './pages/BrokeragePage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';

const TABS = ['dashboard', 'contacts', 'parties', 'orders', 'payments', 'brokerage', 'reports'];

const todayDateStr = new Date().toLocaleDateString('en-IN', {
  weekday: 'long', day: '2-digit', month: 'short', year: 'numeric',
});

function App() {
  const [userProfile, setUserProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Contacts state — shared between ContactsPage and PartiesPage picker
  const [contacts, setContacts] = useState([]);

  const { notification, showNotification } = useNotification();

  // ── Data loading (no auth — server has no login) ───────────────────────────────
  const { stats, parties, orders, payments, brokerage, fetchData } = useAppData(
    null, () => {}, showNotification
  );

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Navigation ────────────────────────────────────────────────────────────────
  const navigateToTab = useCallback((tab) => {
    setActiveTab(tab);
    setIsMobileDrawerOpen(false);
  }, []);

  // Tab swipe navigation
  const goNext = useCallback(() => { const i = TABS.indexOf(activeTab); if (i < TABS.length - 1) setActiveTab(TABS[i + 1]); }, [activeTab]);
  const goPrev = useCallback(() => { const i = TABS.indexOf(activeTab); if (i > 0) setActiveTab(TABS[i - 1]); }, [activeTab]);
  const mainRef = useSwipe(goNext, goPrev, 60);

  const handleRefresh = useCallback(() => {
    fetchData();
    showNotification('Data synchronized with server!');
  }, [fetchData, showNotification]);

  const pageProps = { token: null, onUnauthorized: () => {}, showNotification, fetchData };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', maxWidth: '100%', minWidth: 0 }}>
      {/* Toast */}
      <Notification notification={notification} />

      {/* Sidebar / Mobile Drawer */}
      <Sidebar
        activeTab={activeTab}
        onNavigate={navigateToTab}
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
      />

      {/* Main Content */}
      <main className="main-content" ref={mainRef}>
        <AppHeader
          activeTab={activeTab}
          todayDateStr={todayDateStr}
          userProfile={userProfile}
          onHamburgerClick={() => setIsMobileDrawerOpen((prev) => !prev)}
          onRefresh={handleRefresh}

        />

        {activeTab === 'dashboard' && <DashboardPage stats={stats} orders={orders} />}
        {activeTab === 'contacts' && (
          <ContactsPage
            {...pageProps}
            userProfile={userProfile}

          />
        )}
        {activeTab === 'parties' && (
          <PartiesPage
            {...pageProps}
            parties={parties}
            contacts={contacts}
            userProfile={userProfile}
          />
        )}
        {activeTab === 'orders' && (
          <OrdersPage {...pageProps} orders={orders} parties={parties} />
        )}
        {activeTab === 'payments' && (
          <PaymentsPage {...pageProps} payments={payments} parties={parties} />
        )}
        {activeTab === 'brokerage' && <BrokeragePage brokerage={brokerage} />}
        {activeTab === 'reports' && (
          <ReportsPage stats={stats} orders={orders} payments={payments} brokerage={brokerage} />
        )}
      </main>
    </div>
  );
}

export default App;
