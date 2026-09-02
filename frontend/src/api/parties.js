/**
 * api/parties.js
 * Party CRUD API calls.
 */
import { apiFetch } from './client.js';

export const fetchParties = async (token, onUnauthorized) => {
  const res = await apiFetch('/api/parties', {}, token, onUnauthorized);
  if (!res.ok) return [];
  return res.json();
};

export const createParty = async (token, onUnauthorized, payload) => {
  const res = await apiFetch('/api/parties', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token, onUnauthorized);
  return { ok: res.ok, data: await res.json() };
};

export const updateParty = async (token, onUnauthorized, id, payload) => {
  const res = await apiFetch(`/api/parties/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }, token, onUnauthorized);
  return { ok: res.ok, data: await res.json() };
};

export const deleteParty = async (token, onUnauthorized, id) => {
  const res = await apiFetch(`/api/parties/${id}`, {
    method: 'DELETE',
  }, token, onUnauthorized);
  return { ok: res.ok };
};
