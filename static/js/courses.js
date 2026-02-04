// static/js/courses.js — list + create + edit/delete handlers
document.addEventListener('DOMContentLoaded', () => {
  const list = document.getElementById('courses-list');
  const refreshBtn = document.getElementById('refresh-courses');
  const createBtn = document.getElementById('create-course');
  const courseForm = document.getElementById('course-form');
  const courseModalEl = document.getElementById('courseModal');
  const bsCourseModal = courseModalEl ? new bootstrap.Modal(courseModalEl) : null;

  async function loadCourses() {
    list.innerHTML = '<tr><td colspan="5" class="text-center py-4">Загрузка...</td></tr>';
    try {
      const rows = await api.get('/courses/');
      if (!Array.isArray(rows) || !rows.length) {
        list.innerHTML = '<tr><td colspan="5" class="text-center py-4">Нет данных</td></tr>';
        window.uiAuth && window.uiAuth.updateAll && window.uiAuth.updateAll();
        return;
      }
      list.innerHTML = rows.map(r => {
        const teacher = r.teacher ? `${r.teacher.first_name} ${r.teacher.last_name}` : (r.teacher_id ? `ID:${r.teacher_id}` : '-');
        const actions = `
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-secondary btn-edit" data-id="${r.id}" data-auth-only data-roles="Администратор,Преподаватель">Изменить</button>
            <button class="btn btn-sm btn-danger btn-delete" data-id="${r.id}" data-auth-only data-role="Администратор">Удалить</button>
          </div>`;
        return `<tr>
          <td>${r.title}</td>
          <td>${r.duration}</td>
          <td>${teacher}</td>
          <td>${r.description || '-'}</td>
          <td>${actions}</td>
        </tr>`;
      }).join('');

      document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          try {
            const res = await api.get(`/courses/${id}`);
            if (courseForm) {
              courseForm.elements['title'].value = res.title || '';
              courseForm.elements['description'].value = res.description || '';
              courseForm.elements['duration'].value = res.duration || '';
              courseForm.elements['teacher_id'].value = res.teacher_id || '';
              courseForm.dataset.courseId = id;
              bsCourseModal?.show();
            }
          } catch (err) {
            alert('Ошибка загрузки курса: ' + (err.body?.detail || err.message || JSON.stringify(err)));
          }
        });
      });

      document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          if (!confirm('Удалить курс?')) return;
          try {
            await api.del(`/courses/${id}`);
            await loadCourses();
          } catch (err) {
            alert('Ошибка удаления: ' + (err.body?.detail || err.message || JSON.stringify(err)));
          }
        });
      });

      // ensure visibility rules applied to newly added controls
      window.uiAuth && window.uiAuth.updateAll && window.uiAuth.updateAll();

    } catch (err) {
      list.innerHTML = `<tr><td colspan="5" class="text-danger">Ошибка: ${err.message || JSON.stringify(err)}</td></tr>`;
      window.uiAuth && window.uiAuth.updateAll && window.uiAuth.updateAll();
    }
  }

  if (createBtn) {
    createBtn.addEventListener('click', () => {
      if (courseForm) { courseForm.reset(); delete courseForm.dataset.courseId; }
      bsCourseModal?.show();
    });
  }

  if (courseForm) {
    courseForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = Object.fromEntries(new FormData(courseForm).entries());
      payload.duration = Number(payload.duration);
      try {
        if (courseForm.dataset.courseId) {
          await api.patch(`/courses/${courseForm.dataset.courseId}`, payload);
        } else {
          await api.post('/courses/', payload);
        }
        bsCourseModal?.hide();
        loadCourses();
      } catch (err) {
        alert('Ошибка сохранения: ' + (err.body?.detail || err.message || JSON.stringify(err)));
      }
    });
  }

  refreshBtn?.addEventListener('click', loadCourses);
  loadCourses();
});