/**
 * api/contacts.js
 * Google Contacts API — fetches the authenticated user's own contacts.
 * Contacts are user-scoped on the backend; never exposes other users' contacts.
 */
import { apiFetch } from './client.js';

/**
 * Fetch the current user's Google contacts.
 * @param {string} token - app JWT token
 * @param {function} onUnauthorized - logout callback
 * @returns {Promise<{ok: boolean, data?: Array, detail?: string}>}
 */
export const fetchContacts = async (token, onUnauthorized) => {
  try {
    const res = await apiFetch('/api/contacts', {}, token, onUnauthorized);
    if (res.ok) {
      const data = await res.json();
      return { ok: true, data };
    }
    const err = await res.json();
    return { ok: false, detail: err.detail || 'Failed to load Google Contacts.' };
  } catch (err) {
    if (err.message === 'Unauthorized') throw err;
    return { ok: false, detail: 'Connection error. Failed to load Google Contacts.' };
  }
};
