// Работа с модальными окнами
function openModal(title, content) {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    if (modal && modalTitle && modalBody) {
        modalTitle.textContent = title;
        modalBody.innerHTML = content;
        modal.classList.add('active');
    }
}

function closeModal() {
    const modal = document.getElementById('modal');
    if (modal) {
        modal.classList.remove('active');
        const modalBody = document.getElementById('modalBody');
        if (modalBody) modalBody.innerHTML = '';
    }
}

// =============== ФОРМА ПОЛЬЗОВАТЕЛЯ ===============
function showUserForm(user = null) {
    const isEdit = user !== null;
    const title = isEdit ? 'Редактировать пользователя' : 'Добавить пользователя';
    
    const formHtml = `
        <form id="userForm">
            <div class="form-group">
                <label for="userUsername">Имя пользователя *</label>
                <input type="text" id="userUsername" name="username" required value="${user?.username || ''}">
            </div>
            <div class="form-group">
                <label for="userEmail">Email *</label>
                <input type="email" id="userEmail" name="email" required value="${user?.email || ''}">
            </div>
            ${!isEdit ? `
            <div class="form-group">
                <label for="userPassword">Пароль *</label>
                <input type="password" id="userPassword" name="password" required>
            </div>
            ` : ''}
            <div class="form-group">
                <label for="userRole">Роль *</label>
                <select id="userRole" name="role_id" required>
                    <option value="1" ${user?.role_id === 1 ? 'selected' : ''}>Администратор</option>
                    <option value="2" ${user?.role_id === 2 ? 'selected' : ''}>Преподаватель</option>
                    <option value="3" ${user?.role_id === 3 ? 'selected' : ''}>Студент</option>
                </select>
            </div>
            <div class="form-group">
                <label for="userPhoto">Фото (URL)</label>
                <input type="text" id="userPhoto" name="photo_url" value="${user?.photo_url || ''}">
            </div>
            <div class="form-buttons">
                <button type="button" class="btn" onclick="closeModal()">Отмена</button>
                <button type="submit" class="btn btn-success">${isEdit ? 'Сохранить' : 'Добавить'}</button>
            </div>
        </form>
    `;
    
    openModal(title, formHtml);
    
    const form = document.getElementById('userForm');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = {
                username: document.getElementById('userUsername').value,
                email: document.getElementById('userEmail').value,
                role_id: parseInt(document.getElementById('userRole').value),
                photo_url: document.getElementById('userPhoto').value || null
            };
            
            if (!isEdit) {
                formData.password = document.getElementById('userPassword').value;
            }
            
            try {
                if (isEdit) {
                    await window.UsersAPI.update(user.id, formData);
                    window.showNotification('Пользователь обновлен', 'success');
                } else {
                    await window.UsersAPI.create(formData);
                    window.showNotification('Пользователь добавлен', 'success');
                }
                
                closeModal();
                loadUsersData();
            } catch (error) {
                window.showNotification('Ошибка при сохранении пользователя', 'error');
            }
        });
    }
}

// =============== ФОРМА РОЛИ ===============
function showRoleForm(role = null) {
    const isEdit = role !== null;
    const title = isEdit ? 'Редактировать роль' : 'Добавить роль';
    
    const formHtml = `
        <form id="roleForm">
            <div class="form-group">
                <label for="roleName">Название роли *</label>
                <select id="roleName" name="name" required>
                    <option value="admin" ${role?.name === 'admin' ? 'selected' : ''}>Администратор</option>
                    <option value="teacher" ${role?.name === 'teacher' ? 'selected' : ''}>Преподаватель</option>
                    <option value="student" ${role?.name === 'student' ? 'selected' : ''}>Студент</option>
                </select>
            </div>
            <div class="form-buttons">
                <button type="button" class="btn" onclick="closeModal()">Отмена</button>
                <button type="submit" class="btn btn-success">${isEdit ? 'Сохранить' : 'Добавить'}</button>
            </div>
        </form>
    `;
    
    openModal(title, formHtml);
    
    const form = document.getElementById('roleForm');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = {
                name: document.getElementById('roleName').value
            };
            
            try {
                if (isEdit) {
                    await window.RolesAPI.update(role.id, formData);
                    window.showNotification('Роль обновлена', 'success');
                } else {
                    await window.RolesAPI.create(formData);
                    window.showNotification('Роль добавлена', 'success');
                }
                
                closeModal();
                loadRolesData();
            } catch (error) {
                window.showNotification('Ошибка при сохранении роли', 'error');
            }
        });
    }
}

