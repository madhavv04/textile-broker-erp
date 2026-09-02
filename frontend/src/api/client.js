/**
 * api/client.js
 * Base HTTP client — injects auth headers, handles 401 auto-logout.
 * All API modules import from here.
 */

/**
 * Build authorization headers for authenticated requests.
 * @param {string} token - JWT bearer token
 */
export const authHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
});

/**
 * Fetch wrapper that automatically:
 *  - injects Authorization header
 *  - calls onUnauthorized when the server returns 401
 * @param {string} url
 * @param {object} options - fetch options
 * @param {string} token - JWT token
 * @param {function} onUnauthorized - called on 401 (e.g. logout handler)
 */
export const apiFetch = async (url, options = {}, token = '', onUnauthorized = null) => {
  const headers = {
    ...authHeaders(token),
    ...(options.headers || {}),
  };
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    if (onUnauthorized) onUnauthorized();
    throw new Error('Unauthorized');
  }
  return res;
};
