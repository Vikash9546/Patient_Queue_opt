import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueueContext } from '../context/QueueContext';
import api from '../services/api';
import { formatTime } from '../utils/helpers';

export default function DoctorDashboard() {
    const { queue, doctors, fetchQueue } = useQueueContext();
    const navigate = useNavigate();
    const [selectedDoctor, setSelectedDoctor] = useState('');
    const [workload, setWorkload] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [consultTimer, setConsultTimer] = useState(0);
    const [showAlert, setShowAlert] = useState(true);
    const timerRef = useRef(null);

    useEffect(() => {
        if (doctors.length > 0 && !selectedDoctor) setSelectedDoctor(doctors[0]._id || doctors[0].id);
    }, [doctors]);

    useEffect(() => {
        if (selectedDoctor) loadWorkload();
    }, [selectedDoctor]);

    const doctorQueue = queue.filter(q => q.doctor_id === selectedDoctor);
    const currentPatient = doctorQueue.find(q => q.status === 'in_consultation');
    const waitingPatients = doctorQueue.filter(q => q.status === 'waiting');
    const doc = doctors.find(d => (d._id || d.id) === selectedDoctor);

    useEffect(() => {
        clearInterval(timerRef.current);
        if (currentPatient) {
            setConsultTimer(0);
            timerRef.current = setInterval(() => setConsultTimer(prev => prev + 1), 1000);
        } else {
            setConsultTimer(0);
        }
        return () => clearInterval(timerRef.current);
    }, [currentPatient?.id || currentPatient?._id]);

    async function loadWorkload() {
        try { const res = await api.getDoctorWorkload(selectedDoctor); setWorkload(res.data); } catch (e) { }
    }
    async function handleCallNext() {
        try { await api.callNext(selectedDoctor); fetchQueue(); loadWorkload(); } catch (e) { alert(e.message); }
    }
    async function handleStatusChange(status) {
        try { await api.updateDoctorStatus(selectedDoctor, status); } catch (e) { }
    }
    async function handleRebalance() {
        try { await api.rebalanceQueue(selectedDoctor); fetchQueue(); } catch (e) { alert(e.message); }
    }

    const formatTimerDisplay = (s) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    };

    const emergencyPatient = waitingPatients.find(p => p.priority === 'emergency');
    const totalCompleted = workload?.today_stats?.completed || 0;
    const totalToday = workload?.today_stats?.total || 0;
    const next3 = waitingPatients.slice(0, 3);
    const avgWait = waitingPatients.length > 0
        ? Math.round(waitingPatients.reduce((s, p) => s + (p.estimated_wait_mins || 0), 0) / waitingPatients.length)
        : 0;

    const getPriorityConfig = (priority) => {
        const configs = {
            emergency: { label: 'Emergency', color: 'text-red-500', bg: 'bg-red-50', border: 'border-l-red-500', badge: 'bg-red-100 text-red-600' },
            high: { label: 'High Urgency', color: 'text-red-500', bg: 'bg-red-50', border: 'border-l-red-500', badge: 'bg-red-100 text-red-600' },
            medium: { label: 'Medium Urgency', color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-l-amber-500', badge: 'bg-amber-100 text-amber-600' },
            low: { label: 'Low Urgency', color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-l-emerald-500', badge: 'bg-emerald-100 text-emerald-600' },
            normal: { label: 'Normal', color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-l-emerald-500', badge: 'bg-emerald-100 text-emerald-600' },
        };
        return configs[priority] || configs.normal;
    };

    const estimatedDuration = currentPatient?.estimated_duration || 20;
    const elapsedMins = Math.floor(consultTimer / 60);
    const remainingMins = Math.max(0, estimatedDuration - elapsedMins);
    const progressPct = Math.min(100, (consultTimer / (estimatedDuration * 60)) * 100);

    return (
        <div className="min-h-screen bg-[#f0f4f8]" style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
            {/* ========= TOP NAVIGATION ========= */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-[1400px] mx-auto px-5 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        {/* Logo */}
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-[#0ea5e9] to-[#2563eb] flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838l-2.727 1.17 1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0z" /></svg>
                            </div>
                            <span className="font-bold text-[#1e293b] text-[15px] tracking-tight">MediQueue AI</span>
                        </div>
                        {/* Nav tabs */}
                        <nav className="flex items-center gap-1 text-[13px]">
                            <button onClick={() => navigate('/reception')} className="px-3 py-1.5 font-medium text-slate-500 hover:text-slate-700 transition-colors">Dashboard</button>
                            <button className="px-3 py-1.5 font-semibold text-[#0ea5e9] border-b-2 border-[#0ea5e9]">Live Queue</button>
                            <button onClick={() => navigate('/patient-history')} className="px-3 py-1.5 font-medium text-slate-500 hover:text-slate-700 transition-colors">Patient History</button>
                            <button onClick={() => navigate('/analytics')} className="px-3 py-1.5 font-medium text-slate-500 hover:text-slate-700 transition-colors">Analytics</button>
                        </nav>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <svg className="absolute left-3 top-[9px] w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search patients..."
                                className="w-48 pl-8 pr-3 py-[7px] bg-[#f1f5f9] border border-slate-200 rounded-lg text-[13px] text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9]/20 transition-all" />
                        </div>
                        <button className="relative p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </button>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0ea5e9] to-[#6366f1] flex items-center justify-center text-white text-xs font-bold ring-2 ring-white shadow">
                            {doc?.name?.charAt(4) || 'D'}
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-[1400px] mx-auto px-5 py-5 flex gap-5">
                {/* ========= LEFT SIDEBAR ========= */}
                <aside className="w-[240px] flex-shrink-0">
                    {/* Doctor Info */}
                    <div className="mb-6">
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-[0.1em] mb-3">Doctor Information</p>
                        <select value={selectedDoctor} onChange={e => setSelectedDoctor(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[13px] text-slate-700 font-medium focus:outline-none focus:border-[#0ea5e9] mb-3 shadow-sm">
                            {doctors.map(d => <option key={d._id || d.id} value={d._id || d.id}>{d.name}</option>)}
                        </select>
                        {doc && (
                            <>
                                <h2 className="font-bold text-[#1e293b] text-[17px] leading-tight">{doc.name}</h2>
                                <p className="text-[13px] text-slate-400 mt-1">🏥 {doc.specialty} • {doc.shift_start}–{doc.shift_end}</p>
                            </>
                        )}
                    </div>

                    {/* Status */}
                    <div className="mb-6">
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-[0.1em] mb-2">Status</p>
                        <div className="grid grid-cols-2 gap-1.5">
                            {[
                                { val: 'available', label: 'Available', color: 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100' },
                                { val: 'busy', label: 'Busy', color: 'text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100' },
                                { val: 'on_break', label: 'Break', color: 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100' },
                                { val: 'offline', label: 'Offline', color: 'text-red-600 bg-red-50 border-red-200 hover:bg-red-100' },
                            ].map(s => (
                                <button key={s.val} onClick={() => handleStatusChange(s.val)}
                                    className={`py-1.5 rounded-md text-[11px] font-semibold border transition-all ${s.color} ${doc?.status === s.val ? 'ring-2 ring-offset-1 ring-current' : ''}`}>
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Next 3 Patients */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-[0.1em]">Next 3 Patients</p>
                            <span className="text-[11px] text-[#0ea5e9] font-semibold">Live</span>
                        </div>
                        <div className="space-y-2.5">
                            {next3.length === 0 && (
                                <div className="text-center py-8 text-[13px] text-slate-400">Queue is empty 🎉</div>
                            )}
                            {next3.map((entry) => {
                                const pc = getPriorityConfig(entry.priority);
                                const isWalkIn = !entry.scheduled_time;
                                return (
                                    <div key={entry.id || entry._id}
                                        className={`bg-white rounded-xl p-3 border border-slate-100 border-l-[3px] ${pc.border} shadow-sm`}>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className={`text-[10px] font-bold uppercase tracking-wide ${pc.color}`}>{pc.label}</span>
                                            {isWalkIn ? (
                                                <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                            ) : (
                                                <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            )}
                                        </div>
                                        <p className="font-semibold text-[#1e293b] text-[13px] leading-tight">
                                            #{entry.position} - {entry.patient_name}
                                        </p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                            {isWalkIn ? `Walk-In (Wait: ${entry.estimated_wait_mins}m)` : `Appt: ${formatTime(entry.scheduled_time)}`}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </aside>

                {/* ========= MAIN CONTENT ========= */}
                <main className="flex-1 min-w-0">
                    {/* Header Row */}
                    <div className="flex items-start justify-between mb-5">
                        <div>
                            <h1 className="text-[24px] font-bold text-[#1e293b] leading-tight">Live Queue Monitor</h1>
                            <p className="text-[13px] text-slate-400 mt-0.5">Intelligent Patient Queue Optimization System</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-[0.1em]">Current Load</p>
                                <p className={`text-[13px] font-bold ${waitingPatients.length > 6 ? 'text-red-500' : waitingPatients.length > 3 ? 'text-amber-500' : 'text-[#0ea5e9]'}`}>
                                    {waitingPatients.length > 6 ? 'High Load' : waitingPatients.length > 3 ? 'Moderate' : 'Optimized'}
                                </p>
                            </div>
                            <button onClick={handleCallNext}
                                className="flex items-center gap-2 px-5 py-2.5 bg-[#0ea5e9] text-white rounded-xl text-[13px] font-semibold hover:bg-[#0891d4] transition-all shadow-md shadow-[#0ea5e9]/25 active:scale-[0.98]">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                                Call Next Patient
                            </button>
                        </div>
                    </div>

                    {/* ===== PRIORITY REBALANCE ALERT ===== */}
                    {emergencyPatient && showAlert && (
                        <div className="bg-white rounded-2xl py-3.5 px-5 border border-slate-100 shadow-sm mb-5 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-[#1e293b] text-[14px]">Priority Rebalance Alert</span>
                                    <span className="px-2 py-0.5 bg-red-500 text-white text-[9px] font-bold rounded uppercase tracking-wide">Act Now</span>
                                </div>
                                <p className="text-[12px] text-slate-500 mt-0.5 truncate">
                                    Emergency Jump Queue: Patient {emergencyPatient.patient_name} assigned to {doc?.name} due to critical triage status.
                                </p>
                            </div>
                            <button onClick={() => { handleRebalance(); setShowAlert(false); }}
                                className="flex-shrink-0 px-4 py-2 bg-[#0ea5e9] text-white rounded-lg text-[12px] font-semibold hover:bg-[#0891d4] transition-all">
                                Acknowledge
                            </button>
                        </div>
                    )}

                    {/* ===== CURRENT CONSULTATION CARD ===== */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-5">
                        {/* Card Header */}
                        <div className="px-6 pt-5 pb-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#e0f2fe] flex items-center justify-center">
                                    <svg className="w-5 h-5 text-[#0ea5e9]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                </div>
                                <div>
                                    <h2 className="font-bold text-[#1e293b] text-[16px]">Current Consultation</h2>
                                    {currentPatient ? (
                                        <p className="text-[12px] text-slate-400">Patient #{currentPatient.position} - {currentPatient.patient_name}</p>
                                    ) : (
                                        <p className="text-[12px] text-slate-400">No active session</p>
                                    )}
                                </div>
                            </div>
                            {currentPatient && (
                                <div className="flex items-center gap-2 text-slate-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    <span className="text-[28px] font-bold text-[#1e293b] font-mono tracking-wider">{formatTimerDisplay(consultTimer)}</span>
                                </div>
                            )}
                        </div>

                        {currentPatient ? (
                            <div className="px-6 pb-6">
                                {/* Two column layout */}
                                <div className="grid grid-cols-2 gap-x-10 gap-y-4 mb-5">
                                    {/* Left: Primary Reason */}
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-[0.1em] mb-1.5">Primary Reason</p>
                                        <p className="text-[14px] text-[#1e293b] font-medium flex items-center gap-2">
                                            <span className="text-lg">🩻</span>
                                            {currentPatient.symptoms || 'Annual General Check-up'}
                                        </p>
                                    </div>
                                    {/* Right: EST. TIME REMAINING */}
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-[0.1em] mb-1.5">Est. Time Remaining</p>
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 h-[10px] bg-[#e2e8f0] rounded-full overflow-hidden">
                                                <div className="h-full rounded-full transition-all duration-1000"
                                                    style={{
                                                        width: `${progressPct}%`,
                                                        background: 'linear-gradient(90deg, #0ea5e9, #06b6d4)'
                                                    }} />
                                            </div>
                                            <span className="text-[14px] font-bold text-[#0ea5e9] whitespace-nowrap">~ {remainingMins} minutes</span>
                                        </div>
                                        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                                            <span>Started (0 min)</span>
                                            <span>Expected Finish ({estimatedDuration} min)</span>
                                        </div>
                                    </div>
                                </div>

                                {/* AI Insights + Actions */}
                                <div className="flex items-stretch gap-4">
                                    {/* AI Insights */}
                                    <div className="flex-1">
                                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-[0.1em] mb-1.5">AI-Driven Insights</p>
                                        <div className="bg-[#f8fafc] rounded-xl p-3.5 border border-slate-100 h-[calc(100%-24px)]">
                                            <p className="text-[12px] text-slate-500 italic leading-relaxed">
                                                "{currentPatient.symptoms
                                                    ? `Patient ${currentPatient.patient_name}. AI recommends checking related vitals for ${currentPatient.symptoms.split(',')[0]?.trim()} before conclusion.`
                                                    : 'Routine check-up. No special AI recommendations for this session.'}"
                                            </p>
                                        </div>
                                    </div>
                                    {/* Action Buttons */}
                                    <div className="flex flex-col gap-2 flex-shrink-0">
                                        <button className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-xl text-[13px] font-medium text-[#1e293b] hover:bg-slate-50 transition-all shadow-sm">
                                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                            Clinical Notes
                                        </button>
                                        <button onClick={handleCallNext}
                                            className="flex items-center gap-2 px-5 py-3 bg-[#1e293b] text-white rounded-xl text-[13px] font-medium hover:bg-[#0f172a] transition-all shadow-sm">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            Complete Session
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="px-6 pb-8 text-center">
                                <p className="text-slate-400 text-[14px] mb-4">No patient currently in consultation</p>
                                <button onClick={handleCallNext}
                                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0ea5e9] text-white rounded-xl text-[13px] font-semibold hover:bg-[#0891d4] transition-all shadow-md">
                                    ▶ Call First Patient
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ===== STATS CARDS ===== */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-[#e0f2fe] flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-[#0ea5e9]" fill="currentColor" viewBox="0 0 20 20"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-[0.1em]">Queue Size</p>
                                <p className="text-[22px] font-bold text-[#1e293b] leading-tight">{waitingPatients.length} <span className="text-[13px] font-normal text-slate-400">Patients</span></p>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-[#fef3c7] flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-[#d97706]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.828a1 1 0 101.415-1.414L11 9.586V6z" clipRule="evenodd" /></svg>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-[0.1em]">Avg. Wait Time</p>
                                <p className="text-[22px] font-bold text-[#1e293b] leading-tight">{avgWait} <span className="text-[13px] font-normal text-slate-400">Mins</span></p>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-[#d1fae5] flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-[#059669]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-[0.1em]">Flow Velocity</p>
                                <p className="text-[22px] font-bold text-[#059669] leading-tight">+{totalToday > 0 ? Math.round((totalCompleted / totalToday) * 100) : 0}% <span className="text-[13px] font-normal text-slate-400">Eff.</span></p>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
