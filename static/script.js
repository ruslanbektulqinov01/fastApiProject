document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const addTaskForm = document.getElementById('add-task-form');
    const taskList = document.getElementById('task-list');
    const logoutLink = document.getElementById('logout');

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    if (addTaskForm) {
        addTaskForm.addEventListener('submit', handleAddTask);
    }

    if (logoutLink) {
        logoutLink.addEventListener('click', handleLogout);
    }

    if (taskList) {
        fetchTasks();
    }
});

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch('/tasks', {
            headers: {
                'Authorization': 'Basic ' + btoa(email + ":" + password)
            }
        });

        if (response.ok) {
            localStorage.setItem('auth', btoa(email + ":" + password));
            window.location.href = '/';
        } else {
            showAlert('Login failed. Please check your credentials.', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showAlert('An error occurred during login. Please try again.', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const formData = new FormData(e.target);

    try {
        const response = await fetch('/register', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            showAlert('Registration successful. Please login.', 'success');
            setTimeout(() => window.location.href = '/login', 2000);
        } else {
            const data = await response.json();
            showAlert(data.detail || 'Registration failed. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showAlert('An error occurred during registration. Please try again.', 'error');
    }
}

async function handleAddTask(e) {
    e.preventDefault();
    const content = document.getElementById('new-task').value;
    await addTask(content);
    document.getElementById('new-task').value = '';
}

function handleLogout(e) {
    e.preventDefault();
    localStorage.removeItem('auth');
    window.location.href = '/login';
}

async function fetchTasks() {
    try {
        const response = await fetch('/tasks', {
            headers: getAuthHeaders()
        });
        if (response.ok) {
            const data = await response.json();
            updateTaskList(data.tasks);
        } else {
            throw new Error('Failed to fetch tasks');
        }
    } catch (error) {
        console.error('Error fetching tasks:', error);
        showAlert('Failed to load tasks. Please try again.', 'error');
    }
}

async function addTask(content) {
    const formData = new FormData();
    formData.append('content', content);

    try {
        const response = await fetch('/tasks', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: formData
        });

        if (response.ok) {
            fetchTasks();
            showAlert('Task added successfully.', 'success');
        } else {
            throw new Error('Failed to add task');
        }
    } catch (error) {
        console.error('Error adding task:', error);
        showAlert('Failed to add task. Please try again.', 'error');
    }
}

async function updateTask(taskId, updates) {
    const formData = new FormData();
    for (const [key, value] of Object.entries(updates)) {
        formData.append(key, value);
    }

    try {
        const response = await fetch(`/tasks/${taskId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: formData
        });

        if (response.ok) {
            fetchTasks();
            showAlert('Task updated successfully.', 'success');
        } else {
            throw new Error('Failed to update task');
        }
    } catch (error) {
        console.error('Error updating task:', error);
        showAlert('Failed to update task. Please try again.', 'error');
    }
}

async function deleteTask(taskId) {
    try {
        const response = await fetch(`/tasks/${taskId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (response.ok) {
            fetchTasks();
            showAlert('Task deleted successfully.', 'success');
        } else {
            throw new Error('Failed to delete task');
        }
    } catch (error) {
        console.error('Error deleting task:', error);
        showAlert('Failed to delete task. Please try again.', 'error');
    }
}

function updateTaskList(tasks) {
    const taskList = document.getElementById('task-list');
    taskList.innerHTML = '';

    tasks.forEach(task => {
        const li = document.createElement('li');
        li.dataset.id = task.id;
        li.classList.toggle('completed', task.completed);

        const content = document.createElement('span');
        content.textContent = task.content;
        content.classList.add('task-content');
        li.appendChild(content);

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = task.completed;
        checkbox.addEventListener('change', () => updateTask(task.id, {completed: checkbox.checked}));
        li.appendChild(checkbox);

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.classList.add('delete-btn');
        deleteBtn.addEventListener('click', () => deleteTask(task.id));
        li.appendChild(deleteBtn);

        taskList.appendChild(li);
    });
}

function getAuthHeaders() {
    const auth = localStorage.getItem('auth');
    return auth ? {'Authorization': 'Basic ' + auth} : {};
}

function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.textContent = message;
    alertDiv.classList.add('alert', type);
    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 3000);
}