// =============== ФОРМА ПРЕПОДАВАТЕЛЯ ===============
function showTeacherForm(teacher = null) {
    const isEdit = teacher !== null;
    const title = isEdit ? 'Редактировать преподавателя' : 'Добавить преподавателя';
    
    const formHtml = `
        <form id="teacherForm">
            <div class="form-row">
                <div class="form-group">
                    <label for="teacherFirstName">Имя *</label>
                    <input type="text" id="teacherFirstName" name="first_name" required value="${teacher?.first_name || ''}">
                </div>
                <div class="form-group">
                    <label for="teacherLastName">Фамилия *</label>
                    <input type="text" id="teacherLastName" name="last_name" required value="${teacher?.last_name || ''}">
                </div>
            </div>
            <div class="form-group">
                <label for="teacherQualification">Квалификация *</label>
                <input type="text" id="teacherQualification" name="qualification" required value="${teacher?.qualification || ''}">
            </div>
            <div class="form-group">
                <label for="teacherBio">Биография</label>
                <textarea id="teacherBio" name="bio" rows="3">${teacher?.bio || ''}</textarea>
            </div>
            <div class="form-group">
                <label for="teacherUserId">ID пользователя *</label>
                <input type="number" id="teacherUserId" name="user_id" required value="${teacher?.user_id || ''}">
            </div>
            <div class="form-buttons">
                <button type="button" class="btn" onclick="closeModal()">Отмена</button>
                <button type="submit" class="btn btn-success">${isEdit ? 'Сохранить' : 'Добавить'}</button>
            </div>
        </form>
    `;
    
    openModal(title, formHtml);
    
    const form = document.getElementById('teacherForm');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = {
                first_name: document.getElementById('teacherFirstName').value,
                last_name: document.getElementById('teacherLastName').value,
                qualification: document.getElementById('teacherQualification').value,
                bio: document.getElementById('teacherBio').value || null,
                user_id: parseInt(document.getElementById('teacherUserId').value)
            };
            
            try {
                if (isEdit) {
                    await window.TeachersAPI.update(teacher.id, formData);
                    window.showNotification('Преподаватель обновлен', 'success');
                } else {
                    await window.TeachersAPI.create(formData);
                    window.showNotification('Преподаватель добавлен', 'success');
                }
                
                closeModal();
                loadTeachersData();
            } catch (error) {
                window.showNotification('Ошибка при сохранении преподавателя', 'error');
            }
        });
    }
}

// =============== ФОРМА СТУДЕНТА ===============
function showStudentForm(student = null) {
    const isEdit = student !== null;
    const title = isEdit ? 'Редактировать студента' : 'Добавить студента';
    
    const formHtml = `
        <form id="studentForm">
            <div class="form-row">
                <div class="form-group">
                    <label for="studentFirstName">Имя *</label>
                    <input type="text" id="studentFirstName" name="first_name" required value="${student?.first_name || ''}">
                </div>
                <div class="form-group">
                    <label for="studentLastName">Фамилия *</label>
                    <input type="text" id="studentLastName" name="last_name" required value="${student?.last_name || ''}">
                </div>
            </div>
            <div class="form-group">
                <label for="studentGroup">Группа *</label>
                <input type="text" id="studentGroup" name="group_number" required value="${student?.group_number || ''}">
            </div>
            <div class="form-group">
                <label for="studentUserId">ID пользователя *</label>
                <input type="number" id="studentUserId" name="user_id" required value="${student?.user_id || ''}">
            </div>
            <div class="form-buttons">
                <button type="button" class="btn" onclick="closeModal()">Отмена</button>
                <button type="submit" class="btn btn-success">${isEdit ? 'Сохранить' : 'Добавить'}</button>
            </div>
        </form>
    `;
    
    openModal(title, formHtml);
    
    const form = document.getElementById('studentForm');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = {
                first_name: document.getElementById('studentFirstName').value,
                last_name: document.getElementById('studentLastName').value,
                group_number: document.getElementById('studentGroup').value,
                user_id: parseInt(document.getElementById('studentUserId').value)
            };
            
            try {
                if (isEdit) {
                    await window.StudentsAPI.update(student.id, formData);
                    window.showNotification('Студент обновлен', 'success');
                } else {
                    await window.StudentsAPI.create(formData);
                    window.showNotification('Студент добавлен', 'success');
                }
                
                closeModal();
                loadStudentsData();
            } catch (error) {
                window.showNotification('Ошибка при сохранении студента', 'error');
            }
        });
    }
}

