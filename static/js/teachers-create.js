document.addEventListener('DOMContentLoaded', () => {
  const list = document.getElementById('teachers-list');
  const refreshBtn = document.getElementById('refresh-teachers');
  const createBtn = document.getElementById('create-teacher-btn');
  const modalEl = document.getElementById('teacherModal');
  const form = document.getElementById('teacher-form');
  const roleSelect = document.getElementById('teacher-role-select');
  const bsModal = new bootstrap.Modal(modalEl);

  async function loadTeachers() {
    list.innerHTML = '<tr><td colspan="3" class="text-center py-4">Загрузка...</td></tr>';
    try {
      const rows = await api.get('/teachers/');
      if (!Array.isArray(rows) || !rows.length) {
        list.innerHTML = '<tr><td colspan="3" class="text-center py-4">Нет данных</td></tr>';
        return;
      }
      list.innerHTML = rows.map(r => {
        const userDisplay = r.user ? `${r.user.username} (${r.user.email})` : `ID:${r.user_id}`;
        return `<tr><td>${r.first_name} ${r.last_name}</td><td>${r.qualification || '-'}</td><td>${userDisplay}</td></tr>`;
      }).join('');
    } catch (err) {
      list.innerHTML = `<tr><td colspan="3" class="text-danger">Ошибка: ${err.message || JSON.stringify(err)}</td></tr>`;
    }
  }

  async function loadRoles() {
    roleSelect.innerHTML = '<option value="">Загрузка...</option>';
    try {
      const roles = await api.get('/roles/');
      roleSelect.innerHTML = roles.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
    } catch (err) {
      roleSelect.innerHTML = '<option value="">Ошибка загрузки ролей</option>';
    }
  }

  createBtn.addEventListener('click', () => {
    loadRoles();
    bsModal.show();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(form).entries());
    payload.role_id = Number(payload.role_id);
    try {
      const res = await api.post('/teachers/', payload);
      bsModal.hide();
      await loadTeachers();
      alert('Преподаватель создан: ID ' + res.id);
    } catch (err) {
      alert('Ошибка: ' + (err.body?.detail || err.message || JSON.stringify(err)));
    }
  });

  refreshBtn.addEventListener('click', loadTeachers);
  loadTeachers();
});