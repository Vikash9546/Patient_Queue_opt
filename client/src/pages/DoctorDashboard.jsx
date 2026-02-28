import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueueContext } from '../context/QueueContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import { formatTime, getStatusColor, getStatusLabel } from '../utils/helpers';

export default function DoctorDashboard() {
    const { queue, doctors, fetchQueue } = useQueueContext();
    const { dark, toggle } = useTheme();
    const navigate = useNavigate();
    const [selectedDoctor, setSelectedDoctor] = useState('');
    const [workload, setWorkload] = useState(null);
    const [schedule, setSchedule] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [consultTimer, setConsultTimer] = useState(0);
    const [showAlert, setShowAlert] = useState(true);
    const timerRef = useRef(null);

    useEffect(() => {
        if (doctors.length > 0 && !selectedDoctor) setSelectedDoctor(doctors[0]._id || doctors[0].id);
    }, [doctors]);

    useEffect(() => {
        if (selectedDoctor) { loadWorkload(); loadSchedule(); }
    }, [selectedDoctor]);

    // Consultation timer
    useEffect(() => {
        if (currentPatient) {
            timerRef.current = setInterval(() => setConsultTimer(prev => prev + 1), 1000);
        } else {
            clearInterval(timerRef.current);
            setConsultTimer(0);
        }
        return () => clearInterval(timerRef.current);
    }, [queue, selectedDoctor]);

    async function loadWorkload() {
        try { const res = await api.getDoctorWorkload(selectedDoctor); setWorkload(res.data); } catch (e) { }
    }
    async function loadSchedule() {
        try { const res = await api.getDoctorSchedule(selectedDoctor); setSchedule(res.data); } catch (e) { }
    }
    async function handleCallNext() {
        try { await api.callNext(selectedDoctor); fetchQueue(); loadWorkload(); loadSchedule(); } catch (e) { alert(e.message); }
    }
    async function handleStatusChange(status) {
        try { await api.updateDoctorStatus(selectedDoctor, status); } catch (e) { }
    }
    async function handleRebalance() {
        try { await api.rebalanceQueue(selectedDoctor); fetchQueue(); } catch (e) { alert(e.message); }
    }

    const doctorQueue = queue.filter(q => q.doctor_id === selectedDoctor);
    const currentPatient = doctorQueue.find(q => q.status === 'in_consultation');
    const waitingPatients = doctorQueue.filter(q => q.status === 'waiting');
    const doc = doctors.find(d => (d._id || d.id) === selectedDoctor);

    const formatTimer = (s) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    };

    const emergencyPatient = waitingPatients.find(p => p.priority === 'emergency');
    const totalCompleted = workload?.today_stats?.completed || 0;
    const totalToday = workload?.today_stats?.total || 0;
    const next3 = waitingPatients.slice(0, 3);
    const avgWait = waitingPatients.length > 0 ? Math.round(waitingPatients.reduce((s, p) => s + (p.estimated_wait_mins || 0), 0) / waitingPatients.length) : 0;

    return (
        <div className="min-h-screen bg-[#f8fafc]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
            {/* Top Navigation */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
                <div className="max-w-[1440px] mx-auto px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                                <span className="text-white text-sm font-bold">M</span>
                            </div>
                            <span className="font-bold text-slate-800 text-lg">MediQueue AI</span>
                        </div>
                        <nav className="flex items-center gap-1">
                            <button onClick={() => navigate('/reception')} className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-all">Dashboard</button>
                            <button className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg">Live Queue</button>
                            <button onClick={() => navigate('/analytics')} className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-all">Analytics</button>
                        </nav>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search patients..."
                                className="w-52 pl-9 pr-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" />
                            <svg className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        <button className="relative p-2 rounded-lg hover:bg-slate-100 transition-all text-slate-500">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                        </button>
                        <button className="p-2 rounded-lg hover:bg-slate-100 transition-all text-slate-500">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </button>
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-md">
                            {doc?.name?.charAt(4) || 'D'}
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-[1440px] mx-auto px-6 py-6 flex gap-6">
                {/* Left Sidebar — Doctor Info + Next Patients */}
                <aside className="w-64 flex-shrink-0">
                    <div className="mb-6">
                        <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider mb-2">Doctor Information</p>
                        <select value={selectedDoctor} onChange={e => setSelectedDoctor(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 font-medium focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 mb-3">
                            {doctors.map(d => <option key={d._id || d.id} value={d._id || d.id}>{d.name}</option>)}
                        </select>
                        {doc && (
                            <div>
                                <h2 className="font-bold text-slate-800 text-lg">{doc.name}</h2>
                                <p className="text-sm text-slate-400 mt-0.5">🏥 {doc.specialty}</p>
                            </div>
                        )}
                    </div>

                    {/* Status Controls */}
                    <div className="mb-6">
                        <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider mb-2">Status</p>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => handleStatusChange('available')} className="py-2 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-medium border border-emerald-200 hover:bg-emerald-100 transition-all">Available</button>
                            <button onClick={() => handleStatusChange('busy')} className="py-2 rounded-lg bg-amber-50 text-amber-600 text-xs font-medium border border-amber-200 hover:bg-amber-100 transition-all">Busy</button>
                            <button onClick={() => handleStatusChange('on_break')} className="py-2 rounded-lg bg-blue-50 text-blue-600 text-xs font-medium border border-blue-200 hover:bg-blue-100 transition-all">Break</button>
                            <button onClick={() => handleStatusChange('offline')} className="py-2 rounded-lg bg-red-50 text-red-600 text-xs font-medium border border-red-200 hover:bg-red-100 transition-all">Offline</button>
                        </div>
                    </div>

                    {/* Next Patients */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Next Patients</p>
                            <span className="text-xs text-blue-500 font-medium">Live</span>
                        </div>
                        <div className="space-y-3">
                            {next3.length === 0 && <p className="text-sm text-slate-400 text-center py-6">Queue is empty 🎉</p>}
                            {next3.map((entry) => (
                                <div key={entry.id || entry._id} className={`p-3 rounded-xl border ${entry.priority === 'emergency' ? 'border-l-4 border-l-red-500 border-red-100 bg-red-50/50' :
                                        entry.priority === 'high' ? 'border-l-4 border-l-amber-500 border-amber-100 bg-amber-50/50' :
                                            entry.priority === 'medium' ? 'border-l-4 border-l-blue-500 border-blue-100 bg-blue-50/50' :
                                                'border-l-4 border-l-emerald-500 border-emerald-100 bg-white'
                                    }`}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${entry.priority === 'emergency' ? 'bg-red-100 text-red-600' :
                                                entry.priority === 'high' ? 'bg-amber-100 text-amber-600' :
                                                    entry.priority === 'medium' ? 'bg-blue-100 text-blue-600' :
                                                        'bg-emerald-100 text-emerald-600'
                                            }`}>{entry.priority} Urgency</span>
                                        <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    </div>
                                    <p className="font-semibold text-slate-800 text-sm">#{entry.position} — {entry.patient_name}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">Walk-In (Wait: {entry.estimated_wait_mins}m)</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 min-w-0">
                    {/* Page Header */}
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">Live Queue Monitor</h1>
                            <p className="text-sm text-slate-500">Intelligent Patient Queue Optimization System</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <span className="text-xs text-slate-400 uppercase font-semibold">Current Load</span>
                                <p className={`text-sm font-bold ${waitingPatients.length > 6 ? 'text-red-500' : waitingPatients.length > 3 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                    {waitingPatients.length > 6 ? 'High Load' : waitingPatients.length > 3 ? 'Moderate' : 'Optimized'}
                                </p>
                            </div>
                            <button onClick={handleCallNext} className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 text-white rounded-xl text-sm font-semibold hover:bg-cyan-600 transition-all shadow-md shadow-cyan-500/20">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                                {currentPatient ? 'Complete & Call Next' : 'Call Next Patient'}
                            </button>
                        </div>
                    </div>

                    {/* Priority Rebalance Alert */}
                    {emergencyPatient && showAlert && (
                        <div className="bg-white rounded-2xl p-4 border border-red-200 shadow-sm mb-5 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                                <span className="text-red-500 text-lg">❗</span>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-800">Priority Rebalance Alert</span>
                                    <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded uppercase">Act Now</span>
                                </div>
                                <p className="text-sm text-slate-500">Emergency: {emergencyPatient.patient_name} requires immediate attention. Queue auto-rebalanced.</p>
                            </div>
                            <button onClick={() => { handleRebalance(); setShowAlert(false); }} className="px-4 py-2 bg-cyan-500 text-white rounded-xl text-sm font-semibold hover:bg-cyan-600 transition-all">
                                Acknowledge
                            </button>
                        </div>
                    )}

                    {/* Current Consultation Card */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center">
                                    <span className="text-cyan-600 text-lg">🩺</span>
                                </div>
                                <div>
                                    <h2 className="font-bold text-slate-800">Current Consultation</h2>
                                    {currentPatient && <p className="text-sm text-slate-400">Patient #{currentPatient.position} — {currentPatient.patient_name}</p>}
                                </div>
                            </div>
                            {currentPatient && (
                                <div className="flex items-center gap-2 text-slate-500">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    <span className="text-2xl font-bold text-slate-800 font-mono">{formatTimer(consultTimer)}</span>
                                </div>
                            )}
                        </div>

                        {currentPatient ? (
                            <div>
                                <div className="grid grid-cols-2 gap-6 mb-5">
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider mb-1">Primary Reason</p>
                                        <p className="text-sm text-slate-700 font-medium">🩻 {currentPatient.symptoms || 'General Consultation'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider mb-1">Est. Time Remaining</p>
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-cyan-400 to-cyan-600 rounded-full transition-all duration-1000"
                                                    style={{ width: `${Math.min(100, (consultTimer / ((currentPatient.estimated_duration || 15) * 60)) * 100)}%` }}></div>
                                            </div>
                                            <span className="text-sm font-bold text-cyan-500">~{Math.max(0, (currentPatient.estimated_duration || 15) - Math.floor(consultTimer / 60))} min</span>
                                        </div>
                                        <div className="flex justify-between text-xs text-slate-400 mt-1">
                                            <span>Started (0 min)</span>
                                            <span>Expected ({currentPatient.estimated_duration || 15} min)</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="flex-1 bg-slate-50 rounded-xl p-3 border border-slate-100">
                                        <p className="text-xs text-slate-400 uppercase font-semibold mb-1">AI-Driven Insights</p>
                                        <p className="text-sm text-slate-600 italic">"{currentPatient.symptoms ? `AI recommends checking related symptoms for ${currentPatient.symptoms.split(',')[0]?.trim()}.` : 'No AI insights for this session.'}"</p>
                                    </div>
                                    <button className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                        Clinical Notes
                                    </button>
                                    <button onClick={handleCallNext} className="px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-sm">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        Complete Session
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <p className="text-slate-400 mb-3">No patient currently in consultation</p>
                                <button onClick={handleCallNext}
                                    className="px-6 py-2.5 bg-cyan-500 text-white rounded-xl text-sm font-semibold hover:bg-cyan-600 transition-all shadow-md">
                                    ▶ Call First Patient
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-3 gap-4 mb-5">
                        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                                <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 uppercase font-semibold">Queue Size</p>
                                <p className="text-2xl font-bold text-slate-800">{waitingPatients.length} <span className="text-sm font-normal text-slate-400">Patients</span></p>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                                <svg className="w-6 h-6 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.828a1 1 0 101.415-1.414L11 9.586V6z" clipRule="evenodd" /></svg>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 uppercase font-semibold">Avg. Wait Time</p>
                                <p className="text-2xl font-bold text-slate-800">{avgWait} <span className="text-sm font-normal text-slate-400">Mins</span></p>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                                <svg className="w-6 h-6 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 uppercase font-semibold">Flow Velocity</p>
                                <p className="text-2xl font-bold text-emerald-500">+{totalToday > 0 ? Math.round((totalCompleted / totalToday) * 100) : 0}% <span className="text-sm font-normal text-slate-400">Eff.</span></p>
                            </div>
                        </div>
                    </div>

                    {/* Workload Heatmap */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-800">📊 Workload Heatmap</h3>
                            {workload?.break_suggestion?.suggested && (
                                <span className="text-xs text-blue-500 font-medium bg-blue-50 px-3 py-1 rounded-full">💡 Break suggested after patient #{workload.break_suggestion.after_patient}</span>
                            )}
                        </div>
                        <div className="space-y-2">
                            {(workload?.heatmap || []).map((h, idx) => (
                                <div key={idx} className="flex items-center gap-3">
                                    <span className="text-xs text-slate-400 w-12 text-right font-medium">{h.hour}</span>
                                    <div className="flex-1 h-7 bg-slate-100 rounded-lg overflow-hidden">
                                        <div className="h-full rounded-lg transition-all duration-1000 flex items-center px-2"
                                            style={{
                                                width: `${Math.max(h.intensity * 100, 5)}%`,
                                                background: h.intensity > 0.7 ? 'linear-gradient(90deg, #ef4444, #f87171)' :
                                                    h.intensity > 0.4 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' :
                                                        'linear-gradient(90deg, #10b981, #34d399)'
                                            }}>
                                            {h.patients > 0 && <span className="text-white text-xs font-medium">{h.patients}p</span>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
