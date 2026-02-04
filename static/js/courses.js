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
            <button class="btn btn-sm btn-secondary btn-edit" data-id="${r.id}" data-auth-only data-roles="admin,teacher">Изменить</button>
            <button class="btn btn-sm btn-danger btn-delete" data-id="${r.id}" data-auth-only data-role="admin">Удалить</button>
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

  courseForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const teacherSelect = document.getElementById("teacherSelect");
    if (!teacherSelect.value) {
      alert("Выберите преподавателя");
      return;
    }

    const payload = Object.fromEntries(new FormData(courseForm).entries());

    payload.teacher_id = Number(payload.teacher_id);
    payload.duration = Number(payload.duration);

    try {
      await api.post("/courses/", payload);
      bsCourseModal?.hide();
      courseForm.reset();
      loadCourses();
    } catch (err) {
      console.error(err);
      alert(err.body?.detail?.[0]?.msg || "Ошибка сохранения курса");
    }
  });

  async function loadTeachers() {
    const select = document.getElementById("teacherSelect");

    try {
        const teachers = await api.get("/teachers/");

        teachers.forEach(t => {
            const option = document.createElement("option");
            option.value = t.id;

            if (t.user) {
                option.textContent = `${t.user.username} (${t.position || "преподаватель"})`;
            } else {
                option.textContent = `Преподаватель #${t.id}`;
            }

            select.appendChild(option);
        });

    } catch (err) {
        console.error("Ошибка загрузки преподавателей", err);
        alert("Не удалось загрузить список преподавателей");
    }
}

  refreshBtn?.addEventListener('click', loadCourses);
  loadCourses();
  loadTeachers();
});