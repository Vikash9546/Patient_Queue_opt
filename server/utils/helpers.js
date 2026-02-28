const { v4: uuidv4 } = require('uuid');

const SYMPTOMS_LIST = [
    'Headache', 'Fever', 'Cough', 'Cold', 'Body Ache', 'Sore Throat',
    'Fatigue', 'Nausea', 'Vomiting', 'Diarrhea', 'Chest Pain', 'Back Pain',
    'Joint Pain', 'Skin Rash', 'Dizziness', 'Shortness of Breath',
    'Abdominal Pain', 'Migraine', 'High BP', 'Allergic Reaction'
];

const NAMES = [
    'Aarav Patel', 'Vivaan Sharma', 'Aditya Kumar', 'Sai Mehta', 'Arjun Reddy',
    'Diya Gupta', 'Saanvi Joshi', 'Isha Nair', 'Ananya Singh', 'Riya Kapoor',
    'Rohan Verma', 'Neha Desai', 'Varun Malhotra', 'Pooja Agarwal', 'Kunal Das',
    'Snehal Patil', 'Tanvi Iyer', 'Harsh Bansal', 'Simran Kaur', 'Manish Rao',
    'Preeti Saxena', 'Nikhil Chandra', 'Megha Pillai', 'Rajat Tiwari', 'Swati Bose',
    'Akash Mishra', 'Kavya Hegde', 'Tushar Pandey', 'Shruti Kulkarni', 'Vishal Dubey'
];

const URGENCY_LEVELS = ['low', 'medium', 'high', 'emergency'];
const URGENCY_WEIGHTS = [0.4, 0.35, 0.2, 0.05];

function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function weightedChoice(items, weights) {
    const r = Math.random();
    let cumulative = 0;
    for (let i = 0; i < items.length; i++) {
        cumulative += weights[i];
        if (r <= cumulative) return items[i];
    }
    return items[items.length - 1];
}

function generateId() {
    return uuidv4();
}

function formatTime(date) {
    return date.toISOString().replace('T', ' ').split('.')[0];
}

function addMinutes(date, mins) {
    return new Date(date.getTime() + mins * 60000);
}

module.exports = {
    SYMPTOMS_LIST, NAMES, URGENCY_LEVELS, URGENCY_WEIGHTS,
    randomChoice, weightedChoice, generateId, formatTime, addMinutes
};
