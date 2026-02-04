// schedule.js — Bootstrap modal + table rendering
document.addEventListener('DOMContentLoaded', () => {
  const listBody = document.getElementById('schedule-list');
  const refreshBtn = document.getElementById('refresh-schedule');
  const createBtn = document.getElementById('create-schedule');
  const printBtn = document.getElementById('print-schedule');
  const modalEl = document.getElementById('scheduleModal');
  const form = document.getElementById('schedule-form');
  const bsModal = modalEl ? new bootstrap.Modal(modalEl) : null;

  function rowHtml(s) {
    const start = new Date(s.start_date_time).toLocaleString();
    const end = new Date(s.end_date_time).toLocaleString();
    // duration may be returned; otherwise compute hours
    let duration = s.duration || ((new Date(s.end_date_time) - new Date(s.start_date_time)) / (1000*60*60));
    duration = Math.round((duration + Number.EPSILON) * 100) / 100;
    const courseTitle = s.course?.title || `ID:${s.course_id}`;
    return `<tr>
      <td>${courseTitle}</td>
      <td>${start}</td>
      <td>${end}</td>
      <td style="width:120px">${duration}</td>
    </tr>`;
  }

  async function load() {
    listBody.innerHTML = '<tr><td colspan="4" class="text-center py-4">Загрузка...</td></tr>';
    try {
      const data = await api.get('/schedule/');
      if (!Array.isArray(data) || data.length === 0) {
        listBody.innerHTML = '<tr><td colspan="4" class="text-center py-4">Нет записей</td></tr>';
        return;
      }
      listBody.innerHTML = data.map(rowHtml).join('');
    } catch (err) {
      listBody.innerHTML = `<tr><td colspan="4" class="text-danger">Ошибка: ${err.message || JSON.stringify(err)}</td></tr>`;
    }
  }

  refreshBtn.addEventListener('click', load);
  printBtn.addEventListener('click', () => window.print());

  if (createBtn && bsModal) {
    createBtn.addEventListener('click', () => bsModal.show());
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      // If creating requires auth, ensure user is authenticated
      try {
        if (!auth.isAuthenticated()) {
          alert('Требуется вход в систему');
          location.href = '/pages/login.html';
          return;
        }
      } catch (e) { /* ignore if auth not present */ }

      const fd = new FormData(form);
      const payload = {
        course_id: Number(fd.get('course_id')),
        start_date_time: new Date(fd.get('start_date_time')).toISOString(),
        end_date_time: new Date(fd.get('end_date_time')).toISOString()
      };
      try {
        await api.post('/schedule/', payload);
        if (bsModal) bsModal.hide();
        load();
      } catch (err) {
        alert('Ошибка: ' + (err.body?.detail || err.message || JSON.stringify(err)));
      }
    });
  }

  load();
});