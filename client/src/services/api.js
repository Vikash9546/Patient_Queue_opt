const API_BASE = '/api';

async function request(endpoint, options = {}) {
    const token = localStorage.getItem('mediqueue_token');
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
        },
        ...options,
    };

    const res = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
}

export const api = {
    // Auth
    login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),

    // Patients
    getPatients: () => request('/patients'),
    getPatient: (id) => request(`/patients/${id}`),
    createPatient: (data) => request('/patients', { method: 'POST', body: JSON.stringify(data) }),
    searchPatients: (q) => request(`/patients/search?q=${q}`),
    getPatientHistory: ({ page, limit, q, urgency, visit_range, sort } = {}) =>
        request(`/patients/history?page=${page || 1}&limit=${limit || 10}&q=${q || ''}&urgency=${urgency || ''}&visit_range=${visit_range || ''}&sort=${sort || 'recent'}`),

    // Doctors
    getDoctors: () => request('/doctors'),
    getDoctor: (id) => request(`/doctors/${id}`),
    getDoctorSchedule: (id, date) => request(`/doctors/${id}/schedule?date=${date || ''}`),
    getDoctorSlots: (id, date) => request(`/doctors/${id}/slots?date=${date || ''}`),
    getDoctorWorkload: (id) => request(`/doctors/${id}/workload`),
    updateDoctorStatus: (id, status) => request(`/doctors/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),

    // Appointments
    getAppointments: (date, doctorId) => request(`/appointments?date=${date || ''}&doctor_id=${doctorId || ''}`),
    bookAppointment: (data) => request('/appointments', { method: 'POST', body: JSON.stringify(data) }),
    updateAppointment: (id, data) => request(`/appointments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    cancelAppointment: (id) => request(`/appointments/${id}`, { method: 'DELETE' }),

    // Queue
    getQueue: (doctorId) => request(`/queue?doctor_id=${doctorId || ''}`),
    addWalkIn: (data) => request('/queue/walkin', { method: 'POST', body: JSON.stringify(data) }),
    addEmergency: (data) => request('/queue/emergency', { method: 'POST', body: JSON.stringify(data) }),
    checkIn: (data) => request('/queue/checkin', { method: 'POST', body: JSON.stringify(data) }),
    reorderQueue: (data) => request('/queue/reorder', { method: 'PUT', body: JSON.stringify(data) }),
    rebalanceQueue: (doctorId) => request('/queue/rebalance', { method: 'POST', body: JSON.stringify({ doctor_id: doctorId }) }),
    callNext: (doctorId) => request('/queue/next', { method: 'POST', body: JSON.stringify({ doctor_id: doctorId }) }),

    // AI
    triage: (data) => request('/ai/triage', { method: 'POST', body: JSON.stringify(data) }),
    estimateDuration: (data) => request('/ai/estimate-duration', { method: 'POST', body: JSON.stringify(data) }),
    predictNoShow: (data) => request('/ai/no-show', { method: 'POST', body: JSON.stringify(data) }),
    suggestSlots: (data) => request('/ai/suggest-slots', { method: 'POST', body: JSON.stringify(data) }),
    chat: (message) => request('/ai/chat', { method: 'POST', body: JSON.stringify({ message }) }),

    // Analytics
    getDailyStats: (date) => request(`/analytics/daily?date=${date || ''}`),
    getWaitTimes: (days) => request(`/analytics/wait-times?days=${days || 7}`),
    getUtilization: (days) => request(`/analytics/utilization?days=${days || 7}`),
    getPeakHours: () => request('/analytics/peak-hours'),
    getNoShows: (days) => request(`/analytics/no-shows?days=${days || 30}`),
    getBeforeAfter: () => request('/analytics/before-after'),

    // Demo
    simulate: (count) => request('/demo/simulate', { method: 'POST', body: JSON.stringify({ count: count || 50 }) }),
    resetDemo: () => request('/demo/reset', { method: 'POST' }),
};

export default api;
