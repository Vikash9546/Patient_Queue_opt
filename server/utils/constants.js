module.exports = {
    PATIENT_STATUS: {
        ACTIVE: 'active',
        INACTIVE: 'inactive'
    },
    APPOINTMENT_STATUS: {
        SCHEDULED: 'scheduled',
        CHECKED_IN: 'checked_in',
        IN_PROGRESS: 'in_progress',
        COMPLETED: 'completed',
        CANCELLED: 'cancelled',
        NO_SHOW: 'no_show'
    },
    QUEUE_STATUS: {
        WAITING: 'waiting',
        IN_CONSULTATION: 'in_consultation',
        COMPLETED: 'completed',
        SKIPPED: 'skipped'
    },
    DOCTOR_STATUS: {
        AVAILABLE: 'available',
        BUSY: 'busy',
        ON_BREAK: 'on_break',
        OFFLINE: 'offline'
    },
    URGENCY: {
        LOW: 'low',
        MEDIUM: 'medium',
        HIGH: 'high',
        EMERGENCY: 'emergency'
    },
    PRIORITY: {
        NORMAL: 'normal',
        HIGH: 'high',
        EMERGENCY: 'emergency'
    }
};
