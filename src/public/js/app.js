// Initialize FullCalendar
document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication first
    const isAuthenticated = await checkAuthStatus();
    
    if (isAuthenticated) {
        initializeApp();
    } else {
        showLoginForm();
    }
});

function initializeApp() {
    // Initialize components
    initializeTheme();
    initializeEventListeners();
    initialize3DScene();

    // Add click handlers for navigation
    const dashboardLink = document.querySelector('a[href="/"]');
    const calendarLink = document.querySelector('a[href="/calendar"]');
    const eventsLink = document.querySelector('a[href="/events"]');

    if (dashboardLink) {
        dashboardLink.addEventListener('click', (e) => {
            e.preventDefault();
            showDashboard();
        });
    }

    if (calendarLink) {
        calendarLink.addEventListener('click', (e) => {
            e.preventDefault();
            showCalendarView();
        });
    }

    if (eventsLink) {
        eventsLink.addEventListener('click', (e) => {
            e.preventDefault();
            showCalendarView(); // Reuse the calendar view for events
        });
    }

    // Show dashboard by default
    showDashboard();
}

// Add new function to show calendar view
function showCalendarView() {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    mainContent.innerHTML = `
        <div id="calendar-container"></div>
        <div id="event-form-container" class="hidden" style="display: none;">
            <div class="modal-content">
                <div class="event-form-header">
                    <h2 id="event-form-title">Create New Event</h2>
                    <button class="close-form" onclick="closeEventForm()">&times;</button>
                </div>
                <form id="event-form">
                    <div class="form-group">
                        <label for="event-title">Title</label>
                        <input type="text" id="event-title" required minlength="3">
                    </div>
                    <div class="form-group">
                        <label for="event-description">Description</label>
                        <textarea id="event-description"></textarea>
                    </div>
                    <div class="form-group">
                        <label for="event-start">Start Time</label>
                        <input type="datetime-local" id="event-start" required>
                    </div>
                    <div class="form-group">
                        <label for="event-end">End Time</label>
                        <input type="datetime-local" id="event-end" required>
                    </div>
                    <div class="form-group">
                        <label for="event-location">Location</label>
                        <input type="text" id="event-location">
                    </div>
                    <div class="form-group">
                        <label for="event-category">Category</label>
                        <select id="event-category">
                            <option value="personal">Personal</option>
                            <option value="work">Work</option>
                            <option value="social">Social</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn-secondary" onclick="closeEventForm()">Cancel</button>
                        <button type="submit" class="btn-primary">Create Event</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Initialize calendar
    const calendarEl = document.getElementById('calendar-container');
    if (calendarEl) {
        window.calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            },
            events: function(info, successCallback, failureCallback) {
                // Fetch events with current token
                fetch('/api/events', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                })
                .then(response => {
                    if (!response.ok) {
                        if (response.status === 401) {
                            localStorage.removeItem('token');
                            showLoginForm();
                            return;
                        }
                        throw new Error('Failed to fetch events');
                    }
                    return response.json();
                })
                .then(events => {
                    // Format events for the calendar
                    const formattedEvents = events.map(event => ({
                        id: event._id,
                        title: event.title,
                        start: event.start,
                        end: event.end,
                        description: event.description,
                        location: event.location,
                        category: event.category,
                        extendedProps: {
                            description: event.description,
                            location: event.location,
                            category: event.category
                        }
                    }));
                    successCallback(formattedEvents);
                })
                .catch(error => {
                    console.error('Error fetching events:', error);
                    failureCallback(error);
                });
            },
            editable: true,
            selectable: true,
            select: handleDateSelect,
            eventClick: handleEventClick,
            eventDrop: handleEventDrop,
            eventResize: handleEventResize,
            eventTimeFormat: {
                hour: '2-digit',
                minute: '2-digit',
                meridiem: false
            },
            height: 'auto'
        });

        // Render the calendar
        window.calendar.render();
    }

    // Add event form submit handler
    const eventForm = document.getElementById('event-form');
    if (eventForm) {
        eventForm.addEventListener('submit', handleEventSubmit);
    }
}

async function showDashboard() {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    const token = localStorage.getItem('token');
    if (!token) {
        showLoginForm();
        return;
    }

    try {
        // Fetch event statistics
        const response = await fetch('/api/events/statistics', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch dashboard data');
        }

        const stats = await response.json();

        // Create dashboard HTML
        mainContent.innerHTML = `
            <div class="dashboard-container">
                <div class="dashboard-header">
                    <h1>Dashboard</h1>
                </div>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <h3>Total Events</h3>
                        <div class="stat-value">${stats.totalEvents}</div>
                        <div class="stat-trend ${stats.eventsTrend > 0 ? 'positive' : 'negative'}">
                            <span>${stats.eventsTrend}%</span>
                            <span>vs last month</span>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <h3>Upcoming Events</h3>
                        <div class="stat-value">${stats.upcomingEvents}</div>
                        <div class="stat-trend">Next 7 days</div>
                    </div>
                    
                    <div class="stat-card">
                        <h3>This Month's Events</h3>
                        <div class="stat-value">${stats.monthlyEvents}</div>
                        <div class="stat-trend">
                            ${new Date().toLocaleString('default', { month: 'long' })}
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <h3>Categories</h3>
                        <div class="stat-value">${stats.categories}</div>
                        <div class="stat-trend">Different types</div>
                    </div>
                </div>
                
                <div class="dashboard-grid">
                    <div class="dashboard-card">
                        <h2>Upcoming Events</h2>
                        <div class="upcoming-events">
                            <div class="event-list">
                                ${stats.nextEvents.map(event => `
                                    <div class="event-item">
                                        <div class="event-date">
                                            <span class="day">${new Date(event.start).getDate()}</span>
                                            <span class="month">${new Date(event.start).toLocaleString('default', { month: 'short' })}</span>
                                        </div>
                                        <div class="event-details">
                                            <h3>${event.title}</h3>
                                            <p>${event.location || 'No location'}</p>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    
                    <div class="dashboard-card">
                        <h2>Events by Category</h2>
                        <div class="chart-container" id="categoryChart"></div>
                    </div>
                </div>
                
                <div class="dashboard-grid">
                    <div class="dashboard-card">
                        <h2>Monthly Event Distribution</h2>
                        <div class="chart-container" id="monthlyChart"></div>
                    </div>
                    
                    <div class="dashboard-card">
                        <h2>Event Timeline</h2>
                        <div class="chart-container" id="timelineChart"></div>
                    </div>
                </div>
            </div>
        `;

        // Initialize charts
        initializeCharts(stats);

    } catch (error) {
        console.error('Error loading dashboard:', error);
        showErrorMessage(error.message);
    }
}

function initializeCharts(stats) {
    // Category Chart
    const categoryCtx = document.getElementById('categoryChart');
    if (categoryCtx) {
        new Chart(categoryCtx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(stats.categoryDistribution),
                datasets: [{
                    data: Object.values(stats.categoryDistribution),
                    backgroundColor: [
                        '#4a90e2',
                        '#2ecc71',
                        '#e74c3c',
                        '#f39c12',
                        '#9b59b6'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    // Monthly Chart
    const monthlyCtx = document.getElementById('monthlyChart');
    if (monthlyCtx) {
        new Chart(monthlyCtx, {
            type: 'bar',
            data: {
                labels: stats.monthlyDistribution.map(d => d.month),
                datasets: [{
                    label: 'Number of Events',
                    data: stats.monthlyDistribution.map(d => d.count),
                    backgroundColor: '#4a90e2'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Timeline Chart
    const timelineCtx = document.getElementById('timelineChart');
    if (timelineCtx) {
        new Chart(timelineCtx, {
            type: 'line',
            data: {
                labels: stats.timeline.map(d => d.date),
                datasets: [{
                    label: 'Events',
                    data: stats.timeline.map(d => d.count),
                    borderColor: '#4a90e2',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}

// Authentication handling
async function checkAuthStatus() {
    const token = localStorage.getItem('token');
    if (!token) {
        showLoginForm();
        return false;
    }
    
    try {
        const response = await fetch('/api/auth/verify', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Invalid token');
        }

        const userData = await response.json();
        updateUserInfo(userData.user);
        return true;
    } catch (error) {
        console.error('Auth check error:', error);
        localStorage.removeItem('token');
        showLoginForm();
        return false;
    }
}

function showLoginForm() {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) {
        console.error('Main content container not found');
        return;
    }

    mainContent.innerHTML = `
        <div class="auth-form">
            <h2>Login</h2>
            <form id="loginForm">
                <div class="form-group">
                    <label for="email">Email:</label>
                    <input type="email" id="email" name="email" required>
                </div>
                <div class="form-group">
                    <label for="password">Password:</label>
                    <input type="password" id="password" name="password" required minlength="6">
                </div>
                <button type="submit" id="loginButton" class="btn-primary">Login</button>
            </form>
            <p>Don't have an account? <a href="#" onclick="showRegisterForm(); return false;">Register here</a></p>
        </div>
    `;
    
    const form = document.getElementById('loginForm');
    if (form) {
        form.addEventListener('submit', handleLogin);
    } else {
        console.error('Login form not found');
    }
}

function showRegisterForm() {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) {
        console.error('Main content container not found');
        return;
    }

    mainContent.innerHTML = `
        <div class="auth-form">
            <h2>Register</h2>
            <form id="registerForm">
                <div class="form-group">
                    <label for="username">Username:</label>
                    <input type="text" id="username" name="username" required minlength="3">
                </div>
                <div class="form-group">
                    <label for="email">Email:</label>
                    <input type="email" id="email" name="email" required>
                </div>
                <div class="form-group">
                    <label for="password">Password:</label>
                    <input type="password" id="password" name="password" required minlength="6">
                </div>
                <div class="form-group">
                    <label for="confirmPassword">Confirm Password:</label>
                    <input type="password" id="confirmPassword" name="confirmPassword" required minlength="6">
                </div>
                <button type="submit" id="registerButton">Register</button>
            </form>
            <p>Already have an account? <a href="#" onclick="showLoginForm(); return false;">Login here</a></p>
        </div>
    `;

    const form = document.querySelector('#registerForm');
    const registerButton = document.querySelector('#registerButton');

    if (!form || !registerButton) {
        console.error('Register form elements not found');
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const password = form.password.value;
        const confirmPassword = form.confirmPassword.value;
        
        if (password !== confirmPassword) {
            showErrorMessage('Passwords do not match');
            return;
        }

        registerButton.disabled = true;
        registerButton.textContent = 'Registering...';

        try {
            console.log('Sending registration request...');
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    username: form.username.value.trim(),
                    email: form.email.value.trim(),
                    password: password
                })
            });

            console.log('Response status:', response.status);
            const data = await response.json();
            console.log('Response data:', data);

            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }

            // Store the token and update user info
            localStorage.setItem('token', data.token);
            if (data.user) {
                updateUserInfo(data.user);
            }

            showSuccessMessage('Registration successful! Redirecting to dashboard...');
            
            // Render calendar if it exists
            if (window.calendar) {
                window.calendar.render();
            }

            // Reload the page after a short delay to initialize authenticated state
            setTimeout(() => {
                location.reload();
            }, 2000);
        } catch (error) {
            console.error('Registration error:', error);
            showErrorMessage(error.message || 'An error occurred during registration');
        } finally {
            registerButton.disabled = false;
            registerButton.textContent = 'Register';
        }
    });
}

async function handleLogin(event) {
    event.preventDefault();
    
    const loginButton = event.target.querySelector('button');
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        loginButton.disabled = true;
        loginButton.textContent = 'Logging in...';

        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Login failed');
        }

        // Store token
        localStorage.setItem('token', data.token);
        
        // Update user info
        if (data.user) {
            updateUserInfo(data.user);
        }

        // Show success message
        showSuccessMessage('Login successful! Loading your dashboard...');

        // Show dashboard with calendar
        showDashboard();

    } catch (error) {
        console.error('Login error:', error);
        showErrorMessage(error.message || 'Login failed. Please check your credentials.');
    } finally {
        loginButton.disabled = false;
        loginButton.textContent = 'Login';
    }
}

function updateUserInfo(userData) {
    const usernameElement = document.getElementById('username');
    if (usernameElement && userData) {
        // First try to use username, if not available use email
        const displayName = userData.username || userData.name || userData.email;
        usernameElement.textContent = displayName;
    }
    
    // Update navigation visibility based on authentication
    const navLinks = document.querySelector('.nav-links');
    if (navLinks) {
        navLinks.style.display = 'flex';
    }
}

// Theme handling
function initializeTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (prefersDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });
}

// Event handling
function initializeEventListeners() {
    const eventForm = document.getElementById('event-form');
    const aiChat = document.getElementById('ai-chat');
    const closeChatBtn = document.querySelector('.close-chat');
    const sendMessageBtn = document.querySelector('.send-message');

    eventForm.addEventListener('submit', handleEventSubmit);
    closeChatBtn.addEventListener('click', () => aiChat.classList.add('hidden'));
    sendMessageBtn.addEventListener('click', handleAIChatMessage);
}

// 3D Scene initialization
function initialize3DScene() {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    
    renderer.setSize(200, 200);
    document.querySelector('.logo').appendChild(renderer.domElement);

    // Create a simple 3D cube
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x4a90e2 });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    camera.position.z = 2;

    // Animation
    function animate() {
        requestAnimationFrame(animate);
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
        renderer.render(scene, camera);
    }
    animate();
}

// Close any open modals
function closeAllModals() {
    // Close event form if open
    const formContainer = document.getElementById('event-form-container');
    if (formContainer) {
        formContainer.classList.add('hidden');
        formContainer.style.display = 'none';
        document.getElementById('event-form').reset();
    }
    
    // Close event details modal if open
    const eventModal = document.querySelector('.event-modal');
    if (eventModal) {
        eventModal.remove();
    }
    
    // Restore scrolling
    document.body.style.overflow = '';
}

// Calendar event handlers
async function handleDateSelect(selectInfo) {
    const formContainer = document.getElementById('event-form-container');
    if (!formContainer) return;
    
    // Close any open modals first
    closeAllModals();
    
    formContainer.classList.remove('hidden');
    formContainer.style.display = 'flex';
    
    // Set default dates in form
    const startDate = new Date(selectInfo.start);
    const endDate = new Date(selectInfo.end);
    
    // Format dates for datetime-local input
    const formatDateForInput = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };
    
    document.getElementById('event-start').value = formatDateForInput(startDate);
    document.getElementById('event-end').value = formatDateForInput(endDate);
    
    // Reset form title and button text
    document.getElementById('event-form-title').textContent = 'Create New Event';
    const submitButton = document.getElementById('event-form').querySelector('button[type="submit"]');
    submitButton.textContent = 'Create Event';
    
    // Clear any existing event ID
    document.getElementById('event-form').dataset.eventId = '';
    
    // Prevent scrolling on the body when form is open
    document.body.style.overflow = 'hidden';
    
    // Add click handler to close modal when clicking outside
    formContainer.addEventListener('click', (e) => {
        if (e.target === formContainer) {
            closeEventForm();
        }
    });
}

function closeEventForm() {
    const formContainer = document.getElementById('event-form-container');
    if (formContainer) {
        formContainer.classList.add('hidden');
        formContainer.style.display = 'none';
        document.getElementById('event-form').reset();
    }
    document.body.style.overflow = '';
}

async function handleEventClick(clickInfo) {
    // Prevent the default calendar behavior
    clickInfo.jsEvent.preventDefault();
    
    // Close any open modals first
    closeAllModals();
    
    const event = clickInfo.event;
    const eventData = {
        id: event.id,
        title: event.title,
        description: event.extendedProps.description,
        start: event.start,
        end: event.end,
        location: event.extendedProps.location,
        category: event.extendedProps.category
    };
    showEventDetails(eventData);
}

async function handleEventDrop(dropInfo) {
    const event = dropInfo.event;
    try {
        const response = await fetch(`/api/events/${event.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                start: event.startStr,
                end: event.endStr
            })
        });

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('token');
                showLoginForm();
                return;
            }
            throw new Error('Failed to update event');
        }
        showSuccessMessage('Event updated successfully!');
    } catch (error) {
        console.error('Error updating event:', error);
        showErrorMessage(error.message);
        dropInfo.revert();
    }
}

async function handleEventResize(resizeInfo) {
    const event = resizeInfo.event;
    try {
        const response = await fetch(`/api/events/${event.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                start: event.startStr,
                end: event.endStr
            })
        });

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('token');
                showLoginForm();
                return;
            }
            throw new Error('Failed to update event');
        }
        showSuccessMessage('Event updated successfully!');
    } catch (error) {
        console.error('Error updating event:', error);
        showErrorMessage(error.message);
        resizeInfo.revert();
    }
}

