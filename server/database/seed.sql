-- Seed Data for MediQueue AI Demo

-- Users (password: password123 - bcrypt hash)
INSERT OR IGNORE INTO users (id, username, password, role, name) VALUES
('u1', 'admin', '$2a$10$rQdE1xZGY8e8zQPgMYw5UuVrMdBZQIVn9mY9X2fBx3bqPzJXK8wGq', 'admin', 'Admin'),
('u2', 'reception1', '$2a$10$rQdE1xZGY8e8zQPgMYw5UuVrMdBZQIVn9mY9X2fBx3bqPzJXK8wGq', 'receptionist', 'Priya Sharma'),
('u3', 'doctor1', '$2a$10$rQdE1xZGY8e8zQPgMYw5UuVrMdBZQIVn9mY9X2fBx3bqPzJXK8wGq', 'doctor', 'Dr. Rajesh Kumar');

-- Doctors
INSERT OR IGNORE INTO doctors (id, name, specialty, email, phone, experience_years, status, shift_start, shift_end, avg_consultation_mins) VALUES
('d1', 'Dr. Rajesh Kumar', 'General Medicine', 'rajesh@clinic.com', '9876543210', 15, 'available', '09:00', '17:00', 15),
('d2', 'Dr. Anita Desai', 'Pediatrics', 'anita@clinic.com', '9876543211', 10, 'available', '09:00', '14:00', 20),
('d3', 'Dr. Vikram Singh', 'Orthopedics', 'vikram@clinic.com', '9876543212', 20, 'available', '10:00', '18:00', 25),
('d4', 'Dr. Meera Patel', 'Dermatology', 'meera@clinic.com', '9876543213', 8, 'available', '09:00', '16:00', 12);

-- Patients
INSERT OR IGNORE INTO patients (id, name, age, gender, phone, email, medical_history, no_show_count, total_visits) VALUES
('p1', 'Amit Sharma', 35, 'Male', '9988776655', 'amit@email.com', '["Hypertension", "Diabetes Type 2"]', 1, 12),
('p2', 'Sneha Gupta', 28, 'Female', '9988776656', 'sneha@email.com', '["Asthma"]', 0, 5),
('p3', 'Rahul Verma', 45, 'Male', '9988776657', 'rahul@email.com', '["High Cholesterol", "Back Pain"]', 2, 20),
('p4', 'Priya Nair', 8, 'Female', '9988776658', 'priya.parent@email.com', '["Recurring Fever"]', 0, 3),
('p5', 'Karan Mehta', 55, 'Male', '9988776659', 'karan@email.com', '["Heart Disease", "Diabetes Type 2", "Hypertension"]', 3, 30),
('p6', 'Ananya Reddy', 22, 'Female', '9988776660', 'ananya@email.com', '[]', 0, 1),
('p7', 'Deepak Joshi', 40, 'Male', '9988776661', 'deepak@email.com', '["Migraine"]', 1, 8),
('p8', 'Ritu Singh', 32, 'Female', '9988776662', 'ritu@email.com', '["Thyroid"]', 0, 6),
('p9', 'Suresh Patel', 65, 'Male', '9988776663', 'suresh@email.com', '["Arthritis", "Diabetes Type 1"]', 2, 25),
('p10', 'Kavita Jain', 38, 'Female', '9988776664', 'kavita@email.com', '["PCOD", "Anxiety"]', 1, 10);