// =============== ФОРМА КУРСА ===============
function showCourseForm(course = null) {
    const isEdit = course !== null;
    const title = isEdit ? 'Редактировать курс' : 'Добавить курс';
    
    const formHtml = `
        <form id="courseForm">
            <div class="form-group">
                <label for="courseTitle">Название курса *</label>
                <input type="text" id="courseTitle" name="title" required value="${course?.title || ''}">
            </div>
            <div class="form-group">
                <label for="courseDescription">Описание *</label>
                <textarea id="courseDescription" name="description" rows="3" required>${course?.description || ''}</textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="courseDuration">Длительность (недели) *</label>
                    <input type="number" id="courseDuration" name="duration" required min="1" value="${course?.duration || 8}">
                </div>
                <div class="form-group">
                    <label for="courseTeacher">ID преподавателя *</label>
                    <input type="number" id="courseTeacher" name="teacher_id" required value="${course?.teacher_id || ''}">
                </div>
            </div>
            <div class="form-buttons">
                <button type="button" class="btn" onclick="closeModal()">Отмена</button>
                <button type="submit" class="btn btn-success">${isEdit ? 'Сохранить' : 'Добавить'}</button>
            </div>
        </form>
    `;
    
    openModal(title, formHtml);
    
    const form = document.getElementById('courseForm');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = {
                title: document.getElementById('courseTitle').value,
                description: document.getElementById('courseDescription').value,
                duration: parseInt(document.getElementById('courseDuration').value),
                teacher_id: parseInt(document.getElementById('courseTeacher').value)
            };
            
            try {
                if (isEdit) {
                    await window.CoursesAPI.update(course.id, formData);
                    window.showNotification('Курс обновлен', 'success');
                } else {
                    await window.CoursesAPI.create(formData);
                    window.showNotification('Курс добавлен', 'success');
                }
                
                closeModal();
                loadCoursesData();
            } catch (error) {
                window.showNotification('Ошибка при сохранении курса', 'error');
            }
        });
    }
}

// =============== ФОРМА ЗАПИСИ НА КУРС ===============
function showEnrollmentForm(enrollment = null) {
    const isEdit = enrollment !== null;
    const title = isEdit ? 'Редактировать запись на курс' : 'Добавить запись на курс';
    
    const formHtml = `
        <form id="enrollmentForm">
            <div class="form-row">
                <div class="form-group">
                    <label for="enrollmentStudent">Студент (ID) *</label>
                    <input type="number" id="enrollmentStudent" name="student_id" required value="${enrollment?.student_id || ''}">
                </div>
                <div class="form-group">
                    <label for="enrollmentCourse">Курс (ID) *</label>
                    <input type="number" id="enrollmentCourse" name="course_id" required value="${enrollment?.course_id || ''}">
                </div>
            </div>
            <div class="form-group">
                <label for="enrollmentDate">Дата записи *</label>
                <input type="date" id="enrollmentDate" name="enrollment_date" required value="${enrollment?.enrollment_date || new Date().toISOString().split('T')[0]}">
            </div>
            ${isEdit ? `
            <div class="form-group">
                <label for="enrollmentGrade">Оценка</label>
                <input type="number" id="enrollmentGrade" name="grade" step="0.1" min="0" max="5" value="${enrollment?.grade || ''}">
            </div>
            ` : ''}
            <div class="form-buttons">
                <button type="button" class="btn" onclick="closeModal()">Отмена</button>
                <button type="submit" class="btn btn-success">${isEdit ? 'Сохранить' : 'Добавить'}</button>
            </div>
        </form>
    `;
    
    openModal(title, formHtml);
    
    const form = document.getElementById('enrollmentForm');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = {
                student_id: parseInt(document.getElementById('enrollmentStudent').value),
                course_id: parseInt(document.getElementById('enrollmentCourse').value),
                enrollment_date: document.getElementById('enrollmentDate').value
            };
            
            if (isEdit) {
                const grade = document.getElementById('enrollmentGrade').value;
                if (grade) {
                    formData.grade = parseFloat(grade);
                }
            }
            
            try {
                if (isEdit) {
                    // Для обновления оценки
                    const gradeUpdate = { grade: formData.grade };
                    await window.fetchData(`/enrollments?student_id=${formData.student_id}&course_id=${formData.course_id}`, {
                        method: 'PUT',
                        body: JSON.stringify(gradeUpdate)
                    });
                    window.showNotification('Запись обновлена', 'success');
                } else {
                    await window.fetchData('/enrollments', {
                        method: 'POST',
                        body: JSON.stringify(formData)
                    });
                    window.showNotification('Запись добавлена', 'success');
                }
                
                closeModal();
                loadEnrollmentsData();
            } catch (error) {
                window.showNotification('Ошибка при сохранении записи', 'error');
            }
        });
    }
}