// Form submission handler
async function handleEventSubmit(event) {
    event.preventDefault();
    
    const submitButton = event.target.querySelector('button[type="submit"]');
    const eventId = event.target.dataset.eventId;
    const formData = {
        title: document.getElementById('event-title').value,
        description: document.getElementById('event-description').value,
        start: document.getElementById('event-start').value,
        end: document.getElementById('event-end').value,
        location: document.getElementById('event-location').value,
        category: document.getElementById('event-category').value
    };

    try {
        submitButton.disabled = true;
        submitButton.textContent = eventId ? 'Updating Event...' : 'Creating Event...';

        const url = eventId ? `/api/events/${eventId}` : '/api/events';
        const method = eventId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('token');
                showLoginForm();
                return;
            }
            throw new Error('Failed to ' + (eventId ? 'update' : 'create') + ' event');
        }

        const newEvent = await response.json();
        
        if (eventId) {
            // Update existing event
            const existingEvent = calendar.getEventById(eventId);
            if (existingEvent) {
                existingEvent.setProp('title', newEvent.title);
                existingEvent.setStart(newEvent.start);
                existingEvent.setEnd(newEvent.end);
                existingEvent.setExtendedProp('description', newEvent.description);
                existingEvent.setExtendedProp('location', newEvent.location);
                existingEvent.setExtendedProp('category', newEvent.category);
            }
            showSuccessMessage('Event updated successfully!');
        } else {
            // Add new event
            calendar.addEvent({
                id: newEvent._id,
                title: newEvent.title,
                start: newEvent.start,
                end: newEvent.end,
                description: newEvent.description,
                location: newEvent.location,
                category: newEvent.category,
                extendedProps: {
                    description: newEvent.description,
                    location: newEvent.location,
                    category: newEvent.category
                }
            });
            showSuccessMessage('Event created successfully!');
        }

        closeEventForm();
    } catch (error) {
        console.error('Error ' + (eventId ? 'updating' : 'creating') + ' event:', error);
        showErrorMessage(error.message);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = eventId ? 'Update Event' : 'Create Event';
    }
}

