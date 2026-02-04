// Утилитарные функции для UI
function showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
        <div class="loader"></div>
        <p style="text-align: center;">Загрузка данных...</p>
    `;
}

function showEmptyState(containerId, message = 'Нет данных', icon = 'fas fa-inbox') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
        <div class="empty-state">
            <i class="${icon}"></i>
            <p>${message}</p>
        </div>
    `;
}

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU');
}

function formatDateTime(dateTimeString) {
    if (!dateTimeString) return '-';
    const date = new Date(dateTimeString);
    return date.toLocaleString('ru-RU');
}

function updateCurrentDate() {
    const currentDateElement = document.getElementById('currentDate');
    if (!currentDateElement) return;
    
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    currentDateElement.textContent = now.toLocaleDateString('ru-RU', options);
}

// Навигация по разделам
function navigateToSection(sectionId) {
    // Обновляем активную ссылку в меню
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-section') === sectionId) {
            link.classList.add('active');
        }
    });
    
    // Обновляем заголовок страницы
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
        const sectionTitles = {
            'dashboard': 'Панель управления',
            'users': 'Пользователи',
            'roles': 'Роли',
            'teachers': 'Преподаватели',
            'students': 'Студенты',
            'courses': 'Курсы',
            'enrollments': 'Записи на курсы',
            'grades': 'Оценки',
            'schedule': 'Расписание',
            'reports': 'Отчеты'
        };
        pageTitle.textContent = sectionTitles[sectionId] || 'Раздел';
    }
    
    // Загружаем контент для раздела
    loadSectionContent(sectionId);
}

// Загрузка контента для раздела
async function loadSectionContent(sectionId) {
    const contentContainer = document.getElementById('content');
    if (!contentContainer) return;
    
    // Показываем загрузку
    contentContainer.innerHTML = '<div class="loader"></div>';
    
    try {
        let html = '';
        
        switch(sectionId) {
            case 'dashboard':
                html = await getDashboardHTML();
                break;
            case 'users':
                html = getUsersHTML();
                break;
            case 'roles':
                html = getRolesHTML();
                break;
            case 'teachers':
                html = getTeachersHTML();
                break;
            case 'students':
                html = getStudentsHTML();
                break;
            case 'courses':
                html = getCoursesHTML();
                break;
            case 'enrollments':
                html = getEnrollmentsHTML();
                break;
            case 'grades':
                html = getGradesHTML();
                break;
            case 'schedule':
                html = getScheduleHTML();
                break;
            case 'reports':
                html = getReportsHTML();
                break;
            default:
                html = `<div class="content-section active"><h2>Раздел в разработке</h2></div>`;
        }
        
        contentContainer.innerHTML = html;
        
        // Инициализируем события для загруженного контента
        initSectionEvents(sectionId);
        
    } catch (error) {
        console.error(`Ошибка при загрузке раздела ${sectionId}:`, error);
        contentContainer.innerHTML = '<div class="error-message">Ошибка при загрузке данных</div>';
    }
}

// =============== HTML ШАБЛОНЫ ДЛЯ ВСЕХ РАЗДЕЛОВ ===============

