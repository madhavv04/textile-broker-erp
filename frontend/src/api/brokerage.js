/**
 * api/brokerage.js
 * Brokerage summary API.
 */
import { apiFetch } from './client.js';

export const fetchBrokerage = async (token, onUnauthorized) => {
  const res = await apiFetch('/api/brokerage', {}, token, onUnauthorized);
  if (!res.ok) return [];
  return res.json();
};
