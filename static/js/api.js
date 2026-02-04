(function () {
  const API_BASE = '';

  function getToken() { return localStorage.getItem('access_token') || null; }

  function buildHeaders(extraHeaders = {}) {
    const headers = Object.assign({}, extraHeaders);
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!headers['Content-Type'] && !(headers._skipJsonContentType)) headers['Content-Type'] = 'application/json';
    return headers;
  }

  async function parseBody(resp) {
    const ct = (resp.headers.get('content-type') || '').toLowerCase();
    try {
      if (ct.includes('application/json') || ct.includes('+json')) return await resp.json();
      return await resp.text();
    } catch (e) {
      return null;
    }
  }

  async function handleResponse(resp) {
    const body = await parseBody(resp);

    if (!resp.ok) {
      let message = resp.statusText || `HTTP ${resp.status}`;
      if (body !== null && body !== undefined) {
        if (typeof body === 'string' && body.trim()) {
          message = body;
        } else if (typeof body === 'object') {
          // try common fields then fallback to JSON
          if (body.detail) message = String(body.detail);
          else if (body.message) message = String(body.message);
          else {
            try { message = JSON.stringify(body); } catch { message = String(body); }
          }
        } else {
          message = String(body);
        }
      }
      const err = new Error(message);
      err.status = resp.status;
      err.body = body;
      err.raw = { status: resp.status, headers: Array.from(resp.headers.entries()) };
      throw err;
    }
    return body;
  }

  async function request(method, path, { params = null, body = null, headers = {} } = {}) {
    let url = API_BASE + path;
    if (params && typeof params === 'object') {
      const search = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v === undefined || v === null) continue;
        search.append(k, String(v));
      }
      const qs = search.toString();
      if (qs) url += (url.includes('?') ? '&' : '?') + qs;
    }

    const finalHeaders = buildHeaders(headers);
    const opts = { method, headers: finalHeaders };

    if (body !== null) {
      if (body instanceof FormData) {
        delete opts.headers['Content-Type'];
        opts.body = body;
      } else if (typeof body === 'object') {
        opts.body = JSON.stringify(body);
      } else {
        opts.body = body;
      }
    }

    let resp;
    try {
      resp = await fetch(url, opts);
    } catch (networkErr) {
      const err = new Error(networkErr.message || 'Network error');
      err.status = 0; err.body = null;
      throw err;
    }
    return handleResponse(resp);
  }

  window.api = {
    get: (p, o) => request('GET', p, o),
    post: (p, b, o = {}) => request('POST', p, Object.assign({}, o, { body: b })),
    put: (p, b, o = {}) => request('PUT', p, Object.assign({}, o, { body: b })),
    patch: (p, b, o = {}) => request('PATCH', p, Object.assign({}, o, { body: b })),
    del: (p, o) => request('DELETE', p, o),
    upload: async (p, formData, o = {}) => {
      const headers = Object.assign({}, o.headers || {}, { _skipJsonContentType: true });
      return request('POST', p, Object.assign({}, o, { body: formData, headers }));
    },
    getToken: () => localStorage.getItem('access_token') || null
  };
})();