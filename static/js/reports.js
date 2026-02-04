// reports.js — запрашиваем отчёт и рисуем график Chart.js
document.addEventListener('DOMContentLoaded', () => {
  const out = document.getElementById('report-json');
  const chartEl = document.getElementById('performance-chart');
  let chart = null;

  async function drawPerformance(courseId) {
    out.textContent = 'Загрузка...';
    try {
      const data = await api.get(`/reports/performance-report/${courseId}`);
      out.textContent = JSON.stringify(data, null, 2);

      // Строим простой барчарт по студентам и их average_grade
      const labels = data.students.map(s => s.student_name || (`${s.first_name} ${s.last_name}`));
      const values = data.students.map(s => Number(s.average_grade || 0));

      if (chart) chart.destroy();
      chart = new Chart(chartEl, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Средняя оценка',
            data: values,
            backgroundColor: 'rgba(54,162,235,0.6)',
            borderColor: 'rgba(54,162,235,1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: { beginAtZero: true, suggestedMax: 5 }
          }
        }
      });
    } catch (err) {
      out.textContent = 'Ошибка: ' + (err.body?.detail || err.message || JSON.stringify(err));
    }
  }

  document.getElementById('performance-report').addEventListener('click', () => {
    const cid = document.getElementById('report-course-id').value;
    if (!cid) return alert('Укажите course_id');
    drawPerformance(cid);
  });

  document.getElementById('course-report').addEventListener('click', async () => {
    out.textContent = 'Загрузка...';
    try {
      const r = await api.get('/reports/course-report');
      out.textContent = JSON.stringify(r, null, 2);
    } catch (err) { out.textContent = 'Ошибка: ' + (err.body?.detail || err.message || JSON.stringify(err)); }
  });

  document.getElementById('students-by-course').addEventListener('click', async () => {
    const cid = document.getElementById('report-course-id').value;
    if (!cid) return alert('Укажите course_id');
    try {
      const res = await api.get(`/reports/export/csv/students/${cid}`);
      if (typeof res === 'string') {
        const blob = new Blob([res], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `students_course_${cid}.csv`; a.click();
        URL.revokeObjectURL(url);
      } else if (res.content) {
        const blob = new Blob([res.content], { type: res.content_type || 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = res.filename || `students_course_${cid}.csv`; a.click();
        URL.revokeObjectURL(url);
      } else {
        alert(JSON.stringify(res));
      }
    } catch (err) { alert('Ошибка: ' + (err.body?.detail || err.message || JSON.stringify(err))); }
  });
});