/**
 * api/payments.js
 * Payment CRUD API calls.
 */
import { apiFetch } from './client.js';

export const fetchPayments = async (token, onUnauthorized) => {
  const res = await apiFetch('/api/payments', {}, token, onUnauthorized);
  if (!res.ok) return [];
  return res.json();
};

export const createPayment = async (token, onUnauthorized, payload) => {
  const res = await apiFetch('/api/payments', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token, onUnauthorized);
  return { ok: res.ok, data: await res.json() };
};

export const updatePayment = async (token, onUnauthorized, id, payload) => {
  const res = await apiFetch(`/api/payments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }, token, onUnauthorized);
  return { ok: res.ok, data: await res.json() };
};

export const deletePayment = async (token, onUnauthorized, id) => {
  const res = await apiFetch(`/api/payments/${id}`, {
    method: 'DELETE',
  }, token, onUnauthorized);
  return { ok: res.ok };
};
