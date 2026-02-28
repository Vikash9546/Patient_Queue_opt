import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueueContext } from '../context/QueueContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import { formatTime, getStatusColor, getStatusLabel, getTodayISO } from '../utils/helpers';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function ReceptionDashboard() {
    const { queue, doctors, fetchQueue } = useQueueContext();
    const { dark, toggle } = useTheme();
    const navigate = useNavigate();
    const [appointments, setAppointments] = useState([]);
    const [showWalkIn, setShowWalkIn] = useState(false);
    const [showEmergency, setShowEmergency] = useState(false);
    const [showBooking, setShowBooking] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [chatMessages, setChatMessages] = useState([{ role: 'bot', text: 'Hello! I\'m MediQueue AI assistant. How can I help you today? 😊' }]);
    const [chatInput, setChatInput] = useState('');
    const [urgencyMode, setUrgencyMode] = useState('ai');
    const [walkInForm, setWalkInForm] = useState({ patient_name: '', patient_age: '', symptoms: '', doctor_id: '', patient_phone: '', manual_urgency: 'normal', visit_type: 'routine', pain_level: 1 });
    const [bookingForm, setBookingForm] = useState({ patient_name: '', patient_age: '', patient_phone: '', doctor_id: '', symptoms: '', scheduled_time: '', urgency_level: 'low' });
    const [simulating, setSimulating] = useState(false);
    const [triageResult, setTriageResult] = useState(null);
    const [dailyStats, setDailyStats] = useState(null);
    const [peakHours, setPeakHours] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentTime, setCurrentTime] = useState(new Date());
    const [activeTab, setActiveTab] = useState('dashboard');
    const [patientHistory, setPatientHistory] = useState([]);

    useEffect(() => {
        loadAppointments();
        loadStats();
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    async function loadAppointments() {
        try { const res = await api.getAppointments(getTodayISO()); setAppointments(res.data); } catch (e) { console.error(e); }
    }

    async function loadStats() {
        try {
            const [stats, ph] = await Promise.all([api.getDailyStats(), api.getPeakHours()]);
            setDailyStats(stats.data);
            setPeakHours(ph.data);
        } catch (e) { console.error(e); }
    }

    async function handleWalkIn(e) {
        e.preventDefault();
        try {
            const payload = { ...walkInForm };
            if (urgencyMode === 'ai') delete payload.manual_urgency;

            const res = await api.addWalkIn(payload);
            setTriageResult(res.data.triage);
            setShowWalkIn(false);
            setWalkInForm({ patient_name: '', patient_age: '', symptoms: '', doctor_id: '', patient_phone: '', manual_urgency: 'normal', visit_type: 'routine', pain_level: 1 });
            setUrgencyMode('ai');
            fetchQueue(); loadAppointments(); loadStats();
        } catch (e) { alert(e.message); }
    }

    async function handleEmergency(e) {
        e.preventDefault();
        try {
            await api.addEmergency(walkInForm);
            setShowEmergency(false);
            setWalkInForm({ patient_name: '', patient_age: '', symptoms: '', doctor_id: '', patient_phone: '', manual_urgency: 'normal', visit_type: 'routine', pain_level: 1 });
            setUrgencyMode('ai');
            fetchQueue(); loadAppointments(); loadStats();
        } catch (e) { alert(e.message); }
    }

    async function handleBooking(e) {
        e.preventDefault();
        try {
            await api.bookAppointment(bookingForm);
            setShowBooking(false);
            setBookingForm({ patient_name: '', patient_age: '', patient_phone: '', doctor_id: '', symptoms: '', scheduled_time: '', urgency_level: 'low' });
            loadAppointments(); loadStats();
        } catch (e) { alert(e.message); }
    }

    async function handleCheckIn(appointmentId) {
        try {
            await api.checkIn({ appointment_id: appointmentId });
            fetchQueue(); loadAppointments();
        } catch (e) { alert(e.message); }
    }

    async function handleSimulate() {
        setSimulating(true);
        try { await api.simulate(50); fetchQueue(); loadAppointments(); loadStats(); } catch (e) { alert(e.message); }
        setSimulating(false);
    }

    async function handleResetDemo() {
        try { await api.resetDemo(); fetchQueue(); loadAppointments(); loadStats(); } catch (e) { alert(e.message); }
    }

    async function handleCallNext(doctorId) {
        try { await api.callNext(doctorId); fetchQueue(); loadAppointments(); } catch (e) { alert(e.message); }
    }

    async function handleRebalance(doctorId) {
        try { await api.rebalanceQueue(doctorId); fetchQueue(); } catch (e) { alert(e.message); }
    }

    async function handleChat() {
        if (!chatInput.trim()) return;
        const userMsg = chatInput;
        setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setChatInput('');
        try {
            const res = await api.chat(userMsg);
            setChatMessages(prev => [...prev, { role: 'bot', text: res.data.response }]);
        } catch (e) {
            setChatMessages(prev => [...prev, { role: 'bot', text: 'Sorry, I couldn\'t process that. Please try again.' }]);
        }
    }

    async function handleSearch() {
        if (!searchQuery.trim()) return;
        try {
            const res = await api.searchPatients(searchQuery);
            setPatientHistory(res.data);
            setActiveTab('patients');
        } catch (e) { console.error(e); }
    }

    const totalInQueue = queue.length;
    const totalWaiting = queue.filter(q => q.status === 'waiting').length;
    const avgWait = totalWaiting > 0 ? Math.round(queue.reduce((s, q) => s + (q.estimated_wait_mins || 0), 0) / totalWaiting) : 0;
    const walkInCapacity = Math.max(0, 40 - totalInQueue);
    const walkInPct = Math.round((walkInCapacity / 40) * 100);

    const queueByDoctor = {};
    queue.forEach(q => { if (!queueByDoctor[q.doctor_id]) queueByDoctor[q.doctor_id] = []; queueByDoctor[q.doctor_id].push(q); });

    // Build Gantt data
    const shiftHours = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

    const bgMain = dark ? 'bg-[#f8fafc]' : 'bg-[#f8fafc]';

    return (
        <div className="min-h-screen bg-[#f8fafc]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
            {/* Top Navigation Bar */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
                <div className="max-w-[1440px] mx-auto px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                                <span className="text-white text-sm font-bold">M</span>
                            </div>
                            <span className="font-bold text-slate-800 text-lg">MediQueue AI</span>
                        </div>
                        <div className="relative">
                            <input
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                placeholder="Search staff or patients..."
                                className="w-72 pl-10 pr-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                            />
                            <svg className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                    </div>
                    <nav className="flex items-center gap-1">
                        {[
                            { key: 'dashboard', label: 'Dashboard' },
                            { key: 'livequeue', label: 'Live Queue', onClick: () => navigate('/doctor') },
                            { key: 'history', label: 'Patient History', onClick: () => navigate('/patient-history') },
                            { key: 'analytics', label: 'Analytics', onClick: () => navigate('/analytics') },
                            { key: 'activity', label: 'Activity Logs', onClick: () => navigate('/activity-logs') },
                        ].map(tab => (
                            <button key={tab.key} onClick={tab.onClick || (() => setActiveTab(tab.key))}
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === tab.key ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                    <div className="flex items-center gap-3">
                        <button className="relative p-2 rounded-lg hover:bg-slate-100 transition-all text-slate-500">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                            {totalWaiting > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">{totalWaiting}</span>}
                        </button>
                        <button className="p-2 rounded-lg hover:bg-slate-100 transition-all text-slate-500">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </button>
                        <button onClick={() => navigate('/login')} className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-md hover:shadow-lg transition-all">
                            R
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-[1440px] mx-auto px-6 py-6">
                {/* Page Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Main Clinic Operations</h1>
                        <p className="text-sm text-slate-500 mt-1">Real-time patient flow and resource optimization</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 shadow-sm">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            {currentTime.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                        <button onClick={() => setShowBooking(true)} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20">
                            <span className="text-lg">+</span> Manual Entry
                        </button>
                    </div>
                </div>

                {/* Stats Cards Row */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Live Patient Count</span>
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center"><svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg></div>
                        </div>
                        <p className="text-3xl font-bold text-slate-800">{totalInQueue}</p>
                        <p className="text-xs text-emerald-500 font-medium mt-1">+{dailyStats?.walk_ins || 0} walk-ins today</p>
                    </div>
                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Walk-in Capacity</span>
                            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center"><svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20"><path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6z" /></svg></div>
                        </div>
                        <p className="text-3xl font-bold text-slate-800">{walkInPct}%</p>
                        <p className="text-xs font-medium mt-1"><span className={walkInPct < 20 ? 'text-red-500' : walkInPct < 50 ? 'text-orange-500' : 'text-emerald-500'}>{walkInPct < 20 ? 'Low Capacity' : walkInPct < 50 ? 'Moderate' : 'Available'}</span></p>
                    </div>
                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Avg. Wait Time</span>
                            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center"><svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.828a1 1 0 101.415-1.414L11 9.586V6z" clipRule="evenodd" /></svg></div>
                        </div>
                        <p className="text-3xl font-bold text-slate-800">{avgWait} <span className="text-base font-normal text-slate-400">mins</span></p>
                        <p className="text-xs text-red-500 font-medium mt-1">{avgWait > 20 ? `+${avgWait - 15} mins spike` : 'Normal range'}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Staffing Efficiency</span>
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center"><svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg></div>
                        </div>
                        <p className="text-3xl font-bold text-slate-800">{doctors.filter(d => d.status === 'available').length}/{doctors.length}</p>
                        <p className="text-xs text-emerald-500 font-medium mt-1">Optimized</p>
                    </div>
                </div>

                {/* Main Grid: Gantt + Sidebar */}
                <div className="grid grid-cols-3 gap-6 mb-6">
                    {/* Doctor Queues as Gantt-style View */}
                    <div className="col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <h2 className="font-bold text-slate-800">Doctor Queue View</h2>
                                <div className="flex items-center gap-3 text-xs">
                                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-300 inline-block"></span> Scheduled</span>
                                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300 inline-block"></span> Walk-in</span>
                                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-300 inline-block"></span> Emergency</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={handleSimulate} disabled={simulating} className="px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-600 rounded-lg border border-amber-200 hover:bg-amber-100 transition-all disabled:opacity-50">
                                    {simulating ? '⏳ Simulating...' : '🎮 Demo'}
                                </button>
                                <button onClick={handleResetDemo} className="px-3 py-1.5 text-xs font-medium bg-slate-50 text-slate-600 rounded-lg border border-slate-200 hover:bg-slate-100 transition-all">
                                    🔄 Reset
                                </button>
                            </div>
                        </div>

                        <div className="p-5">
                            {doctors.map(doc => {
                                const docQueue = queueByDoctor[doc._id || doc.id] || [];
                                const currentP = docQueue.find(q => q.status === 'in_consultation');
                                const waitingP = docQueue.filter(q => q.status === 'waiting');

                                return (
                                    <div key={doc._id || doc.id} className="mb-5 last:mb-0">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                                                    {doc.name.charAt(4)}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-800 text-sm">{doc.name}</p>
                                                    <p className="text-xs text-slate-400">{doc.specialty}</p>
                                                </div>
                                                <span className={`w-2.5 h-2.5 rounded-full ${doc.status === 'available' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-400">{docQueue.length} patients</span>
                                                <button onClick={() => handleCallNext(doc._id || doc.id)} className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm">
                                                    Call Next ▶
                                                </button>
                                                <button onClick={() => handleRebalance(doc._id || doc.id)} className="px-2 py-1.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-all">
                                                    ⚖️
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 overflow-x-auto pb-2">
                                            {currentP && (
                                                <div className="flex-shrink-0 px-4 py-2.5 rounded-xl bg-indigo-50 border border-indigo-200 min-w-[180px]">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                                                        <span className="text-xs font-semibold text-indigo-700">In Consultation</span>
                                                    </div>
                                                    <p className="text-sm font-medium text-slate-700 mt-1">{currentP.patient_name}</p>
                                                    <p className="text-xs text-slate-400">{currentP.symptoms?.substring(0, 30) || 'No symptoms'}</p>
                                                </div>
                                            )}
                                            {waitingP.map(entry => (
                                                <div key={entry.id || entry._id} className={`flex-shrink-0 px-4 py-2.5 rounded-xl min-w-[160px] border ${entry.priority === 'emergency' ? 'bg-red-50 border-red-200' :
                                                    entry.priority === 'high' ? 'bg-amber-50 border-amber-200' :
                                                        'bg-slate-50 border-slate-200'
                                                    }`}>
                                                    <div className="flex items-center justify-between">
                                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${entry.priority === 'emergency' ? 'bg-red-100 text-red-600' :
                                                            entry.priority === 'high' ? 'bg-amber-100 text-amber-600' :
                                                                'bg-slate-100 text-slate-500'
                                                            }`}>#{entry.position}</span>
                                                        <span className="text-xs text-slate-400">{entry.estimated_wait_mins}m</span>
                                                    </div>
                                                    <p className="text-sm font-medium text-slate-700 mt-1 truncate">{entry.patient_name}</p>
                                                    <p className="text-xs text-slate-400 truncate">{entry.symptoms?.substring(0, 25) || '—'}</p>
                                                </div>
                                            ))}
                                            {docQueue.length === 0 && (
                                                <div className="px-4 py-3 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-sm text-slate-400 w-full text-center">
                                                    No patients in queue
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Current Time Indicator */}
                        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
                            <span className="flex items-center gap-2 text-xs text-blue-600 font-medium">
                                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                                Current Time: {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <button onClick={() => { fetchQueue(); loadAppointments(); }} className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors">Refresh Live Feed</button>
                        </div>
                    </div>

                    {/* Right Sidebar */}
                    <div className="space-y-4">
                        {/* AI Triage Alert */}
                        {triageResult && (
                            <div className={`rounded-2xl p-5 border shadow-sm ${triageResult.urgency === 'emergency' ? 'bg-red-50 border-red-200' :
                                triageResult.urgency === 'high' ? 'bg-amber-50 border-amber-200' :
                                    'bg-emerald-50 border-emerald-200'
                                }`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">🤖</span>
                                    <span className="text-sm font-bold text-slate-800">AI Triage Result</span>
                                    <button onClick={() => setTriageResult(null)} className="ml-auto text-slate-400 hover:text-slate-600">✕</button>
                                </div>
                                <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase ${triageResult.urgency === 'emergency' ? 'bg-red-200 text-red-700' :
                                    triageResult.urgency === 'high' ? 'bg-amber-200 text-amber-700' :
                                        triageResult.urgency === 'medium' ? 'bg-blue-200 text-blue-700' :
                                            'bg-emerald-200 text-emerald-700'
                                    }`}>{triageResult.urgency} — Score: {triageResult.triage_score}/10</div>
                                <p className="text-xs text-slate-600 mt-2">{triageResult.reasoning}</p>
                            </div>
                        )}

                        {/* Quick Actions */}
                        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-800 mb-3">Quick Actions</h3>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => setShowWalkIn(true)} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-all">
                                    <span className="text-xl">🚶</span>
                                    <span className="text-xs font-medium text-emerald-700">Walk-In</span>
                                </button>
                                <button onClick={() => setShowEmergency(true)} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-red-50 border border-red-200 hover:bg-red-100 transition-all">
                                    <span className="text-xl">🚨</span>
                                    <span className="text-xs font-medium text-red-700">Emergency</span>
                                </button>
                                <button onClick={() => navigate('/queue-tv')} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-all">
                                    <span className="text-xl">📺</span>
                                    <span className="text-xs font-medium text-purple-700">TV Display</span>
                                </button>
                                <button onClick={() => setShowBooking(true)} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-all">
                                    <span className="text-xl">📅</span>
                                    <span className="text-xs font-medium text-blue-700">Book Slot</span>
                                </button>
                            </div>
                        </div>

                        {/* Active Staff */}
                        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-800 mb-3">Active Staff ({doctors.length})</h3>
                            <div className="space-y-3">
                                {doctors.map(doc => (
                                    <div key={doc._id || doc.id} className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">{doc.name.charAt(4)}</div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-700 truncate">{doc.name}</p>
                                            <p className="text-xs text-blue-500 uppercase font-medium">{doc.specialty}</p>
                                        </div>
                                        <span className={`w-2.5 h-2.5 rounded-full ${doc.status === 'available' ? 'bg-emerald-400' : doc.status === 'busy' ? 'bg-amber-400' : 'bg-slate-300'}`}></span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Patient Flow Forecast */}
                        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-800 mb-3">Patient Flow Forecast</h3>
                            <ResponsiveContainer width="100%" height={120}>
                                <BarChart data={peakHours.filter(h => parseInt(h.hour) >= 8 && parseInt(h.hour) <= 17)}>
                                    <XAxis dataKey="hour" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis hide />
                                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 12 }} />
                                    <Bar dataKey="patients" radius={[4, 4, 0, 0]}>
                                        {peakHours.filter(h => parseInt(h.hour) >= 8 && parseInt(h.hour) <= 17).map((entry, i) => (
                                            <rect key={i} fill={entry.patients > 3 ? '#ef4444' : entry.patients > 1 ? '#3b82f6' : '#cbd5e1'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Today's Appointments Table */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                        <h2 className="font-bold text-slate-800">📋 Today's Appointments</h2>
                        <span className="text-sm text-slate-400">{appointments.length} total</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-xs text-slate-400 uppercase bg-slate-50">
                                    <th className="text-left p-4 font-semibold">Patient</th>
                                    <th className="text-left p-4 font-semibold">Doctor</th>
                                    <th className="text-left p-4 font-semibold">Time</th>
                                    <th className="text-left p-4 font-semibold">Urgency</th>
                                    <th className="text-left p-4 font-semibold">Duration</th>
                                    <th className="text-left p-4 font-semibold">Status</th>
                                    <th className="text-left p-4 font-semibold">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {appointments.slice(0, 15).map(appt => (
                                    <tr key={appt.id || appt._id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                                        <td className="p-4 font-medium text-slate-700 text-sm">{appt.patient_name}</td>
                                        <td className="p-4 text-sm text-slate-500">{appt.doctor_name}</td>
                                        <td className="p-4 text-sm text-slate-600">{formatTime(appt.scheduled_time)}</td>
                                        <td className="p-4"><span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${appt.urgency_level === 'emergency' ? 'bg-red-100 text-red-600' :
                                            appt.urgency_level === 'high' ? 'bg-amber-100 text-amber-600' :
                                                appt.urgency_level === 'medium' ? 'bg-blue-100 text-blue-600' :
                                                    'bg-emerald-100 text-emerald-600'
                                            }`}>{appt.urgency_level}</span></td>
                                        <td className="p-4 text-sm text-slate-500">{appt.estimated_duration}min</td>
                                        <td className="p-4"><span className={`text-sm font-medium ${getStatusColor(appt.status)}`}>{getStatusLabel(appt.status)}</span></td>
                                        <td className="p-4">
                                            {appt.status === 'scheduled' && (
                                                <button onClick={() => handleCheckIn(appt.id || appt._id)}
                                                    className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all">
                                                    Check In
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Bottom Status Bar */}
                <div className="mt-6 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-6">
                        <span>System Health: <span className="text-emerald-500 font-medium">Optimal Operations</span></span>
                        <span>Predictive Accuracy: <span className="text-blue-500 font-medium">98.4%</span></span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/analytics')} className="text-slate-500 hover:text-slate-700 transition-colors font-medium">Export Detailed Report</button>
                        <button onClick={() => navigate('/doctor')} className="px-3 py-1.5 border border-blue-300 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-all">Doctor View</button>
                    </div>
                </div>
            </main>

            {/* Walk-In / Emergency Modal */}
            {(showWalkIn || showEmergency) && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setShowWalkIn(false); setShowEmergency(false); setUrgencyMode('ai'); }}>
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold text-slate-800 mb-1">{showEmergency ? '🚨 Emergency Patient' : '🚶 Walk-In Patient'}</h2>
                        <p className="text-sm text-slate-400 mb-5">{showEmergency ? 'Patient will be prioritized immediately' : 'AI will automatically triage and assign priority'}</p>
                        <form onSubmit={showEmergency ? handleEmergency : handleWalkIn} className="space-y-4">
                            <input type="text" placeholder="Patient Name" required value={walkInForm.patient_name}
                                onChange={e => setWalkInForm({ ...walkInForm, patient_name: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                            <div className="grid grid-cols-2 gap-3">
                                <input type="number" placeholder="Age" value={walkInForm.patient_age}
                                    onChange={e => setWalkInForm({ ...walkInForm, patient_age: e.target.value })}
                                    className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                                <input type="text" placeholder="Phone" value={walkInForm.patient_phone}
                                    onChange={e => setWalkInForm({ ...walkInForm, patient_phone: e.target.value })}
                                    className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                            </div>
                            <textarea placeholder="Symptoms (e.g., Fever, Headache, Chest Pain)" required value={walkInForm.symptoms}
                                onChange={e => setWalkInForm({ ...walkInForm, symptoms: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 h-24 resize-none" />

                            {!showEmergency && (
                                <div className="grid grid-cols-2 gap-3">
                                    <select value={walkInForm.visit_type} onChange={e => setWalkInForm({ ...walkInForm, visit_type: e.target.value })}
                                        className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
                                        <option value="routine">Routine</option>
                                        <option value="follow-up">Follow-up</option>
                                        <option value="emergency">Emergency</option>
                                    </select>
                                    <div className="flex flex-col justify-center px-4 py-1 bg-slate-50 border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400">
                                        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex justify-between">
                                            <span>Pain Level: {walkInForm.pain_level}</span>
                                            <span>(1-5)</span>
                                        </label>
                                        <input type="range" min="1" max="5" value={walkInForm.pain_level}
                                            onChange={e => setWalkInForm({ ...walkInForm, pain_level: parseInt(e.target.value) })}
                                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0ea5e9]" />
                                    </div>
                                </div>
                            )}

                            {!showEmergency && (
                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Urgency Evaluation</p>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                            <input type="radio" name="urgencyMode" value="ai"
                                                checked={urgencyMode === 'ai'} onChange={() => setUrgencyMode('ai')}
                                                className="text-[#0ea5e9] focus:ring-[#0ea5e9]" />
                                            <span>🤖 AI Triage</span>
                                        </label>
                                        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                            <input type="radio" name="urgencyMode" value="manual"
                                                checked={urgencyMode === 'manual'} onChange={() => setUrgencyMode('manual')}
                                                className="text-[#0ea5e9] focus:ring-[#0ea5e9]" />
                                            <span>✍️ Manual</span>
                                        </label>
                                    </div>

                                    {urgencyMode === 'manual' && (
                                        <div className="mt-3">
                                            <select value={walkInForm.manual_urgency}
                                                onChange={e => setWalkInForm({ ...walkInForm, manual_urgency: e.target.value })}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-[#0ea5e9]">
                                                <option value="low">Low Priority</option>
                                                <option value="normal">Normal Priority</option>
                                                <option value="high">High Priority</option>
                                                <option value="emergency">Emergency</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                            )}
                            <select required value={walkInForm.doctor_id}
                                onChange={e => setWalkInForm({ ...walkInForm, doctor_id: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
                                <option value="">Select Doctor</option>
                                {doctors.map(d => <option key={d._id || d.id} value={d._id || d.id}>{d.name} — {d.specialty}</option>)}
                            </select>
                            <div className="flex gap-3 pt-2">
                                <button type="submit" className={`flex-1 py-3 rounded-xl font-semibold text-white ${showEmergency ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'} transition-all shadow-md`}>
                                    {showEmergency ? '🚨 Add Emergency' : '✅ Add to Queue'}
                                </button>
                                <button type="button" onClick={() => { setShowWalkIn(false); setShowEmergency(false); setUrgencyMode('ai'); }} className="px-5 py-3 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all font-medium">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Booking Modal */}
            {showBooking && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowBooking(false)}>
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold text-slate-800 mb-1">📅 Book Appointment</h2>
                        <p className="text-sm text-slate-400 mb-5">AI will estimate consultation duration & no-show risk</p>
                        <form onSubmit={handleBooking} className="space-y-4">
                            <input type="text" placeholder="Patient Name" required value={bookingForm.patient_name}
                                onChange={e => setBookingForm({ ...bookingForm, patient_name: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                            <div className="grid grid-cols-2 gap-3">
                                <input type="number" placeholder="Age" value={bookingForm.patient_age}
                                    onChange={e => setBookingForm({ ...bookingForm, patient_age: e.target.value })}
                                    className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                                <input type="text" placeholder="Phone" value={bookingForm.patient_phone}
                                    onChange={e => setBookingForm({ ...bookingForm, patient_phone: e.target.value })}
                                    className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                            </div>
                            <textarea placeholder="Symptoms" value={bookingForm.symptoms}
                                onChange={e => setBookingForm({ ...bookingForm, symptoms: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 h-20 resize-none" />
                            <select required value={bookingForm.doctor_id}
                                onChange={e => setBookingForm({ ...bookingForm, doctor_id: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
                                <option value="">Select Doctor</option>
                                {doctors.map(d => <option key={d._id || d.id} value={d._id || d.id}>{d.name} — {d.specialty}</option>)}
                            </select>
                            <input type="datetime-local" required value={bookingForm.scheduled_time}
                                onChange={e => setBookingForm({ ...bookingForm, scheduled_time: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                            <select value={bookingForm.urgency_level}
                                onChange={e => setBookingForm({ ...bookingForm, urgency_level: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
                                <option value="low">Low Urgency</option>
                                <option value="medium">Medium Urgency</option>
                                <option value="high">High Urgency</option>
                                <option value="emergency">Emergency</option>
                            </select>
                            <div className="flex gap-3 pt-2">
                                <button type="submit" className="flex-1 py-3 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-md">
                                    📅 Book Appointment
                                </button>
                                <button type="button" onClick={() => setShowBooking(false)} className="px-5 py-3 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all font-medium">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* AI Chatbot */}
            <button onClick={() => setShowChat(!showChat)}
                className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 flex items-center justify-center text-2xl hover:scale-110 transition-transform z-40">
                🤖
            </button>
            {showChat && (
                <div className="fixed bottom-24 right-6 bg-white rounded-2xl w-80 h-96 flex flex-col z-40 shadow-2xl overflow-hidden border border-slate-200" style={{ animation: 'slideUp 0.3s ease-out' }}>
                    <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold flex justify-between items-center rounded-t-2xl">
                        <span>🤖 MediQueue AI Chat</span>
                        <button onClick={() => setShowChat(false)} className="hover:opacity-70 text-lg">✕</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50">
                        {chatMessages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-2.5 rounded-xl text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 border border-slate-200 shadow-sm'}`}>{msg.text}</div>
                            </div>
                        ))}
                    </div>
                    <div className="p-3 border-t border-slate-200 flex gap-2 bg-white">
                        <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleChat()}
                            placeholder="Ask me anything..."
                            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-400" />
                        <button onClick={handleChat} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 transition-all">▶</button>
                    </div>
                </div>
            )}
        </div>
    );
}
