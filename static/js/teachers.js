// static/js/teachers.js — list + create + edit/delete handlers
document.addEventListener('DOMContentLoaded', () => {
  const list = document.getElementById('teachers-list');
  const refreshBtn = document.getElementById('refresh-teachers');
  const createBtn = document.getElementById('create-teacher-btn');
  const modalEl = document.getElementById('teacherModal');
  const form = document.getElementById('teacher-form');
  const editModalEl = document.getElementById('teacherEditModal');
  const editForm = document.getElementById('teacher-edit-form');
  const bsModal = modalEl ? new bootstrap.Modal(modalEl) : null;
  const bsEditModal = editModalEl ? new bootstrap.Modal(editModalEl) : null;

  async function loadTeachers() {
    list.innerHTML = '<tr><td colspan="4" class="text-center py-4">Загрузка...</td></tr>';
    try {
      const rows = await api.get('/teachers/');
      if (!Array.isArray(rows) || !rows.length) {
        list.innerHTML = '<tr><td colspan="4" class="text-center py-4">Нет данных</td></tr>';
        // ensure uiAuth processes visibility
        window.uiAuth && window.uiAuth.updateAll && window.uiAuth.updateAll();
        return;
      }
      list.innerHTML = rows.map(r => {
        const userDisplay = r.user ? `${r.user.username} (${r.user.email})` : `ID:${r.user_id}`;
        const actions = `
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-secondary btn-edit" data-id="${r.id}" data-auth-only data-roles="Администратор,Преподаватель">Изменить</button>
            <button class="btn btn-sm btn-danger btn-delete" data-id="${r.id}" data-auth-only data-role="Администратор">Удалить</button>
          </div>`;
        return `<tr>
          <td>${r.first_name} ${r.last_name}</td>
          <td>${r.qualification || '-'}</td>
          <td>${userDisplay}</td>
          <td>${actions}</td>
        </tr>`;
      }).join('');

      // attach handlers for edit/delete after rendering
      document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = btn.getAttribute('data-id');
          try {
            const res = await api.get(`/teachers/${id}`);
            if (editForm) {
              editForm.elements['id'].value = res.id;
              editForm.elements['first_name'].value = res.first_name || '';
              editForm.elements['last_name'].value = res.last_name || '';
              editForm.elements['qualification'].value = res.qualification || '';
              editForm.elements['bio'].value = res.bio || '';
              bsEditModal?.show();
            }
          } catch (err) {
            alert('Ошибка загрузки преподавателя: ' + (err.body?.detail || err.message || JSON.stringify(err)));
          }
        });
      });

      document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = btn.getAttribute('data-id');
          if (!confirm('Удалить преподавателя?')) return;
          try {
            await api.del(`/teachers/${id}`);
            await loadTeachers();
          } catch (err) {
            alert('О��ибка удаления: ' + (err.body?.detail || err.message || JSON.stringify(err)));
          }
        });
      });

      // IMPORTANT: re-run ui-auth visibility after dynamic elements inserted
      window.uiAuth && window.uiAuth.updateAll && window.uiAuth.updateAll();

    } catch (err) {
      list.innerHTML = `<tr><td colspan="4" class="text-danger">Ошибка: ${err.message || JSON.stringify(err)}</td></tr>`;
      window.uiAuth && window.uiAuth.updateAll && window.uiAuth.updateAll();
    }
  }

  // create handler
  if (createBtn && form) {
    createBtn.addEventListener('click', () => {
      form.reset();
      bsModal?.show();
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = Object.fromEntries(new FormData(form).entries());
      payload.role_id = Number(payload.role_id);
      try {
        await api.post('/teachers/', payload);
        bsModal?.hide();
        loadTeachers();
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
        await api.patch(`/teachers/${id}`, data);
        bsEditModal?.hide();
        loadTeachers();
      } catch (err) {
        alert('Ошибка сохранения: ' + (err.body?.detail || err.message || JSON.stringify(err)));
      }
    });
  }

  refreshBtn?.addEventListener('click', loadTeachers);
  loadTeachers();
});