// Панель управления
async function getDashboardHTML() {
    // Загружаем данные для дашборда
    const [users, students, teachers, courses] = await Promise.all([
        window.UsersAPI.getAll(0, 1).then(data => data?.length || 0),
        window.StudentsAPI.getAll(0, 1).then(data => data?.length || 0),
        window.TeachersAPI.getAll(0, 1).then(data => data?.length || 0),
        window.CoursesAPI.getAll(0, 1).then(data => data?.length || 0)
    ]);
    
    return `
        <div id="dashboard" class="content-section active">
            <div class="dashboard-cards">
                <div class="card">
                    <i class="fas fa-users"></i>
                    <h3>Пользователи</h3>
                    <p>Всего пользователей в системе</p>
                    <div class="count" id="usersCount">${users}</div>
                </div>
                <div class="card">
                    <i class="fas fa-user-graduate"></i>
                    <h3>Студенты</h3>
                    <p>Всего студентов</p>
                    <div class="count" id="studentsCount">${students}</div>
                </div>
                <div class="card">
                    <i class="fas fa-chalkboard-teacher"></i>
                    <h3>Преподаватели</h3>
                    <p>Всего преподавателей</p>
                    <div class="count" id="teachersCount">${teachers}</div>
                </div>
                <div class="card">
                    <i class="fas fa-book"></i>
                    <h3>Курсы</h3>
                    <p>Всего курсов</p>
                    <div class="count" id="coursesCount">${courses}</div>
                </div>
            </div>
            
            <div class="content-section" style="margin-top: 20px;">
                <div class="section-header">
                    <h2>Последние записи на курсы</h2>
                </div>
                <div class="table-container">
                    <table id="recentEnrollmentsTable">
                        <thead>
                            <tr>
                                <th>Студент</th>
                                <th>Курс</th>
                                <th>Дата записи</th>
                                <th>Оценка</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td colspan="4" style="text-align: center;">Загрузка...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// Пользователи
function getUsersHTML() {
    return `
        <div id="users" class="content-section active">
            <div class="section-header">
                <h2>Управление пользователями</h2>
                <button class="btn" id="addUserBtn">
                    <i class="fas fa-plus"></i> Добавить пользователя
                </button>
            </div>
            <div class="table-container">
                <table id="usersTable">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Имя пользователя</th>
                            <th>Email</th>
                            <th>Роль</th>
                            <th>Дата регистрации</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td colspan="6" style="text-align: center;">Загрузка...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// Роли
function getRolesHTML() {
    return `
        <div id="roles" class="content-section active">
            <div class="section-header">
                <h2>Управление ролями</h2>
                <button class="btn" id="addRoleBtn">
                    <i class="fas fa-plus"></i> Добавить роль
                </button>
            </div>
            <div class="table-container">
                <table id="rolesTable">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Название роли</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td colspan="3" style="text-align: center;">Загрузка...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// Преподаватели
function getTeachersHTML() {
    return `
        <div id="teachers" class="content-section active">
            <div class="section-header">
                <h2>Управление преподавателями</h2>
                <button class="btn" id="addTeacherBtn">
                    <i class="fas fa-plus"></i> Добавить преподавателя
                </button>
            </div>
            <div class="table-container">
                <table id="teachersTable">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>ФИО</th>
                            <th>Квалификация</th>
                            <th>Пользователь</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td colspan="5" style="text-align: center;">Загрузка...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// Студенты
function getStudentsHTML() {
    return `
        <div id="students" class="content-section active">
            <div class="section-header">
                <h2>Управление студентами</h2>
                <button class="btn" id="addStudentBtn">
                    <i class="fas fa-plus"></i> Добавить студента
                </button>
            </div>
            <div class="table-container">
                <table id="studentsTable">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>ФИО</th>
                            <th>Группа</th>
                            <th>Пользователь</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td colspan="5" style="text-align: center;">Загрузка...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// Курсы
function getCoursesHTML() {
    return `
        <div id="courses" class="content-section active">
            <div class="section-header">
                <h2>Управление курсами</h2>
                <button class="btn" id="addCourseBtn">
                    <i class="fas fa-plus"></i> Добавить курс
                </button>
            </div>
            <div class="table-container">
                <table id="coursesTable">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Название</th>
                            <th>Описание</th>
                            <th>Длительность (нед.)</th>
                            <th>Преподаватель</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td colspan="6" style="text-align: center;">Загрузка...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// Записи на курсы
function getEnrollmentsHTML() {
    return `
        <div id="enrollments" class="content-section active">
            <div class="section-header">
                <h2>Записи студентов на курсы</h2>
                <button class="btn" id="addEnrollmentBtn">
                    <i class="fas fa-plus"></i> Добавить запись
                </button>
            </div>
            <div class="table-container">
                <table id="enrollmentsTable">
                    <thead>
                        <tr>
                            <th>Студент</th>
                            <th>Курс</th>
                            <th>Дата записи</th>
                            <th>Оценка</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td colspan="5" style="text-align: center;">Загрузка...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// Оценки
function getGradesHTML() {
    return `
        <div id="grades" class="content-section active">
            <div class="section-header">
                <h2>Оценки студентов</h2>
                <button class="btn" id="addGradeBtn">
                    <i class="fas fa-plus"></i> Добавить оценку
                </button>
            </div>
            <div class="table-container">
                <table id="gradesTable">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Студент</th>
                            <th>Курс</th>
                            <th>Задание</th>
                            <th>Оценка</th>
                            <th>Дата сдачи</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td colspan="7" style="text-align: center;">Загрузка...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// Расписание
function getScheduleHTML() {
    return `
        <div id="schedule" class="content-section active">
            <div class="section-header">
                <h2>Расписание занятий</h2>
                <button class="btn" id="addScheduleBtn">
                    <i class="fas fa-plus"></i> Добавить занятие
                </button>
            </div>
            <div class="table-container">
                <table id="scheduleTable">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Курс</th>
                            <th>Начало</th>
                            <th>Окончание</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td colspan="5" style="text-align: center;">Загрузка...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// Отчеты
function getReportsHTML() {
    return `
        <div id="reports" class="content-section active">
            <div class="section-header">
                <h2>Отчеты</h2>
            </div>
            <div class="dashboard-cards">
                <div class="card" id="reportStudentsByCourse">
                    <i class="fas fa-list"></i>
                    <h3>Студенты по курсу</h3>
                    <p>Отчет по студентам выбранного курса</p>
                    <button class="btn" style="margin-top: 10px;">Создать отчет</button>
                </div>
                <div class="card" id="reportPerformance">
                    <i class="fas fa-chart-line"></i>
                    <h3>Успеваемость</h3>
                    <p>Отчет по успеваемости студентов</p>
                    <button class="btn" style="margin-top: 10px;">Создать отчет</button>
                </div>
                <div class="card" id="reportCourses">
                    <i class="fas fa-book-open"></i>
                    <h3>Курсы и преподаватели</h3>
                    <p>Отчет по курсам и их преподавателям</p>
                    <button class="btn" style="margin-top: 10px;">Создать отчет</button>
                </div>
                <div class="card" id="reportSchedule">
                    <i class="fas fa-calendar"></i>
                    <h3>Расписание</h3>
                    <p>Отчет по расписанию занятий</p>
                    <button class="btn" style="margin-top: 10px;">Создать отчет</button>
                </div>
            </div>
        </div>
    `;
}

// Инициализация событий для раздела
function initSectionEvents(sectionId) {
    switch(sectionId) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'users':
            loadUsersData();
            document.getElementById('addUserBtn')?.addEventListener('click', () => showUserForm());
            break;
        case 'roles':
            loadRolesData();
            document.getElementById('addRoleBtn')?.addEventListener('click', () => showRoleForm());
            break;
        case 'teachers':
            loadTeachersData();
            document.getElementById('addTeacherBtn')?.addEventListener('click', () => showTeacherForm());
            break;
        case 'students':
            loadStudentsData();
            document.getElementById('addStudentBtn')?.addEventListener('click', () => showStudentForm());
            break;
        case 'courses':
            loadCoursesData();
            document.getElementById('addCourseBtn')?.addEventListener('click', () => showCourseForm());
            break;
        case 'enrollments':
            loadEnrollmentsData();
            document.getElementById('addEnrollmentBtn')?.addEventListener('click', () => showEnrollmentForm());
            break;
        case 'grades':
            loadGradesData();
            document.getElementById('addGradeBtn')?.addEventListener('click', () => showGradeForm());
            break;
        case 'schedule':
            loadScheduleData();
            document.getElementById('addScheduleBtn')?.addEventListener('click', () => showScheduleForm());
            break;
        case 'reports':
            initReportEvents();
            break;
    }
}

// Инициализация событий для отчетов
function initReportEvents() {
    document.getElementById('reportStudentsByCourse')?.addEventListener('click', () => showReportForm('students-by-course'));
    document.getElementById('reportPerformance')?.addEventListener('click', () => showReportForm('performance'));
    document.getElementById('reportCourses')?.addEventListener('click', () => showReportForm('courses'));
    document.getElementById('reportSchedule')?.addEventListener('click', () => showReportForm('schedule'));
}

// Форма отчета
function showReportForm(reportType) {
    let title = '';
    let formHtml = '';
    
    switch(reportType) {
        case 'students-by-course':
            title = 'Отчет: Студенты по курсу';
            formHtml = `
                <form id="reportForm">
                    <div class="form-group">
                        <label for="reportCourseId">Курс (ID) *</label>
                        <input type="number" id="reportCourseId" name="course_id" required>
                    </div>
                    <div class="form-buttons">
                        <button type="button" class="btn" onclick="closeModal()">Отмена</button>
                        <button type="submit" class="btn btn-success">Создать отчет</button>
                    </div>
                </form>
            `;
            break;
        case 'performance':
            title = 'Отчет: Успеваемость по курсу';
            formHtml = `
                <form id="reportForm">
                    <div class="form-group">
                        <label for="reportCourseId">Курс (ID) *</label>
                        <input type="number" id="reportCourseId" name="course_id" required>
                    </div>
                    <div class="form-buttons">
                        <button type="button" class="btn" onclick="closeModal()">Отмена</button>
                        <button type="submit" class="btn btn-success">Создать отчет</button>
                    </div>
                </form>
            `;
            break;
        case 'courses':
            title = 'Отчет: Курсы и преподаватели';
            formHtml = `
                <form id="reportForm">
                    <p>Этот отчет покажет список всех курсов и их преподавателей.</p>
                    <div class="form-buttons">
                        <button type="button" class="btn" onclick="closeModal()">Отмена</button>
                        <button type="submit" class="btn btn-success">Создать отчет</button>
                    </div>
                </form>
            `;
            break;
        case 'schedule':
            title = 'Отчет: Расписание занятий';
            formHtml = `
                <form id="reportForm">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="reportStartDate">Начальная дата *</label>
                            <input type="date" id="reportStartDate" name="start_date" required value="${new Date().toISOString().split('T')[0]}">
                        </div>
                        <div class="form-group">
                            <label for="reportEndDate">Конечная дата *</label>
                            <input type="date" id="reportEndDate" name="end_date" required value="${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}">
                        </div>
                    </div>
                    <div class="form-buttons">
                        <button type="button" class="btn" onclick="closeModal()">Отмена</button>
                        <button type="submit" class="btn btn-success">Создать отчет</button>
                    </div>
                </form>
            `;
            break;
    }
    
    openModal(title, formHtml);
    
    // Обработчик формы отчета
    const form = document.getElementById('reportForm');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            let endpoint = '';
            let params = '';
            
            switch(reportType) {
                case 'students-by-course':
                    const courseId = document.getElementById('reportCourseId').value;
                    endpoint = `/reports/students-by-course/${courseId}`;
                    break;
                case 'performance':
                    const perfCourseId = document.getElementById('reportCourseId').value;
                    endpoint = `/reports/performance-report/${perfCourseId}`;
                    break;
                case 'courses':
                    endpoint = '/reports/course-report';
                    break;
                case 'schedule':
                    const startDate = document.getElementById('reportStartDate').value;
                    const endDate = document.getElementById('reportEndDate').value;
                    endpoint = `/reports/schedule-report/${startDate}/${endDate}`;
                    break;
            }
            
            try {
                const reportData = await window.fetchData(endpoint);
                
                // Закрываем модальное окно
                closeModal();
                
                // Открываем новое модальное окно с результатами отчета
                let reportHtml = `<h4>Результаты отчета</h4>`;
                
                if (reportData) {
                    reportHtml += `<pre style="background: #f5f5f5; padding: 15px; border-radius: 4px; overflow: auto; max-height: 400px;">${JSON.stringify(reportData, null, 2)}</pre>`;
                } else {
                    reportHtml += `<p>Нет данных для отчета</p>`;
                }
                
                reportHtml += `<div class="form-buttons" style="margin-top: 20px;">
                    <button type="button" class="btn" onclick="closeModal()">Закрыть</button>
                </div>`;
                
                openModal(`Результаты: ${title}`, reportHtml);
                
            } catch (error) {
                showNotification('Ошибка при создании отчета', 'error');
            }
        });
    }
}

// Загрузка данных для дашборда
async function loadDashboardData() {
    try {
        const enrollments = await window.fetchData('/enrollments?limit=5');
        updateRecentEnrollmentsTable(enrollments || []);
    } catch (error) {
        console.error('Ошибка при загрузке данных дашборда:', error);
    }
}

function updateRecentEnrollmentsTable(enrollments) {
    const tbody = document.querySelector('#recentEnrollmentsTable tbody');
    if (!tbody) return;
    
    if (!enrollments || enrollments.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <p>Нет записей на курсы</p>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    enrollments.forEach(enrollment => {
        html += `
            <tr>
                <td>${enrollment.student?.first_name || ''} ${enrollment.student?.last_name || ''}</td>
                <td>${enrollment.course?.title || ''}</td>
                <td>${formatDate(enrollment.enrollment_date)}</td>
                <td>${enrollment.grade ? enrollment.grade.toFixed(1) : 'Нет оценки'}</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// Вспомогательные функции
function getRoleName(roleId) {
    const roleNames = {
        1: 'Администратор',
        2: 'Преподаватель',
        3: 'Студент'
    };
    return roleNames[roleId] || `Роль ${roleId}`;
}

// Экспорт
window.navigateToSection = navigateToSection;
window.showNotification = showNotification;
window.formatDate = formatDate;
window.formatDateTime = formatDateTime;
window.updateCurrentDate = updateCurrentDate;
window.showLoading = showLoading;
window.showEmptyState = showEmptyState;
window.showReportForm = showReportForm;
window.openModal = openModal;