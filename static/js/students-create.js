document.addEventListener('DOMContentLoaded', () => {
  const list = document.getElementById('students-list');
  const refreshBtn = document.getElementById('refresh-students');
  const createBtn = document.getElementById('create-student-btn');
  const modalEl = document.getElementById('studentModal');
  const form = document.getElementById('student-form');
  const roleSelect = document.getElementById('student-role-select');
  const bsModal = new bootstrap.Modal(modalEl);

  async function loadStudents() {
    list.innerHTML = '<tr><td colspan="4" class="text-center py-4">Загрузка...</td></tr>';
    try {
      const rows = await api.get('/students/');
      if (!Array.isArray(rows) || !rows.length) {
        list.innerHTML = '<tr><td colspan="4" class="text-center py-4">Нет данных</td></tr>';
        return;
      }
      list.innerHTML = rows.map(r => {
        const photo = r.user?.photo_url || '/assets/default-user.png';
        const userDisplay = r.user ? `${r.user.username} (${r.user.email})` : `ID:${r.user_id}`;
        return `<tr>
          <td><img src="${photo}" style="width:48px;height:48px;object-fit:cover" class="rounded" onerror="this.src='/assets/default-user.png'"></td>
          <td>${r.first_name} ${r.last_name}</td>
          <td>${r.group_number || '-'}</td>
          <td>${userDisplay}</td>
        </tr>`;
      }).join('');
    } catch (err) {
      list.innerHTML = `<tr><td colspan="4" class="text-danger">Ошибка: ${err.message || JSON.stringify(err)}</td></tr>`;
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
    // ensure role_id numeric
    payload.role_id = Number(payload.role_id);
    try {
      const res = await api.post('/students/', payload);
      bsModal.hide();
      await loadStudents();
      alert('Студент создан: ID ' + res.id);
    } catch (err) {
      alert('Ошибка: ' + (err.body?.detail || err.message || JSON.stringify(err)));
    }
  });

  refreshBtn.addEventListener('click', loadStudents);
  loadStudents();
});