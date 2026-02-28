import { useState, useEffect } from 'react';
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

    useEffect(() => {
        if (doctors.length > 0 && !selectedDoctor) setSelectedDoctor(doctors[0].id);
    }, [doctors]);

    useEffect(() => {
        if (selectedDoctor) {
            loadWorkload();
            loadSchedule();
        }
    }, [selectedDoctor]);

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

    const doctorQueue = queue.filter(q => q.doctor_id === selectedDoctor);
    const currentPatient = doctorQueue.find(q => q.status === 'in_consultation');
    const waitingPatients = doctorQueue.filter(q => q.status === 'waiting');

    return (
        <div className={`min-h-screen ${dark ? 'bg-slate-900' : 'bg-slate-50'} transition-colors`}>
            {/* Header */}
            <header className={`${dark ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-slate-200'} border-b backdrop-blur-xl sticky top-0 z-50`}>
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">👨‍⚕️</span>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Doctor Dashboard</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <select value={selectedDoctor} onChange={e => setSelectedDoctor(e.target.value)}
                            className={`px-3 py-2 rounded-lg border text-sm ${dark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-200'}`}>
                            {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                        <button onClick={toggle} className={`p-2 rounded-lg ${dark ? 'bg-slate-700 text-yellow-400' : 'bg-slate-100 text-slate-700'}`}>
                            {dark ? '☀️' : '🌙'}
                        </button>
                        <button onClick={() => navigate('/reception')} className="px-3 py-2 rounded-lg bg-indigo-500/20 text-indigo-400 text-sm">Reception</button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="glass-card p-4">
                        <p className="text-xs text-slate-400 uppercase tracking-wider">Today's Patients</p>
                        <p className="text-3xl font-bold mt-1 text-indigo-400">{workload?.today_stats?.total || 0}</p>
                    </div>
                    <div className="glass-card p-4">
                        <p className="text-xs text-slate-400 uppercase tracking-wider">Completed</p>
                        <p className="text-3xl font-bold mt-1 text-emerald-400">{workload?.today_stats?.completed || 0}</p>
                    </div>
                    <div className="glass-card p-4">
                        <p className="text-xs text-slate-400 uppercase tracking-wider">Remaining</p>
                        <p className="text-3xl font-bold mt-1 text-amber-400">{workload?.today_stats?.remaining || 0}</p>
                    </div>
                    <div className="glass-card p-4">
                        <p className="text-xs text-slate-400 uppercase tracking-wider">Overtime Prediction</p>
                        <p className={`text-3xl font-bold mt-1 ${workload?.overtime_prediction?.likely ? 'text-red-400' : 'text-emerald-400'}`}>
                            {workload?.overtime_prediction?.likely ? `+${workload.overtime_prediction.minutes}m` : 'On Time'}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Current Patient */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className={`glass-card p-6 ${currentPatient ? 'glow-accent' : ''}`}>
                            <h3 className="text-sm text-slate-400 uppercase tracking-wider mb-3">🩺 Current Patient</h3>
                            {currentPatient ? (
                                <div>
                                    <p className="text-2xl font-bold">{currentPatient.patient_name}</p>
                                    <p className="text-sm text-slate-400 mt-1">Age: {currentPatient.patient_age}</p>
                                    <p className="text-sm text-slate-400">Symptoms: {currentPatient.symptoms}</p>
                                    <p className="text-sm text-indigo-400 mt-2">Duration: ~{currentPatient.estimated_duration}min</p>
                                </div>
                            ) : (
                                <p className="text-slate-500 text-center py-4">No patient currently</p>
                            )}
                            <button onClick={handleCallNext}
                                className="w-full mt-4 py-3 rounded-xl font-semibold text-white gradient-accent hover:opacity-90 transition-all">
                                {currentPatient ? '✅ Complete & Call Next' : '▶ Call First Patient'}
                            </button>
                        </div>

                        {/* Status Controls */}
                        <div className="glass-card p-4">
                            <h3 className="text-sm text-slate-400 uppercase tracking-wider mb-3">Status</h3>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => handleStatusChange('available')} className="py-2 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm border border-emerald-500/20 hover:bg-emerald-500/30">Available</button>
                                <button onClick={() => handleStatusChange('busy')} className="py-2 rounded-lg bg-amber-500/20 text-amber-400 text-sm border border-amber-500/20 hover:bg-amber-500/30">Busy</button>
                                <button onClick={() => handleStatusChange('on_break')} className="py-2 rounded-lg bg-blue-500/20 text-blue-400 text-sm border border-blue-500/20 hover:bg-blue-500/30">On Break</button>
                                <button onClick={() => handleStatusChange('offline')} className="py-2 rounded-lg bg-red-500/20 text-red-400 text-sm border border-red-500/20 hover:bg-red-500/30">Offline</button>
                            </div>
                        </div>

                        {/* Break Suggestion */}
                        {workload?.break_suggestion?.suggested && (
                            <div className="glass-card p-4 border-l-4 border-l-blue-500 animate-slide-up">
                                <p className="text-sm font-medium text-blue-400">💡 Break Suggestion</p>
                                <p className="text-xs text-slate-400 mt-1">{workload.break_suggestion.reason}</p>
                                <p className="text-xs text-slate-500">Recommended: {workload.break_suggestion.duration_mins}min break after patient #{workload.break_suggestion.after_patient}</p>
                            </div>
                        )}
                    </div>

                    {/* Queue */}
                    <div className="lg:col-span-1">
                        <div className="glass-card overflow-hidden">
                            <div className={`p-4 ${dark ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
                                <h3 className="font-semibold">📋 Patient Queue ({waitingPatients.length})</h3>
                            </div>
                            <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
                                {waitingPatients.length === 0 ? (
                                    <p className="text-center text-slate-500 py-8">Queue is empty 🎉</p>
                                ) : (
                                    waitingPatients.map((entry) => (
                                        <div key={entry.id} className={`p-3 rounded-xl ${dark ? 'bg-slate-700/30 border border-slate-600/30' : 'bg-slate-50 border border-slate-200'} transition-all`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-slate-500">#{entry.position}</span>
                                                    <span className="font-medium text-sm">{entry.patient_name}</span>
                                                </div>
                                                <span className={`priority-badge ${entry.priority}`}>{entry.priority}</span>
                                            </div>
                                            <div className="flex justify-between mt-1">
                                                <span className="text-xs text-slate-400 truncate">{entry.symptoms}</span>
                                                <span className="text-xs text-indigo-400 whitespace-nowrap">{entry.estimated_wait_mins}m</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Workload Heatmap */}
                    <div className="lg:col-span-1">
                        <div className="glass-card p-4">
                            <h3 className="text-sm text-slate-400 uppercase tracking-wider mb-3">📊 Workload Heatmap</h3>
                            <div className="space-y-2">
                                {(workload?.heatmap || []).map((h, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <span className="text-xs text-slate-400 w-12">{h.hour}</span>
                                        <div className="flex-1 h-6 bg-slate-700/50 rounded-lg overflow-hidden">
                                            <div className="h-full rounded-lg transition-all duration-1000"
                                                style={{
                                                    width: `${Math.max(h.intensity * 100, 5)}%`,
                                                    background: h.intensity > 0.7 ? 'linear-gradient(90deg, #ef4444, #f87171)' :
                                                        h.intensity > 0.4 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' :
                                                            'linear-gradient(90deg, #10b981, #34d399)'
                                                }} />
                                        </div>
                                        <span className="text-xs text-slate-400 w-8">{h.patients}p</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Schedule */}
                        <div className="glass-card p-4 mt-4">
                            <h3 className="text-sm text-slate-400 uppercase tracking-wider mb-3">📅 Today's Schedule</h3>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {(schedule?.appointments || []).map(appt => (
                                    <div key={appt.id} className="flex items-center justify-between text-sm">
                                        <span className="text-slate-400">{formatTime(appt.scheduled_time)}</span>
                                        <span className="truncate mx-2">{appt.patient_name}</span>
                                        <span className={`text-xs ${getStatusColor(appt.status)}`}>{appt.status}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
