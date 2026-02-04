// static/js/ui-auth.js
// UI helper: role-aware nav control without diagnostic banner.
// Подключать ПОСЛЕ api.js и auth.js

(function () {
  // сразу скрываем элементы с data-auth-only по умолчанию, чтобы не мигали видимыми
  try {
    document.querySelectorAll('[data-auth-only]').forEach(el => {
      el.style.display = 'none';
    });
  } catch (e) { /* ignore */ }

  function norm(s) { if (s === null || s === undefined) return null; return String(s).trim().toLowerCase().replace(/\s+/g, ' '); }

  let _rolesCache = null;
  async function loadRolesOnce() {
    if (_rolesCache !== null) return _rolesCache;
    try {
      const rs = await window.api.get('/roles/');
      _rolesCache = Array.isArray(rs) ? rs : [];
    } catch (e) {
      _rolesCache = [];
    }
    return _rolesCache;
  }

  async function getUserInfo() {
    let u = null;
    if (window.auth && window.auth.fetchMe) {
      try { u = await window.auth.fetchMe(); } catch (e) { /* ignore */ }
    }
    if (!u && window.auth && window.auth.currentUser) {
      try { u = window.auth.currentUser(); } catch (e) { /* ignore */ }
    }
    return u || null;
  }

  const aliasGroups = {
    admin: { synonyms: ['admin','administrator','админ','администратор'], canonicalRu: 'Администратор' },
    teacher: { synonyms: ['teacher','instructor','lecturer','преподаватель'], canonicalRu: 'Преподаватель' },
    student: { synonyms: ['student','pupil','ученик','студент'], canonicalRu: 'Студент' }
  };

  async function computeUserRoleSet(user) {
    const set = new Set();
    if (!user) return set;

    if (user.raw) {
      const raw = user.raw;
      if (raw.role) {
        if (Array.isArray(raw.role)) raw.role.forEach(r => set.add(norm(r)));
        else set.add(norm(raw.role));
      }
      if (raw.roles && Array.isArray(raw.roles)) raw.roles.forEach(r => set.add(norm(r)));
      if (raw.role_name) set.add(norm(raw.role_name));
      if (raw.role_id || raw.roleId) set.add(String(raw.role_id || raw.roleId));
    }

    if (user.role) {
      if (typeof user.role === 'string') set.add(norm(user.role));
      else if (user.role && user.role.name) set.add(norm(user.role.name));
    }
    if (user.role_name) set.add(norm(user.role_name));
    if (user.roles && Array.isArray(user.roles)) user.roles.forEach(r => set.add(norm(r)));

    if (user.role_id !== undefined && user.role_id !== null) {
      set.add(String(user.role_id));
      try {
        const roles = await loadRolesOnce();
        const found = roles.find(x => Number(x.id) === Number(user.role_id));
        if (found && found.name) set.add(norm(found.name));
      } catch (e) { /* ignore */ }
    }

    try {
      const roles = await loadRolesOnce();
      for (const key of Object.keys(aliasGroups)) {
        const group = aliasGroups[key];
        const synNorms = group.synonyms.map(norm);
        const hasAlias = synNorms.some(syn => set.has(syn));
        if (hasAlias) {
          if (group.canonicalRu) set.add(norm(group.canonicalRu));
          for (const r of roles) {
            if (r && r.name && norm(r.name) === norm(group.canonicalRu)) set.add(norm(r.name));
          }
        }
      }
      roles && roles.forEach(r => { if (r && r.name) set.add(norm(r.name)); });
    } catch (e) { /* ignore */ }

    if (set.has(null)) set.delete(null);
    return set;
  }

  function findAuthContainer() {
    const authLink = document.getElementById('auth-link');
    if (authLink && authLink.parentElement) return authLink.parentElement;
    const navbarMsAuto = document.querySelector('.navbar .ms-auto');
    if (navbarMsAuto) return navbarMsAuto;
    return document.querySelector('.navbar .container') || document.querySelector('.navbar') || document.body;
  }

  function clearAuthControls() {
    document.querySelectorAll('.nav-auth-control').forEach(el => el.remove());
    const orig = document.getElementById('auth-link');
    if (orig) orig.remove();
  }

  function renderGuest(container) {
    clearAuthControls();
    const a = document.createElement('a');
    a.id='auth-link';
    a.className='btn btn-outline-primary nav-auth-control';
    a.href='/pages/login.html';
    a.textContent='Вход';
    const navList = container.querySelector('.navbar-nav');
    if (navList) {
      const li = document.createElement('li'); li.className='nav-item nav-auth-control';
      a.classList.add('nav-link'); li.appendChild(a); navList.appendChild(li);
    } else container.appendChild(a);
  }

  function renderAuthDropdown(container, user) {
    clearAuthControls();
    const wrapper = document.createElement('div'); wrapper.className='dropdown nav-auth-control'; wrapper.style.marginLeft='8px';
    const toggle = document.createElement('a');
    toggle.className='d-flex align-items-center text-decoration-none dropdown-toggle';
    toggle.href='#'; toggle.id='navAuthToggle'; toggle.setAttribute('data-bs-toggle','dropdown'); toggle.setAttribute('aria-expanded','false');
    // Prevent navigation on avatar click
    toggle.addEventListener('click', function(e){ e.preventDefault(); });

    const img = document.createElement('img'); img.id='nav-auth-avatar';
    img.src = (user && (user.photo_url || user.photo)) || '/assets/default-user.png'; img.width=36; img.height=36;
    img.className='rounded-circle me-2'; img.style.objectFit='cover'; img.onerror = ()=>{ img.src='/assets/default-user.png'; };
    const name = document.createElement('strong'); name.id='nav-auth-name';
    name.textContent = (user && (user.username || user.email || `User ${user.id}`)) || 'Профиль';
    toggle.appendChild(img); toggle.appendChild(name);

    const menu = document.createElement('ul'); menu.className='dropdown-menu dropdown-menu-end'; menu.setAttribute('aria-labelledby','navAuthToggle');
    const liProfile = document.createElement('li'); const aProfile = document.createElement('a');
    aProfile.className='dropdown-item'; aProfile.href='/pages/me.html'; aProfile.id='nav-profile-link'; aProfile.textContent='Профиль'; liProfile.appendChild(aProfile);
    const liDivider = document.createElement('li'); liDivider.innerHTML='<hr class="dropdown-divider">';
    const liLogout = document.createElement('li'); const btnLogout = document.createElement('button');
    btnLogout.className='dropdown-item'; btnLogout.id='nav-logout-btn'; btnLogout.type='button'; btnLogout.textContent='Выйти'; liLogout.appendChild(btnLogout);
    menu.appendChild(liProfile); menu.appendChild(liDivider); menu.appendChild(liLogout);

    wrapper.appendChild(toggle); wrapper.appendChild(menu);
    const navList = container.querySelector('.navbar-nav');
    if (navList) { const li = document.createElement('li'); li.className='nav-item dropdown nav-auth-control'; li.appendChild(toggle); li.appendChild(menu); navList.appendChild(li); }
    else container.appendChild(wrapper);

    btnLogout.addEventListener('click', ()=>{ if (window.auth && window.auth.logout) window.auth.logout(); location.reload(); });
  }

  async function updateAll() {
    const container = findAuthContainer();
    if (!container) return;
    const isAuth = !!(window.auth && window.auth.isAuthenticated && window.auth.isAuthenticated());
    document.querySelectorAll('[data-auth-only]').forEach(el=> el.style.display = isAuth ? '' : 'none');
    document.querySelectorAll('[data-guest-only]').forEach(el=> el.style.display = isAuth ? 'none' : '');

    if (!isAuth) {
      renderGuest(container);
      return;
    }

    const user = await getUserInfo();
    const rset = await computeUserRoleSet(user);
    renderAuthDropdown(container, user);

    document.querySelectorAll('[data-role], [data-roles]').forEach(el=>{
      const a = el.getAttribute('data-role'); const b = el.getAttribute('data-roles');
      const rolesAttr = a || b || '';
      const needed = rolesAttr.split(',').map(s=>s.trim()).filter(Boolean);
      if (needed.length === 0) return;
      let ok = false;
      for (const need of needed) {
        const nn = norm(need);
        if (rset.has(nn) || rset.has(String(need)) || rset.has(String(Number(need)))) { ok = true; break; }
      }
      el.style.display = ok ? '' : 'none';
    });
  }

  function attachLoginHandler() {
    const loginForm = document.getElementById('login-form');
    if (!loginForm || !window.auth || !window.auth.login) return;
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = loginForm.querySelector('button[type=submit]');
      try {
        const fd = new FormData(loginForm);
        const payload = { username: String(fd.get('username')||'').trim(), password: String(fd.get('password')||'') };
        if (!payload.username || !payload.password) { alert('Введите логин и пароль'); return; }
        if (submitBtn) submitBtn.disabled = true;
        await window.auth.login(payload, { path:'/users/login' });
        window.dispatchEvent(new Event('authChanged'));
        setTimeout(()=>location.href='/index.html', 250);
      } catch (err) {
        const message = err?.body?.detail || err?.message || JSON.stringify(err);
        alert('Ошибка входа: '+message);
      } finally { if (submitBtn) submitBtn.disabled = false; }
    });
  }

  function attachLogoutHandlers() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', ()=>{ window.auth.logout(); location.reload(); });
    document.querySelectorAll('[data-logout]').forEach(el=> el.addEventListener('click', ()=>{ window.auth.logout(); location.reload(); }));
  }

  // Expose helpers
  window.uiAuth = { updateAll, getUserInfo, loadRolesOnce, computeUserRoleSet };

  document.addEventListener('DOMContentLoaded', () => {
    // ensure auth-only hidden until updateAll runs
    document.querySelectorAll('[data-auth-only]').forEach(el => el.style.display = 'none');
    updateAll();
    attachLoginHandler();
    attachLogoutHandlers();
  });
})();