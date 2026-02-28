const mongoose = require('mongoose');

async function initializeDatabase() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mediqueue';

  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Seed data if database is empty
    const Doctor = require('../models/Doctor');
    const count = await Doctor.countDocuments();
    if (count === 0) {
      await seedDatabase();
      console.log('✅ Database seeded with demo data');
    }
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
}

async function seedDatabase() {
  const User = require('../models/User');
  const Doctor = require('../models/Doctor');
  const Patient = require('../models/Patient');
  const Appointment = require('../models/Appointment');
  const QueueEntry = require('../models/QueueEntry');
  const AnalyticsLog = require('../models/AnalyticsLog');

  // Users (password: password123 - bcrypt hash)
  const users = [
    { _id: 'u1', username: 'admin', password: '$2a$10$rQdE1xZGY8e8zQPgMYw5UuVrMdBZQIVn9mY9X2fBx3bqPzJXK8wGq', role: 'admin', name: 'Admin' },
    { _id: 'u2', username: 'reception1', password: '$2a$10$rQdE1xZGY8e8zQPgMYw5UuVrMdBZQIVn9mY9X2fBx3bqPzJXK8wGq', role: 'receptionist', name: 'Priya Sharma' },
    { _id: 'u3', username: 'doctor1', password: '$2a$10$rQdE1xZGY8e8zQPgMYw5UuVrMdBZQIVn9mY9X2fBx3bqPzJXK8wGq', role: 'doctor', name: 'Dr. Rajesh Kumar' }
  ];

  // Doctors
  const doctors = [
    { _id: 'd1', name: 'Dr. Rajesh Kumar', specialty: 'General Medicine', email: 'rajesh@clinic.com', phone: '9876543210', experience_years: 15, status: 'available', shift_start: '09:00', shift_end: '17:00', avg_consultation_mins: 15 },
    { _id: 'd2', name: 'Dr. Anita Desai', specialty: 'Pediatrics', email: 'anita@clinic.com', phone: '9876543211', experience_years: 10, status: 'available', shift_start: '09:00', shift_end: '14:00', avg_consultation_mins: 20 },
    { _id: 'd3', name: 'Dr. Vikram Singh', specialty: 'Orthopedics', email: 'vikram@clinic.com', phone: '9876543212', experience_years: 20, status: 'available', shift_start: '10:00', shift_end: '18:00', avg_consultation_mins: 25 },
    { _id: 'd4', name: 'Dr. Meera Patel', specialty: 'Dermatology', email: 'meera@clinic.com', phone: '9876543213', experience_years: 8, status: 'available', shift_start: '09:00', shift_end: '16:00', avg_consultation_mins: 12 }
  ];

  // Patients
  //no show counts means how many times pateint booked but not coming
  const patients = [
    { _id: 'p1', name: 'Amit Sharma', age: 35, gender: 'Male', phone: '9988776655', email: 'amit@email.com', medical_history: '["Hypertension", "Diabetes Type 2"]', no_show_count: 1, total_visits: 12 },
    { _id: 'p2', name: 'Sneha Gupta', age: 28, gender: 'Female', phone: '9988776656', email: 'sneha@email.com', medical_history: '["Asthma"]', no_show_count: 0, total_visits: 5 },
    { _id: 'p3', name: 'Rahul Verma', age: 45, gender: 'Male', phone: '9988776657', email: 'rahul@email.com', medical_history: '["High Cholesterol", "Back Pain"]', no_show_count: 2, total_visits: 20 },
    { _id: 'p4', name: 'Priya Nair', age: 8, gender: 'Female', phone: '9988776658', email: 'priya.parent@email.com', medical_history: '["Recurring Fever"]', no_show_count: 0, total_visits: 3 },
    { _id: 'p5', name: 'Karan Mehta', age: 55, gender: 'Male', phone: '9988776659', email: 'karan@email.com', medical_history: '["Heart Disease", "Diabetes Type 2", "Hypertension"]', no_show_count: 3, total_visits: 30 },
    { _id: 'p6', name: 'Ananya Reddy', age: 22, gender: 'Female', phone: '9988776660', email: 'ananya@email.com', medical_history: '[]', no_show_count: 0, total_visits: 1 },
    { _id: 'p7', name: 'Deepak Joshi', age: 40, gender: 'Male', phone: '9988776661', email: 'deepak@email.com', medical_history: '["Migraine"]', no_show_count: 1, total_visits: 8 },
    { _id: 'p8', name: 'Ritu Singh', age: 32, gender: 'Female', phone: '9988776662', email: 'ritu@email.com', medical_history: '["Thyroid"]', no_show_count: 0, total_visits: 6 },
    { _id: 'p9', name: 'Suresh Patel', age: 65, gender: 'Male', phone: '9988776663', email: 'suresh@email.com', medical_history: '["Arthritis", "Diabetes Type 1"]', no_show_count: 2, total_visits: 25 },
    { _id: 'p10', name: 'Kavita Jain', age: 38, gender: 'Female', phone: '9988776664', email: 'kavita@email.com', medical_history: '["PCOD", "Anxiety"]', no_show_count: 1, total_visits: 10 }
  ];

  // Appointments for today
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const appointments = [
    { _id: 'a1', patient_id: 'p1', doctor_id: 'd1', scheduled_time: new Date(todayStart.getTime() + 9 * 3600000), estimated_duration: 15, status: 'checked_in', urgency_level: 'medium', symptoms: 'Headache, Dizziness, High BP reading', no_show_score: 0.08 },
    { _id: 'a2', patient_id: 'p2', doctor_id: 'd1', scheduled_time: new Date(todayStart.getTime() + 9 * 3600000 + 20 * 60000), estimated_duration: 20, status: 'scheduled', urgency_level: 'low', symptoms: 'Seasonal allergies, Runny nose', no_show_score: 0.05 },
    { _id: 'a3', patient_id: 'p3', doctor_id: 'd1', scheduled_time: new Date(todayStart.getTime() + 9 * 3600000 + 45 * 60000), estimated_duration: 25, status: 'scheduled', urgency_level: 'medium', symptoms: 'Lower back pain, Stiffness', no_show_score: 0.15 },
    { _id: 'a4', patient_id: 'p4', doctor_id: 'd2', scheduled_time: new Date(todayStart.getTime() + 9 * 3600000 + 30 * 60000), estimated_duration: 20, status: 'scheduled', urgency_level: 'high', symptoms: 'High fever 103F, Cough, Cold for 3 days', no_show_score: 0.02 },
    { _id: 'a5', patient_id: 'p5', doctor_id: 'd1', scheduled_time: new Date(todayStart.getTime() + 10 * 3600000 + 15 * 60000), estimated_duration: 30, status: 'scheduled', urgency_level: 'high', symptoms: 'Chest pain, Shortness of breath', no_show_score: 0.22 },
    { _id: 'a6', patient_id: 'p6', doctor_id: 'd3', scheduled_time: new Date(todayStart.getTime() + 10 * 3600000), estimated_duration: 15, status: 'scheduled', urgency_level: 'low', symptoms: 'Knee pain after sports', no_show_score: 0.03 },
    { _id: 'a7', patient_id: 'p7', doctor_id: 'd1', scheduled_time: new Date(todayStart.getTime() + 11 * 3600000), estimated_duration: 15, status: 'scheduled', urgency_level: 'medium', symptoms: 'Severe migraine, Nausea', no_show_score: 0.10 },
    { _id: 'a8', patient_id: 'p8', doctor_id: 'd4', scheduled_time: new Date(todayStart.getTime() + 9 * 3600000), estimated_duration: 12, status: 'scheduled', urgency_level: 'low', symptoms: 'Skin rash, Itching', no_show_score: 0.04 }
  ];

  // Queue entries
  const queueEntries = [
    { _id: 'q1', appointment_id: 'a1', patient_id: 'p1', doctor_id: 'd1', position: 1, status: 'in_consultation', priority: 'normal', estimated_wait_mins: 0 },
    { _id: 'q2', appointment_id: 'a2', patient_id: 'p2', doctor_id: 'd1', position: 2, status: 'waiting', priority: 'normal', estimated_wait_mins: 15 },
    { _id: 'q3', appointment_id: 'a3', patient_id: 'p3', doctor_id: 'd1', position: 3, status: 'waiting', priority: 'normal', estimated_wait_mins: 35 },
    { _id: 'q4', appointment_id: 'a4', patient_id: 'p4', doctor_id: 'd2', position: 1, status: 'waiting', priority: 'high', estimated_wait_mins: 5 },
    { _id: 'q5', appointment_id: 'a5', patient_id: 'p5', doctor_id: 'd1', position: 4, status: 'waiting', priority: 'high', estimated_wait_mins: 60 },
    { _id: 'q6', appointment_id: 'a6', patient_id: 'p6', doctor_id: 'd3', position: 1, status: 'waiting', priority: 'normal', estimated_wait_mins: 10 },
    { _id: 'q7', appointment_id: 'a8', patient_id: 'p8', doctor_id: 'd4', position: 1, status: 'waiting', priority: 'normal', estimated_wait_mins: 5 }
  ];

  // Analytics logs for the past week
  const daysAgo = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const analyticsLogs = [
    { _id: 'al1', doctor_id: 'd1', log_date: daysAgo(6), total_patients: 22, avg_wait_time: 28.5, avg_consultation_time: 16.2, no_shows: 3, emergencies: 1, walk_ins: 5, utilization_pct: 78.5 },
    { _id: 'al2', doctor_id: 'd1', log_date: daysAgo(5), total_patients: 25, avg_wait_time: 32.1, avg_consultation_time: 17.8, no_shows: 2, emergencies: 0, walk_ins: 6, utilization_pct: 85.2 },
    { _id: 'al3', doctor_id: 'd1', log_date: daysAgo(4), total_patients: 18, avg_wait_time: 22.3, avg_consultation_time: 14.5, no_shows: 1, emergencies: 2, walk_ins: 3, utilization_pct: 68.0 },
    { _id: 'al4', doctor_id: 'd1', log_date: daysAgo(3), total_patients: 28, avg_wait_time: 38.7, avg_consultation_time: 18.2, no_shows: 4, emergencies: 1, walk_ins: 8, utilization_pct: 92.1 },
    { _id: 'al5', doctor_id: 'd1', log_date: daysAgo(2), total_patients: 20, avg_wait_time: 25.0, avg_consultation_time: 15.0, no_shows: 2, emergencies: 0, walk_ins: 4, utilization_pct: 72.5 },
    { _id: 'al6', doctor_id: 'd1', log_date: daysAgo(1), total_patients: 24, avg_wait_time: 30.2, avg_consultation_time: 16.8, no_shows: 3, emergencies: 1, walk_ins: 7, utilization_pct: 82.0 },
    { _id: 'al7', doctor_id: 'd1', log_date: daysAgo(0), total_patients: 15, avg_wait_time: 20.0, avg_consultation_time: 15.5, no_shows: 1, emergencies: 0, walk_ins: 3, utilization_pct: 65.0 },
    { _id: 'al8', doctor_id: 'd2', log_date: daysAgo(6), total_patients: 15, avg_wait_time: 20.0, avg_consultation_time: 18.5, no_shows: 1, emergencies: 0, walk_ins: 3, utilization_pct: 72.0 },
    { _id: 'al9', doctor_id: 'd2', log_date: daysAgo(5), total_patients: 18, avg_wait_time: 25.0, avg_consultation_time: 20.0, no_shows: 2, emergencies: 1, walk_ins: 4, utilization_pct: 80.0 },
    { _id: 'al10', doctor_id: 'd2', log_date: daysAgo(4), total_patients: 12, avg_wait_time: 18.0, avg_consultation_time: 19.0, no_shows: 0, emergencies: 0, walk_ins: 2, utilization_pct: 60.0 },
    { _id: 'al11', doctor_id: 'd3', log_date: daysAgo(3), total_patients: 10, avg_wait_time: 22.0, avg_consultation_time: 24.0, no_shows: 1, emergencies: 0, walk_ins: 2, utilization_pct: 65.0 },
    { _id: 'al12', doctor_id: 'd3', log_date: daysAgo(2), total_patients: 14, avg_wait_time: 28.0, avg_consultation_time: 25.0, no_shows: 2, emergencies: 1, walk_ins: 3, utilization_pct: 75.0 },
    { _id: 'al13', doctor_id: 'd4', log_date: daysAgo(1), total_patients: 20, avg_wait_time: 15.0, avg_consultation_time: 11.0, no_shows: 1, emergencies: 0, walk_ins: 5, utilization_pct: 70.0 },
    { _id: 'al14', doctor_id: 'd4', log_date: daysAgo(0), total_patients: 12, avg_wait_time: 12.0, avg_consultation_time: 10.5, no_shows: 0, emergencies: 0, walk_ins: 2, utilization_pct: 55.0 }
  ];

  // Insert all seed data
  await User.insertMany(users);
  await Doctor.insertMany(doctors);
  await Patient.insertMany(patients);
  await Appointment.insertMany(appointments);
  await QueueEntry.insertMany(queueEntries);
  await AnalyticsLog.insertMany(analyticsLogs);
}

module.exports = { initializeDatabase };
