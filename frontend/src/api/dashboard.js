/**
 * api/dashboard.js
 * Dashboard stats API.
 */
import { apiFetch } from './client.js';

export const fetchDashboardStats = async (token, onUnauthorized) => {
  const res = await apiFetch('/api/dashboard/stats', {}, token, onUnauthorized);
  if (!res.ok) return null;
  return res.json();
};