// =============== ФОРМА ОЦЕНКИ ===============
function showGradeForm(grade = null) {
    const isEdit = grade !== null;
    const title = isEdit ? 'Редактировать оценку' : 'Добавить оценку';
    
    const formHtml = `
        <form id="gradeForm">
            <div class="form-row">
                <div class="form-group">
                    <label for="gradeStudent">Студент (ID) *</label>
                    <input type="number" id="gradeStudent" name="student_id" required value="${grade?.student_id || ''}">
                </div>
                <div class="form-group">
                    <label for="gradeCourse">Курс (ID) *</label>
                    <input type="number" id="gradeCourse" name="course_id" required value="${grade?.course_id || ''}">
                </div>
            </div>
            <div class="form-group">
                <label for="gradeAssignment">Задание *</label>
                <input type="text" id="gradeAssignment" name="assignment_title" required value="${grade?.assignment_title || ''}">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="gradeValue">Оценка *</label>
                    <input type="number" id="gradeValue" name="grade_value" required step="0.1" min="0" max="5" value="${grade?.grade_value || ''}">
                </div>
                <div class="form-group">
                    <label for="gradeDate">Дата сдачи *</label>
                    <input type="date" id="gradeDate" name="submission_date" required value="${grade?.submission_date || new Date().toISOString().split('T')[0]}">
                </div>
            </div>
            <div class="form-buttons">
                <button type="button" class="btn" onclick="closeModal()">Отмена</button>
                <button type="submit" class="btn btn-success">${isEdit ? 'Сохранить' : 'Добавить'}</button>
            </div>
        </form>
    `;
    
    openModal(title, formHtml);
    
    const form = document.getElementById('gradeForm');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = {
                student_id: parseInt(document.getElementById('gradeStudent').value),
                course_id: parseInt(document.getElementById('gradeCourse').value),
                assignment_title: document.getElementById('gradeAssignment').value,
                grade_value: parseFloat(document.getElementById('gradeValue').value),
                submission_date: document.getElementById('gradeDate').value
            };
            
            try {
                if (isEdit) {
                    await window.fetchData(`/grades/${grade.id}`, {
                        method: 'PUT',
                        body: JSON.stringify(formData)
                    });
                    window.showNotification('Оценка обновлена', 'success');
                } else {
                    await window.fetchData('/grades', {
                        method: 'POST',
                        body: JSON.stringify(formData)
                    });
                    window.showNotification('Оценка добавлена', 'success');
                }
                
                closeModal();
                loadGradesData();
            } catch (error) {
                window.showNotification('Ошибка при сохранении оценки', 'error');
            }
        });
    }
}