-- Sample Appointments for today
INSERT OR IGNORE INTO appointments (id, patient_id, doctor_id, scheduled_time, estimated_duration, status, urgency_level, symptoms, no_show_score) VALUES
('a1', 'p1', 'd1', datetime('now', 'start of day', '+9 hours'), 15, 'checked_in', 'medium', 'Headache, Dizziness, High BP reading', 0.08),
('a2', 'p2', 'd1', datetime('now', 'start of day', '+9 hours', '+20 minutes'), 20, 'scheduled', 'low', 'Seasonal allergies, Runny nose', 0.05),
('a3', 'p3', 'd1', datetime('now', 'start of day', '+9 hours', '+45 minutes'), 25, 'scheduled', 'medium', 'Lower back pain, Stiffness', 0.15),
('a4', 'p4', 'd2', datetime('now', 'start of day', '+9 hours', '+30 minutes'), 20, 'scheduled', 'high', 'High fever 103F, Cough, Cold for 3 days', 0.02),
('a5', 'p5', 'd1', datetime('now', 'start of day', '+10 hours', '+15 minutes'), 30, 'scheduled', 'high', 'Chest pain, Shortness of breath', 0.22),
('a6', 'p6', 'd3', datetime('now', 'start of day', '+10 hours'), 15, 'scheduled', 'low', 'Knee pain after sports', 0.03),
('a7', 'p7', 'd1', datetime('now', 'start of day', '+11 hours'), 15, 'scheduled', 'medium', 'Severe migraine, Nausea', 0.10),
('a8', 'p8', 'd4', datetime('now', 'start of day', '+9 hours'), 12, 'scheduled', 'low', 'Skin rash, Itching', 0.04);

-- Queue entries
INSERT OR IGNORE INTO queue_entries (id, appointment_id, patient_id, doctor_id, position, status, priority, estimated_wait_mins) VALUES
('q1', 'a1', 'p1', 'd1', 1, 'in_consultation', 'normal', 0),
('q2', 'a2', 'p2', 'd1', 2, 'waiting', 'normal', 15),
('q3', 'a3', 'p3', 'd1', 3, 'waiting', 'normal', 35),
('q4', 'a4', 'p4', 'd2', 1, 'waiting', 'high', 5),
('q5', 'a5', 'p5', 'd1', 4, 'waiting', 'high', 60),
('q6', 'a6', 'p6', 'd3', 1, 'waiting', 'normal', 10),
('q7', 'a8', 'p8', 'd4', 1, 'waiting', 'normal', 5);

-- Analytics logs for the past week
INSERT OR IGNORE INTO analytics_logs (id, doctor_id, log_date, total_patients, avg_wait_time, avg_consultation_time, no_shows, emergencies, walk_ins, utilization_pct) VALUES
('al1', 'd1', date('now', '-6 days'), 22, 28.5, 16.2, 3, 1, 5, 78.5),
('al2', 'd1', date('now', '-5 days'), 25, 32.1, 17.8, 2, 0, 6, 85.2),
('al3', 'd1', date('now', '-4 days'), 18, 22.3, 14.5, 1, 2, 3, 68.0),
('al4', 'd1', date('now', '-3 days'), 28, 38.7, 18.2, 4, 1, 8, 92.1),
('al5', 'd1', date('now', '-2 days'), 20, 25.0, 15.0, 2, 0, 4, 72.5),
('al6', 'd1', date('now', '-1 day'), 24, 30.2, 16.8, 3, 1, 7, 82.0),
('al7', 'd1', date('now'), 15, 20.0, 15.5, 1, 0, 3, 65.0),
('al8', 'd2', date('now', '-6 days'), 15, 20.0, 18.5, 1, 0, 3, 72.0),
('al9', 'd2', date('now', '-5 days'), 18, 25.0, 20.0, 2, 1, 4, 80.0),
('al10', 'd2', date('now', '-4 days'), 12, 18.0, 19.0, 0, 0, 2, 60.0),
('al11', 'd3', date('now', '-3 days'), 10, 22.0, 24.0, 1, 0, 2, 65.0),
('al12', 'd3', date('now', '-2 days'), 14, 28.0, 25.0, 2, 1, 3, 75.0),
('al13', 'd4', date('now', '-1 day'), 20, 15.0, 11.0, 1, 0, 5, 70.0),
('al14', 'd4', date('now'), 12, 12.0, 10.5, 0, 0, 2, 55.0);
