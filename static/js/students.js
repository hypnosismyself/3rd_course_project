// static/js/students.js — list + create + edit/delete handlers (role-aware)
document.addEventListener('DOMContentLoaded', () => {
  const list = document.getElementById('students-list');
  const refreshBtn = document.getElementById('refresh-students');
  const createBtn = document.getElementById('create-student-btn');
  const modalEl = document.getElementById('studentModal');
  const form = document.getElementById('student-form');
  const editModalEl = document.getElementById('studentEditModal');
  const editForm = document.getElementById('student-edit-form');
  const bsModal = modalEl ? new bootstrap.Modal(modalEl) : null;
  const bsEditModal = editModalEl ? new bootstrap.Modal(editModalEl) : null;
  const roleSelect = document.getElementById('student-role-select');

  async function loadRoles() {
    if (!roleSelect) return;
    roleSelect.innerHTML = '<option value="">Загрузка...</option>';
    try {
      const roles = await api.get('/roles/');
      roleSelect.innerHTML = roles.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
    } catch (err) {
      roleSelect.innerHTML = '<option value="">Ошибка загрузки ролей</option>';
    }
  }

  async function loadStudents() {
    list.innerHTML = '<tr><td colspan="5" class="text-center py-4">Загрузка...</td></tr>';
    try {
      const rows = await api.get('/students/');
      if (!Array.isArray(rows) || !rows.length) {
        list.innerHTML = '<tr><td colspan="5" class="text-center py-4">Нет данных</td></tr>';
        window.uiAuth && window.uiAuth.updateAll && window.uiAuth.updateAll();
        return;
      }
      list.innerHTML = rows.map(r => {
        const photo = r.user?.photo_url || '/assets/default-user.png';
        const userDisplay = r.user ? `${r.user.username} (${r.user.email})` : `ID:${r.user_id}`;
        const actions = `
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-secondary btn-edit" data-id="${r.id}" data-auth-only data-roles="Администратор,Преподаватель">Изменить</button>
            <button class="btn btn-sm btn-danger btn-delete" data-id="${r.id}" data-auth-only data-role="Администратор">Удалить</button>
          </div>`;
        return `<tr>
          <td><img src="${photo}" style="width:48px;height:48px;object-fit:cover" class="rounded" onerror="this.src='/assets/default-user.png'"></td>
          <td>${r.first_name} ${r.last_name}</td>
          <td>${r.group_number || '-'}</td>
          <td>${userDisplay}</td>
          <td>${actions}</td>
        </tr>`;
      }).join('');

      // attach handlers after render
      document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          try {
            const res = await api.get(`/students/${id}`);
            if (editForm) {
              editForm.elements['id'].value = res.id;
              editForm.elements['first_name'].value = res.first_name || '';
              editForm.elements['last_name'].value = res.last_name || '';
              editForm.elements['group_number'].value = res.group_number || '';
              bsEditModal?.show();
            }
          } catch (err) {
            alert('Ошибка загрузки студента: ' + (err.body?.detail || err.message || JSON.stringify(err)));
          }
        });
      });

      document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          if (!confirm('Удалить студента?')) return;
          try {
            await api.del(`/students/${id}`);
            await loadStudents();
          } catch (err) {
            alert('Ошибка удаления: ' + (err.body?.detail || err.message || JSON.stringify(err)));
          }
        });
      });

      // re-run visibility checks for newly added controls
      window.uiAuth && window.uiAuth.updateAll && window.uiAuth.updateAll();

    } catch (err) {
      list.innerHTML = `<tr><td colspan="5" class="text-danger">Ошибка: ${err.message || JSON.stringify(err)}</td></tr>`;
      window.uiAuth && window.uiAuth.updateAll && window.uiAuth.updateAll();
    }
  }

  if (createBtn && form) {
    createBtn.addEventListener('click', async () => {
      form.reset();
      await loadRoles();
      bsModal?.show();
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = Object.fromEntries(new FormData(form).entries());
      payload.role_id = Number(payload.role_id);
      try {
        await api.post('/students/', payload);
        bsModal?.hide();
        await loadStudents();
      } catch (err) {
        alert('Ошибка: ' + (err.body?.detail || err.message || JSON.stringify(err)));
      }
    });
  }

  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(editForm).entries());
      const id = data.id;
      delete data.id;
      try {
        await api.patch(`/students/${id}`, data);
        bsEditModal?.hide();
        await loadStudents();
      } catch (err) {
        alert('Ошибка сохранения: ' + (err.body?.detail || err.message || JSON.stringify(err)));
      }
    });
  }

  refreshBtn?.addEventListener('click', loadStudents);
  loadStudents();
});