// AI Chat handler
async function handleAIChatMessage() {
    const input = document.querySelector('.chat-input input');
    const message = input.value.trim();
    
    if (!message) return;

    // Add user message to chat
    addMessageToChat('user', message);
    input.value = '';

    try {
        const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ message })
        });

        if (response.ok) {
            const data = await response.json();
            addMessageToChat('ai', data.response);
        } else {
            throw new Error('Failed to get AI response');
        }
    } catch (error) {
        addMessageToChat('error', 'Sorry, I encountered an error. Please try again.');
    }
}

// Helper functions
function addMessageToChat(sender, message) {
    const chatMessages = document.querySelector('.chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    messageDiv.textContent = message;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showEventDetails(event) {
    // Close any open modals first
    closeAllModals();

    // Create modal container
    const modal = document.createElement('div');
    modal.className = 'event-modal';
    
    // Format dates
    const startDate = new Date(event.start).toLocaleString();
    const endDate = new Date(event.end).toLocaleString();
    
    modal.innerHTML = `
        <div class="event-modal-overlay">
            <div class="event-modal-wrapper">
                <div class="event-modal-header">
                    <h2>${event.title}</h2>
                    <button class="close-modal" onclick="closeAllModals()">&times;</button>
                </div>
                <div class="event-modal-body">
                    ${event.description ? `
                        <div class="event-detail">
                            <h3>Description</h3>
                            <p>${event.description}</p>
                        </div>
                    ` : ''}
                    <div class="event-detail">
                        <h3>Time</h3>
                        <p><strong>Start:</strong> ${startDate}</p>
                        <p><strong>End:</strong> ${endDate}</p>
                    </div>
                    ${event.location ? `
                        <div class="event-detail">
                            <h3>Location</h3>
                            <p>${event.location}</p>
                        </div>
                    ` : ''}
                    ${event.category ? `
                        <div class="event-detail">
                            <h3>Category</h3>
                            <p>${event.category}</p>
                        </div>
                    ` : ''}
                </div>
                <div class="event-modal-footer">
                    <button class="btn-secondary" onclick="closeAllModals()">Close</button>
                    <button class="btn-primary" onclick="editEvent('${event.id}')">Edit</button>
                    <button class="btn-danger" onclick="deleteEvent('${event.id}')">Delete</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Prevent scrolling on the body when modal is open
    document.body.style.overflow = 'hidden';

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.classList.contains('event-modal-overlay')) {
            closeAllModals();
        }
    });
}

function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    // Remove any existing error messages
    const existingError = document.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // Insert the error message at the top of the form
    const form = document.querySelector('form');
    if (form) {
        form.insertBefore(errorDiv, form.firstChild);
        
        // Auto-remove the message after 5 seconds
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
}

function showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    
    // Remove any existing success messages
    const existingSuccess = document.querySelector('.success-message');
    if (existingSuccess) {
        existingSuccess.remove();
    }
    
    // Insert the success message at the top of the form
    const form = document.querySelector('form');
    if (form) {
        form.insertBefore(successDiv, form.firstChild);
        
        // Auto-remove the message after 5 seconds
        setTimeout(() => {
            successDiv.remove();
        }, 5000);
    }
}

// API helper functions
async function editEvent(eventId) {
    try {
        const response = await fetch(`/api/events/${eventId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('token');
                showLoginForm();
                return;
            }
            throw new Error('Failed to fetch event details');
        }

        const event = await response.json();
        
        // Close any open modals first
        closeAllModals();
        
        // Show the form
        const formContainer = document.getElementById('event-form-container');
        if (!formContainer) return;
        
        formContainer.classList.remove('hidden');
        formContainer.style.display = 'flex';  // Explicitly set display to flex
        
        // Populate form fields
        document.getElementById('event-title').value = event.title;
        document.getElementById('event-description').value = event.description || '';
        document.getElementById('event-start').value = formatDateForInput(new Date(event.start));
        document.getElementById('event-end').value = formatDateForInput(new Date(event.end));
        document.getElementById('event-location').value = event.location || '';
        document.getElementById('event-category').value = event.category || 'personal';
        
        // Update form title and button text
        document.getElementById('event-form-title').textContent = 'Edit Event';
        const submitButton = document.getElementById('event-form').querySelector('button[type="submit"]');
        submitButton.textContent = 'Update Event';
        
        // Store event ID for update
        document.getElementById('event-form').dataset.eventId = eventId;
        
        // Prevent scrolling on the body when form is open
        document.body.style.overflow = 'hidden';
        
        // Add click handler to close modal when clicking outside
        formContainer.addEventListener('click', (e) => {
            if (e.target === formContainer) {
                closeEventForm();
            }
        });
    } catch (error) {
        console.error('Error fetching event details:', error);
        showErrorMessage(error.message);
    }
}

