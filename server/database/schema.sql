-- MediQueue AI Database Schema

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'receptionist',
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    age INTEGER,
    gender TEXT,
    phone TEXT,
    email TEXT,
    medical_history TEXT DEFAULT '[]',
    no_show_count INTEGER DEFAULT 0,
    total_visits INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS doctors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    specialty TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    experience_years INTEGER DEFAULT 0,
    status TEXT DEFAULT 'available',
    shift_start TEXT DEFAULT '09:00',
    shift_end TEXT DEFAULT '17:00',
    avg_consultation_mins INTEGER DEFAULT 15,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    doctor_id TEXT NOT NULL,
    scheduled_time DATETIME NOT NULL,
    estimated_duration INTEGER DEFAULT 15,
    status TEXT DEFAULT 'scheduled',
    urgency_level TEXT DEFAULT 'low',
    symptoms TEXT,
    ai_notes TEXT,
    no_show_score REAL DEFAULT 0.0,
    actual_start DATETIME,
    actual_end DATETIME,
    is_walkin INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id)
);

CREATE TABLE IF NOT EXISTS queue_entries (
    id TEXT PRIMARY KEY,
    appointment_id TEXT,
    patient_id TEXT NOT NULL,
    doctor_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    status TEXT DEFAULT 'waiting',
    priority TEXT DEFAULT 'normal',
    estimated_wait_mins INTEGER DEFAULT 0,
    checked_in_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    called_at DATETIME,
    completed_at DATETIME,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id),
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id)
);

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    patient_id TEXT,
    doctor_id TEXT,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    channel TEXT DEFAULT 'app',
    is_read INTEGER DEFAULT 0,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id)
);

CREATE TABLE IF NOT EXISTS analytics_logs (
    id TEXT PRIMARY KEY,
    doctor_id TEXT,
    log_date DATE NOT NULL,
    total_patients INTEGER DEFAULT 0,
    avg_wait_time REAL DEFAULT 0.0,
    avg_consultation_time REAL DEFAULT 0.0,
    no_shows INTEGER DEFAULT 0,
    emergencies INTEGER DEFAULT 0,
    walk_ins INTEGER DEFAULT 0,
    utilization_pct REAL DEFAULT 0.0,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_time ON appointments(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_queue_doctor ON queue_entries(doctor_id);
CREATE INDEX IF NOT EXISTS idx_queue_status ON queue_entries(status);
CREATE INDEX IF NOT EXISTS idx_queue_position ON queue_entries(position);
