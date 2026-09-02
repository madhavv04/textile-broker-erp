/**
 * hooks/useAppData.js
 * Unified data-loading hook for all ERP entities.
 * Returns parties, orders, payments, brokerage, stats and a fetchData function.
 */
import { useState, useCallback } from 'react';
import { fetchDashboardStats } from '../api/dashboard.js';
import { fetchParties } from '../api/parties.js';
import { fetchOrders } from '../api/orders.js';
import { fetchPayments } from '../api/payments.js';
import { fetchBrokerage } from '../api/brokerage.js';

const DEFAULT_STATS = { order_count: 0, total_meters: 0, total_brokerage: 0, outstanding: 0 };

export function useAppData(token, onUnauthorized, showNotification) {
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [parties, setParties] = useState([]);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [brokerage, setBrokerage] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [statsData, partiesData, ordersData, paymentsData, brokerageData] = await Promise.all([
        fetchDashboardStats(token, onUnauthorized),
        fetchParties(token, onUnauthorized),
        fetchOrders(token, onUnauthorized),
        fetchPayments(token, onUnauthorized),
        fetchBrokerage(token, onUnauthorized),
      ]);
      if (statsData) setStats(statsData);
      setParties(partiesData);
      setOrders(ordersData);
      setPayments(paymentsData);
      setBrokerage(brokerageData);
    } catch (err) {
      if (err.message !== 'Unauthorized') {
        console.error('Error fetching data:', err);
        showNotification?.('Failed to connect to backend service', 'error');
      }
    } finally {
      setDataLoading(false);
    }
  }, [token, onUnauthorized, showNotification]);

  return {
    stats, setStats,
    parties, setParties,
    orders, setOrders,
    payments, setPayments,
    brokerage, setBrokerage,
    dataLoading,
    fetchData,
  };
}
