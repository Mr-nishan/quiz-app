const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function request(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
    };

    let res;
    try {
        res = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers,
        });
    } catch (err) {
        // Network error – server is unreachable
        throw new Error(
            'Cannot connect to the server. Please ensure the backend is running (cd backend && npm start) and try again.'
        );
    }

    let data;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        data = await res.json();
    } else {
        // Received non-JSON (e.g. HTML from fallback route)
        const text = await res.text();
        if (res.status === 500) {
            throw new Error(
                'Internal server error (500). The backend server may need to be restarted or there may be a database issue. ' +
                'Check the terminal running the backend for error details.'
            );
        }
        throw new Error(`Unexpected response from server (${res.status}). Please check the backend terminal for errors.`);
    }

    if (!res.ok) {
        if (res.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        throw new Error(data.error || 'Request failed');
    }

    return data;
}

export const auth = {
    login: (username, password) => request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    }),
    logout: () => request('/auth/logout', { method: 'POST' }),
    verify: () => request('/auth/verify'),
    register: (username, password) => request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    }),
};

export const events = {
    list: () => request('/events'),
    get: (id) => request(`/events/${id}`),
    create: (data) => request('/events', {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    update: (id, data) => request(`/events/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    }),
    delete: (id) => request(`/events/${id}`, { method: 'DELETE' }),
};

export const questions = {
    list: (eventId) => request(`/questions/${eventId}`),
    board: (eventId) => request(`/questions/${eventId}/board`),
    create: (eventId, data) => request(`/questions/${eventId}`, {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    update: (eventId, id, data) => request(`/questions/${eventId}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    }),
    delete: (eventId, id) => request(`/questions/${eventId}/${id}`, { method: 'DELETE' }),
    bulk: (eventId, questions) => request(`/questions/${eventId}/bulk`, {
        method: 'POST',
        body: JSON.stringify({ questions }),
    }),
};

export const teams = {
    list: (eventId) => request(`/teams/${eventId}`),
    create: (eventId, data) => request(`/teams/${eventId}`, {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    update: (eventId, id, data) => request(`/teams/${eventId}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    }),
    delete: (eventId, id) => request(`/teams/${eventId}/${id}`, { method: 'DELETE' }),
};

export const quiz = {
    start: (eventId) => request(`/quiz/${eventId}/start`, { method: 'POST' }),
    state: (eventId) => request(`/quiz/${eventId}/state`),
    resume: (eventId) => request(`/quiz/${eventId}/resume`),
    select: (eventId, question_id) => request(`/quiz/${eventId}/select`, {
        method: 'POST',
        body: JSON.stringify({ question_id }),
    }),
    cancelSelect: (eventId) => request(`/quiz/${eventId}/cancel-select`, { method: 'POST' }),
    answer: (eventId, question_id, result) => request(`/quiz/${eventId}/answer`, {
        method: 'POST',
        body: JSON.stringify({ question_id, result }),
    }),
    nextTeam: (eventId) => request(`/quiz/${eventId}/next-team`, { method: 'POST' }),
    results: (eventId) => request(`/quiz/${eventId}/results`),
};