// =============== ФОРМА РАСПИСАНИЯ ===============
function showScheduleForm(schedule = null) {
    const isEdit = schedule !== null;
    const title = isEdit ? 'Редактировать занятие' : 'Добавить занятие';
    
    // Форматируем даты для input[type="datetime-local"]
    const formatForDateTimeInput = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toISOString().slice(0, 16);
    };
    
    const formHtml = `
        <form id="scheduleForm">
            <div class="form-group">
                <label for="scheduleCourse">Курс (ID) *</label>
                <input type="number" id="scheduleCourse" name="course_id" required value="${schedule?.course_id || ''}">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="scheduleStart">Начало *</label>
                    <input type="datetime-local" id="scheduleStart" name="start_date_time" required value="${formatForDateTimeInput(schedule?.start_date_time)}">
                </div>
                <div class="form-group">
                    <label for="scheduleEnd">Окончание *</label>
                    <input type="datetime-local" id="scheduleEnd" name="end_date_time" required value="${formatForDateTimeInput(schedule?.end_date_time)}">
                </div>
            </div>
            <div class="form-buttons">
                <button type="button" class="btn" onclick="closeModal()">Отмена</button>
                <button type="submit" class="btn btn-success">${isEdit ? 'Сохранить' : 'Добавить'}</button>
            </div>
        </form>
    `;
    
    openModal(title, formHtml);
    
    const form = document.getElementById('scheduleForm');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = {
                course_id: parseInt(document.getElementById('scheduleCourse').value),
                start_date_time: document.getElementById('scheduleStart').value,
                end_date_time: document.getElementById('scheduleEnd').value
            };
            
            try {
                if (isEdit) {
                    await window.fetchData(`/schedule/${schedule.id}`, {
                        method: 'PUT',
                        body: JSON.stringify(formData)
                    });
                    window.showNotification('Занятие обновлено', 'success');
                } else {
                    await window.fetchData('/schedule', {
                        method: 'POST',
                        body: JSON.stringify(formData)
                    });
                    window.showNotification('Занятие добавлено', 'success');
                }
                
                closeModal();
                loadScheduleData();
            } catch (error) {
                window.showNotification('Ошибка при сохранении занятия', 'error');
            }
        });
    }
}

// =============== ФУНКЦИИ ДЛЯ РЕДАКТИРОВАНИЯ ===============
async function editUser(id) {
    try {
        const user = await window.UsersAPI.getById(id);
        if (user) {
            showUserForm(user);
        }
    } catch (error) {
        window.showNotification('Ошибка при загрузке пользователя', 'error');
    }
}

async function editRole(id) {
    try {
        const role = await window.RolesAPI.getById(id);
        if (role) {
            showRoleForm(role);
        }
    } catch (error) {
        window.showNotification('Ошибка при загрузке роли', 'error');
    }
}

async function editTeacher(id) {
    try {
        const teacher = await window.TeachersAPI.getById(id);
        if (teacher) {
            showTeacherForm(teacher);
        }
    } catch (error) {
        window.showNotification('Ошибка при загрузке преподавателя', 'error');
    }
}

async function editStudent(id) {
    try {
        const student = await window.StudentsAPI.getById(id);
        if (student) {
            showStudentForm(student);
        }
    } catch (error) {
        window.showNotification('Ошибка при загрузке студента', 'error');
    }
}

async function editCourse(id) {
    try {
        const course = await window.CoursesAPI.getById(id);
        if (course) {
            showCourseForm(course);
        }
    } catch (error) {
        window.showNotification('Ошибка при загрузке курса', 'error');
    }
}

async function editEnrollment(studentId, courseId) {
    try {
        const enrollments = await window.fetchData('/enrollments');
        const enrollment = enrollments?.find(e => e.student_id === studentId && e.course_id === courseId);
        if (enrollment) {
            showEnrollmentForm(enrollment);
        }
    } catch (error) {
        window.showNotification('Ошибка при загрузке записи', 'error');
    }
}

async function editGrade(id) {
    try {
        const grade = await window.fetchData(`/grades/${id}`);
        if (grade) {
            showGradeForm(grade);
        }
    } catch (error) {
        window.showNotification('Ошибка при загрузке оценки', 'error');
    }
}

async function editSchedule(id) {
    try {
        const schedule = await window.fetchData(`/schedule/${id}`);
        if (schedule) {
            showScheduleForm(schedule);
        }
    } catch (error) {
        window.showNotification('Ошибка при загрузке занятия', 'error');
    }
}

// =============== ФУНКЦИИ ДЛЯ УДАЛЕНИЯ ===============
async function deleteUser(id) {
    if (confirm('Вы уверены, что хотите удалить этого пользователя?')) {
        try {
            await window.UsersAPI.delete(id);
            window.showNotification('Пользователь удален', 'success');
            loadUsersData();
        } catch (error) {
            window.showNotification('Ошибка при удалении пользователя', 'error');
        }
    }
}

