/**
 * api/sync.js
 * Multi-Device Contact Synchronization API
 */
import { apiFetch } from './client.js';

export const registerDevice = async (deviceIdentifier, platform, token, onUnauthorized) => {
  try {
    const res = await apiFetch('/api/devices', {
      method: 'POST',
      body: JSON.stringify({ device_identifier: deviceIdentifier, platform }),
    }, token, onUnauthorized);
    if (res.ok) {
      return { ok: true, data: await res.json() };
    }
    return { ok: false, detail: (await res.json()).detail || 'Failed to register device' };
  } catch (err) {
    if (err.message === 'Unauthorized') throw err;
    return { ok: false, detail: 'Connection error' };
  }
};

export const syncContactsWithServer = async (lastSyncVersion, deviceIdentifier, changes, token, onUnauthorized) => {
  try {
    const res = await apiFetch('/api/contacts/sync', {
      method: 'POST',
      body: JSON.stringify({
        last_sync_version: lastSyncVersion,
        device_identifier: deviceIdentifier,
        changes
      }),
    }, token, onUnauthorized);
    if (res.ok) {
      return { ok: true, data: await res.json() };
    }
    return { ok: false, detail: (await res.json()).detail || 'Failed to sync' };
  } catch (err) {
    if (err.message === 'Unauthorized') throw err;
    return { ok: false, detail: 'Connection error' };
  }
};

export const fetchContacts = async (token, onUnauthorized) => {
  try {
    const res = await apiFetch('/api/contacts', {}, token, onUnauthorized);
    if (res.ok) {
      return { ok: true, data: await res.json() };
    }
    return { ok: false, detail: (await res.json()).detail || 'Failed to fetch' };
  } catch (err) {
    if (err.message === 'Unauthorized') throw err;
    return { ok: false, detail: 'Connection error' };
  }
};
