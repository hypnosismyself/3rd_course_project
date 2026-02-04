// static/js/auth.js
// Простая клиентская утилита для хранения токена и работы с текущим пользователем.
// Сохраняет токен в localStorage под ключом 'access_token'.
// Поддерживает простую декодировку JWT payload (если токен — JWT).
// Генерирует событие window.dispatchEvent(new Event('authChanged')) при смене статуса.

(function () {
  const STORAGE_KEY = 'access_token';

  function saveToken(token) {
    if (!token) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, token);
    }
    // notify UI
    window.dispatchEvent(new Event('authChanged'));
  }

  function getToken() {
    return localStorage.getItem(STORAGE_KEY);
  }

  function logout() {
    saveToken(null);
  }

  function isAuthenticated() {
    const t = getToken();
    if (!t) return false;
    // Optionally check expiry if JWT
    const payload = decodeJwtPayload(t);
    if (!payload) return true;
    if (payload.exp) {
      const now = Math.floor(Date.now() / 1000);
      return payload.exp > now;
    }
    return true;
  }

  function currentUser() {
    const t = getToken();
    if (!t) return null;
    const payload = decodeJwtPayload(t);
    if (payload) {
      // Map common claims
      return {
        id: payload.sub || payload.user_id || payload.id || null,
        username: payload.username || payload.sub || null,
        email: payload.email || null,
        role: payload.role || payload.roles || null,
        raw: payload
      };
    }
    return null;
  }

  // Basic JWT payload decoder (no verification) — returns JSON payload or null
  function decodeJwtPayload(token) {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return null;
      const payloadB64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      // pad
      const pad = payloadB64.length % 4;
      const padded = pad ? payloadB64 + '='.repeat(4 - pad) : payloadB64;
      const json = atob(padded);
      return JSON.parse(json);
    } catch (e) {
      return null;
    }
  }

  // Try to fetch current user from /users/me if backend provides such endpoint.
  // Returns promise that resolves to user object or null.
  async function fetchMe() {
    try {
      // Use global api wrapper so Authorization header is included automatically
      if (!window.api) return null;
      const me = await window.api.get('/users/me');
      return me;
    } catch (e) {
      return null;
    }
  }

  // Login convenience: perform POST to login endpoint and save token if returned.
  // This function assumes server returns { access_token: '...', token: '...', ... } or similar.
  async function login(credentials, { path = '/users/login' } = {}) {
    const resp = await window.api.post(path, credentials);
    // try common token fields
    const token = resp?.access_token || resp?.token || resp?.data?.access_token || resp?.accessToken;
    if (!token) {
      // If server returned user object but not token, caller must handle (or call /users/me)
      throw new Error('Token not returned by server');
    }
    saveToken(token);
    return token;
  }

  // Expose globally
  window.auth = {
    saveToken,
    getToken,
    logout,
    isAuthenticated,
    currentUser,
    decodeJwtPayload,
    fetchMe,
    login
  };

  // dispatch initial authChanged on script load so UI can react
  window.dispatchEvent(new Event('authChanged'));
})();