async function deleteRole(id) {
    if (confirm('Вы уверены, что хотите удалить эту роль?')) {
        try {
            await window.RolesAPI.delete(id);
            window.showNotification('Роль удалена', 'success');
            loadRolesData();
        } catch (error) {
            window.showNotification('Ошибка при удалении роли', 'error');
        }
    }
}

async function deleteTeacher(id) {
    if (confirm('Вы уверены, что хотите удалить этого преподавателя?')) {
        try {
            await window.TeachersAPI.delete(id);
            window.showNotification('Преподаватель удален', 'success');
            loadTeachersData();
        } catch (error) {
            window.showNotification('Ошибка при удалении преподавателя', 'error');
        }
    }
}

async function deleteStudent(id) {
    if (confirm('Вы уверены, что хотите удалить этого студента?')) {
        try {
            await window.StudentsAPI.delete(id);
            window.showNotification('Студент удален', 'success');
            loadStudentsData();
        } catch (error) {
            window.showNotification('Ошибка при удалении студента', 'error');
        }
    }
}

async function deleteCourse(id) {
    if (confirm('Вы уверены, что хотите удалить этот курс?')) {
        try {
            await window.CoursesAPI.delete(id);
            window.showNotification('Курс удален', 'success');
            loadCoursesData();
        } catch (error) {
            window.showNotification('Ошибка при удалении курса', 'error');
        }
    }
}

async function deleteEnrollment(studentId, courseId) {
    if (confirm('Вы уверены, что хотите удалить эту запись на курс?')) {
        try {
            await window.fetchData(`/enrollments?student_id=${studentId}&course_id=${courseId}`, {
                method: 'DELETE'
            });
            window.showNotification('Запись на курс удалена', 'success');
            loadEnrollmentsData();
        } catch (error) {
            window.showNotification('Ошибка при удалении записи на курс', 'error');
        }
    }
}

async function deleteGrade(id) {
    if (confirm('Вы уверены, что хотите удалить эту оценку?')) {
        try {
            await window.fetchData(`/grades/${id}`, { method: 'DELETE' });
            window.showNotification('Оценка удалена', 'success');
            loadGradesData();
        } catch (error) {
            window.showNotification('Ошибка при удалении оценки', 'error');
        }
    }
}

async function deleteSchedule(id) {
    if (confirm('Вы уверены, что хотите удалить это занятие из расписания?')) {
        try {
            await window.fetchData(`/schedule/${id}`, { method: 'DELETE' });
            window.showNotification('Занятие удалено', 'success');
            loadScheduleData();
        } catch (error) {
            window.showNotification('Ошибка при удалении занятия', 'error');
        }
    }
}

// =============== ФУНКЦИИ ДЛЯ ЗАГРУЗКИ ДАННЫХ ===============
async function loadUsersData() {
    try {
        const users = await window.UsersAPI.getAll();
        updateUsersTable(users || []);
    } catch (error) {
        console.error('Ошибка при загрузке пользователей:', error);
        window.showEmptyState('usersTable', 'Ошибка загрузки данных', 'fas fa-exclamation-triangle');
    }
}