function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

async function deleteEvent(eventId) {
    if (!confirm('Are you sure you want to delete this event?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/events/${eventId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('token');
                showLoginForm();
                return;
            }
            throw new Error('Failed to delete event');
        }

        const event = calendar.getEventById(eventId);
        if (event) {
            event.remove();
        }
        
        // Close all modals after successful deletion
        closeAllModals();
        
        showSuccessMessage('Event deleted successfully!');
    } catch (error) {
        console.error('Error deleting event:', error);
        showErrorMessage(error.message);
    }
}

// Profile Navigation
function showProfile() {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    const token = localStorage.getItem('token');
    if (!token) {
        showLoginForm();
        return;
    }

    mainContent.innerHTML = `
        <div class="profile-container">
            <div class="profile-header">
                <h2>My Profile</h2>
            </div>
            <div class="profile-content">
                <div class="profile-section">
                    <h3>Update Profile</h3>
                    <form id="profile-update-form" class="profile-form">
                        <div class="form-group">
                            <label for="profile-username">Username</label>
                            <input type="text" id="profile-username" name="username" required>
                    </div>
                        <div class="form-group">
                            <label for="profile-email">Email</label>
                            <input type="email" id="profile-email" name="email" required>
                </div>
                        <div class="form-group">
                            <label for="profile-bio">Bio</label>
                            <textarea id="profile-bio" name="bio" rows="4"></textarea>
                    </div>
                        <div class="form-group">
                            <label for="profile-avatar">Profile Picture</label>
                            <input type="file" id="profile-avatar" name="avatar" accept="image/*">
                </div>
                        <div class="form-actions">
                            <button type="submit" class="btn-primary">Update Profile</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    // Load user data
    loadUserProfile();
    
    // Add form submit handler
    const form = document.getElementById('profile-update-form');
    if (form) {
        form.addEventListener('submit', handleProfileUpdate);
    }
}

async function loadUserProfile() {
    try {
        const response = await fetch('/api/users/profile', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('token');
                showLoginForm();
                return;
            }
            throw new Error('Failed to load profile');
        }

        const userData = await response.json();
        
        // Update form fields with user data
        const usernameInput = document.getElementById('profile-username');
        const emailInput = document.getElementById('profile-email');
        const bioInput = document.getElementById('profile-bio');
        
        if (usernameInput) usernameInput.value = userData.username || '';
        if (emailInput) emailInput.value = userData.email || '';
        if (bioInput) bioInput.value = userData.bio || '';
        
        // Show success message
        showSuccessMessage('Profile loaded successfully');
    } catch (error) {
        console.error('Error loading profile:', error);
        showErrorMessage(error.message);
    }
}

async function handleProfileUpdate(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);

    try {
        submitButton.disabled = true;
        submitButton.textContent = 'Updating...';

        const response = await fetch('/api/users/profile', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('token');
                showLoginForm();
                return;
            }
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update profile');
        }

        const updatedUser = await response.json();
        
        // Update the form with the new data
        document.getElementById('profile-username').value = updatedUser.username;
        document.getElementById('profile-email').value = updatedUser.email;
        document.getElementById('profile-bio').value = updatedUser.bio || '';
        
        showSuccessMessage('Profile updated successfully!');
    } catch (error) {
        console.error('Error updating profile:', error);
        showErrorMessage(error.message);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Update Profile';
    }
}

function handleLogout(event) {
    event.preventDefault();
    localStorage.removeItem('token');
    window.location.href = '/login';
} 