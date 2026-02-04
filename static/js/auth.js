(function () {
  const STORAGE_KEY = 'access_token';

  function saveToken(token) {
    if (!token) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, token);
    }

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

  function decodeJwtPayload(token) {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return null;
      const payloadB64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const pad = payloadB64.length % 4;
      const padded = pad ? payloadB64 + '='.repeat(4 - pad) : payloadB64;
      const json = atob(padded);
      return JSON.parse(json);
    } catch (e) {
      return null;
    }
  }

  async function fetchMe() {
    try {
      if (!window.api || !window.auth) return null;

      const currentUser = auth.getUser();
      if (!currentUser || !currentUser.id) return null;

      const res = await window.api.get(`/users/${currentUser.id}`);
      if (!res.ok) return null;

      return await res.json();
    } catch (e) {
      return null;
    }
  }

  async function login(credentials, { path = '/users/login' } = {}) {
    const resp = await window.api.post(path, credentials);
    const token = resp?.access_token || resp?.token || resp?.data?.access_token || resp?.accessToken;
    if (!token) {
      throw new Error('Token not returned by server');
    }
    saveToken(token);
    return token;
  }

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

  window.dispatchEvent(new Event('authChanged'));
})();