/**
 * api/orders.js
 * Order CRUD API calls.
 */
import { apiFetch } from './client.js';

export const fetchOrders = async (token, onUnauthorized) => {
  const res = await apiFetch('/api/orders', {}, token, onUnauthorized);
  if (!res.ok) return [];
  return res.json();
};

export const createOrder = async (token, onUnauthorized, payload) => {
  const res = await apiFetch('/api/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token, onUnauthorized);
  return { ok: res.ok, data: await res.json() };
};

export const updateOrder = async (token, onUnauthorized, id, payload) => {
  const res = await apiFetch(`/api/orders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }, token, onUnauthorized);
  return { ok: res.ok, data: await res.json() };
};

export const deleteOrder = async (token, onUnauthorized, id) => {
  const res = await apiFetch(`/api/orders/${id}`, {
    method: 'DELETE',
  }, token, onUnauthorized);
  return { ok: res.ok };
};