function updateUsersTable(users) {
    const tbody = document.querySelector('#usersTable tbody');
    if (!tbody) return;
    
    if (!users || users.length === 0) {
        window.showEmptyState('usersTable', 'Нет пользователей', 'fas fa-users');
        return;
    }
    
    let html = '';
    users.forEach(user => {
        html += `
            <tr>
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${getRoleName(user.role_id)}</td>
                <td>${window.formatDate(user.registration_date_time)}</td>
                <td class="action-buttons">
                    <button class="action-btn edit-btn" onclick="editUser(${user.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteUser(${user.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

async function loadRolesData() {
    try {
        const roles = await window.RolesAPI.getAll();
        updateRolesTable(roles || []);
    } catch (error) {
        console.error('Ошибка при загрузке ролей:', error);
        window.showEmptyState('rolesTable', 'Ошибка загрузки данных', 'fas fa-exclamation-triangle');
    }
}

function updateRolesTable(roles) {
    const tbody = document.querySelector('#rolesTable tbody');
    if (!tbody) return;
    
    if (!roles || roles.length === 0) {
        window.showEmptyState('rolesTable', 'Нет ролей', 'fas fa-user-tag');
        return;
    }
    
    let html = '';
    roles.forEach(role => {
        html += `
            <tr>
                <td>${role.id}</td>
                <td>${role.name}</td>
                <td class="action-buttons">
                    <button class="action-btn edit-btn" onclick="editRole(${role.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteRole(${role.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

async function loadTeachersData() {
    try {
        const teachers = await window.TeachersAPI.getAll();
        updateTeachersTable(teachers || []);
    } catch (error) {
        console.error('Ошибка при загрузке преподавателей:', error);
        window.showEmptyState('teachersTable', 'Ошибка загрузки данных', 'fas fa-exclamation-triangle');
    }
}

function updateTeachersTable(teachers) {
    const tbody = document.querySelector('#teachersTable tbody');
    if (!tbody) return;
    
    if (!teachers || teachers.length === 0) {
        window.showEmptyState('teachersTable', 'Нет преподавателей', 'fas fa-chalkboard-teacher');
        return;
    }
    
    let html = '';
    teachers.forEach(teacher => {
        html += `
            <tr>
                <td>${teacher.id}</td>
                <td>${teacher.first_name} ${teacher.last_name}</td>
                <td>${teacher.qualification}</td>
                <td>${teacher.user_id}</td>
                <td class="action-buttons">
                    <button class="action-btn edit-btn" onclick="editTeacher(${teacher.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteTeacher(${teacher.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

async function loadStudentsData() {
    try {
        const students = await window.StudentsAPI.getAll();
        updateStudentsTable(students || []);
    } catch (error) {
        console.error('Ошибка при загрузке студентов:', error);
        window.showEmptyState('studentsTable', 'Ошибка загрузки данных', 'fas fa-exclamation-triangle');
    }
}

function updateStudentsTable(students) {
    const tbody = document.querySelector('#studentsTable tbody');
    if (!tbody) return;
    
    if (!students || students.length === 0) {
        window.showEmptyState('studentsTable', 'Нет студентов', 'fas fa-user-graduate');
        return;
    }
    
    let html = '';
    students.forEach(student => {
        html += `
            <tr>
                <td>${student.id}</td>
                <td>${student.first_name} ${student.last_name}</td>
                <td>${student.group_number}</td>
                <td>${student.user_id}</td>
                <td class="action-buttons">
                    <button class="action-btn edit-btn" onclick="editStudent(${student.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteStudent(${student.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

async function loadCoursesData() {
    try {
        const courses = await window.CoursesAPI.getAll();
        updateCoursesTable(courses || []);
    } catch (error) {
        console.error('Ошибка при загрузке курсов:', error);
        window.showEmptyState('coursesTable', 'Ошибка загрузки данных', 'fas fa-exclamation-triangle');
    }
}

function updateCoursesTable(courses) {
    const tbody = document.querySelector('#coursesTable tbody');
    if (!tbody) return;
    
    if (!courses || courses.length === 0) {
        window.showEmptyState('coursesTable', 'Нет курсов', 'fas fa-book');
        return;
    }
    
    let html = '';
    courses.forEach(course => {
        html += `
            <tr>
                <td>${course.id}</td>
                <td>${course.title}</td>
                <td>${course.description.substring(0, 50)}${course.description.length > 50 ? '...' : ''}</td>
                <td>${course.duration}</td>
                <td>${course.teacher_id}</td>
                <td class="action-buttons">
                    <button class="action-btn edit-btn" onclick="editCourse(${course.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteCourse(${course.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

async function loadEnrollmentsData() {
    try {
        const enrollments = await window.fetchData('/enrollments');
        updateEnrollmentsTable(enrollments || []);
    } catch (error) {
        console.error('Ошибка при загрузке записей на курсы:', error);
        window.showEmptyState('enrollmentsTable', 'Ошибка загрузки данных', 'fas fa-exclamation-triangle');
    }
}

function updateEnrollmentsTable(enrollments) {
    const tbody = document.querySelector('#enrollmentsTable tbody');
    if (!tbody) return;
    
    if (!enrollments || enrollments.length === 0) {
        window.showEmptyState('enrollmentsTable', 'Нет записей на курсы', 'fas fa-clipboard-list');
        return;
    }
    
    let html = '';
    enrollments.forEach(enrollment => {
        html += `
            <tr>
                <td>${enrollment.student?.first_name || ''} ${enrollment.student?.last_name || ''}</td>
                <td>${enrollment.course?.title || ''}</td>
                <td>${window.formatDate(enrollment.enrollment_date)}</td>
                <td>${enrollment.grade ? enrollment.grade.toFixed(1) : 'Нет оценки'}</td>
                <td class="action-buttons">
                    <button class="action-btn edit-btn" onclick="editEnrollment(${enrollment.student_id}, ${enrollment.course_id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteEnrollment(${enrollment.student_id}, ${enrollment.course_id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

async function loadGradesData() {
    try {
        const grades = await window.fetchData('/grades');
        updateGradesTable(grades || []);
    } catch (error) {
        console.error('Ошибка при загрузке оценок:', error);
        window.showEmptyState('gradesTable', 'Ошибка загрузки данных', 'fas fa-exclamation-triangle');
    }
}

function updateGradesTable(grades) {
    const tbody = document.querySelector('#gradesTable tbody');
    if (!tbody) return;
    
    if (!grades || grades.length === 0) {
        window.showEmptyState('gradesTable', 'Нет оценок', 'fas fa-star');
        return;
    }
    
    let html = '';
    grades.forEach(grade => {
        html += `
            <tr>
                <td>${grade.id}</td>
                <td>${grade.student?.first_name || ''} ${grade.student?.last_name || ''}</td>
                <td>${grade.course?.title || ''}</td>
                <td>${grade.assignment_title}</td>
                <td>${grade.grade_value.toFixed(1)}</td>
                <td>${window.formatDate(grade.submission_date)}</td>
                <td class="action-buttons">
                    <button class="action-btn edit-btn" onclick="editGrade(${grade.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteGrade(${grade.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

async function loadScheduleData() {
    try {
        const schedule = await window.fetchData('/schedule');
        updateScheduleTable(schedule || []);
    } catch (error) {
        console.error('Ошибка при загрузке расписания:', error);
        window.showEmptyState('scheduleTable', 'Ошибка загрузки данных', 'fas fa-exclamation-triangle');
    }
}

function updateScheduleTable(schedule) {
    const tbody = document.querySelector('#scheduleTable tbody');
    if (!tbody) return;
    
    if (!schedule || schedule.length === 0) {
        window.showEmptyState('scheduleTable', 'Нет занятий в расписании', 'fas fa-calendar-alt');
        return;
    }
    
    let html = '';
    schedule.forEach(item => {
        html += `
            <tr>
                <td>${item.id}</td>
                <td>${item.course?.title || ''}</td>
                <td>${window.formatDateTime(item.start_date_time)}</td>
                <td>${window.formatDateTime(item.end_date_time)}</td>
                <td class="action-buttons">
                    <button class="action-btn edit-btn" onclick="editSchedule(${item.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteSchedule(${item.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// =============== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===============
function getRoleName(roleId) {
    const roleNames = {
        1: 'Администратор',
        2: 'Преподаватель',
        3: 'Студент'
    };
    return roleNames[roleId] || `Роль ${roleId}`;
}

// =============== ЭКСПОРТ ===============
window.showUserForm = showUserForm;
window.showRoleForm = showRoleForm;
window.showTeacherForm = showTeacherForm;
window.showStudentForm = showStudentForm;
window.showCourseForm = showCourseForm;
window.showEnrollmentForm = showEnrollmentForm;
window.showGradeForm = showGradeForm;
window.showScheduleForm = showScheduleForm;

window.editUser = editUser;
window.editRole = editRole;
window.editTeacher = editTeacher;
window.editStudent = editStudent;
window.editCourse = editCourse;
window.editEnrollment = editEnrollment;
window.editGrade = editGrade;
window.editSchedule = editSchedule;

window.deleteUser = deleteUser;
window.deleteRole = deleteRole;
window.deleteTeacher = deleteTeacher;
window.deleteStudent = deleteStudent;
window.deleteCourse = deleteCourse;
window.deleteEnrollment = deleteEnrollment;
window.deleteGrade = deleteGrade;
window.deleteSchedule = deleteSchedule;

window.closeModal = closeModal;
window.openModal = openModal;

window.loadUsersData = loadUsersData;
window.loadRolesData = loadRolesData;
window.loadTeachersData = loadTeachersData;
window.loadStudentsData = loadStudentsData;
window.loadCoursesData = loadCoursesData;
window.loadEnrollmentsData = loadEnrollmentsData;
window.loadGradesData = loadGradesData;
window.loadScheduleData = loadScheduleData;