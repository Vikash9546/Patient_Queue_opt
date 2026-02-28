import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueueContext } from '../context/QueueContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import { formatTime, getUrgencyColor, getStatusLabel, getStatusColor, getTodayISO } from '../utils/helpers';

export default function ReceptionDashboard() {
    const { queue, doctors, fetchQueue } = useQueueContext();
    const { dark, toggle } = useTheme();
    const navigate = useNavigate();
    const [appointments, setAppointments] = useState([]);
    const [showWalkIn, setShowWalkIn] = useState(false);
    const [showEmergency, setShowEmergency] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [chatMessages, setChatMessages] = useState([{ role: 'bot', text: 'Hello! I\'m MediQueue AI assistant. How can I help you today? 😊' }]);
    const [chatInput, setChatInput] = useState('');
    const [walkInForm, setWalkInForm] = useState({ patient_name: '', patient_age: '', symptoms: '', doctor_id: '', patient_phone: '' });
    const [simulating, setSimulating] = useState(false);
    const [triageResult, setTriageResult] = useState(null);

    useEffect(() => { loadAppointments(); }, []);

    async function loadAppointments() {
        try { const res = await api.getAppointments(getTodayISO()); setAppointments(res.data); } catch (e) { console.error(e); }
    }

    async function handleWalkIn(e) {
        e.preventDefault();
        try {
            const res = await api.addWalkIn(walkInForm);
            setTriageResult(res.data.triage);
            setShowWalkIn(false);
            setWalkInForm({ patient_name: '', patient_age: '', symptoms: '', doctor_id: '', patient_phone: '' });
            fetchQueue();
            loadAppointments();
        } catch (e) { alert(e.message); }
    }

    async function handleEmergency(e) {
        e.preventDefault();
        try {
            await api.addEmergency(walkInForm);
            setShowEmergency(false);
            setWalkInForm({ patient_name: '', patient_age: '', symptoms: '', doctor_id: '', patient_phone: '' });
            fetchQueue();
            loadAppointments();
        } catch (e) { alert(e.message); }
    }

    async function handleSimulate() {
        setSimulating(true);
        try { await api.simulate(50); fetchQueue(); loadAppointments(); } catch (e) { alert(e.message); }
        setSimulating(false);
    }

    async function handleResetDemo() {
        try { await api.resetDemo(); fetchQueue(); loadAppointments(); } catch (e) { alert(e.message); }
    }

    async function handleCallNext(doctorId) {
        try { await api.callNext(doctorId); fetchQueue(); } catch (e) { alert(e.message); }
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

    const queueByDoctor = {};
    queue.forEach(q => {
        if (!queueByDoctor[q.doctor_id]) queueByDoctor[q.doctor_id] = [];
        queueByDoctor[q.doctor_id].push(q);
    });

    return (
        <div className={`min-h-screen ${dark ? 'bg-slate-900' : 'bg-slate-50'} transition-colors`}>
            {/* Header */}
            <header className={`${dark ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-slate-200'} border-b backdrop-blur-xl sticky top-0 z-50`}>
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🏥</span>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">MediQueue AI</h1>
                        <span className={`px-2 py-1 rounded-lg text-xs ${dark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>Reception</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={toggle} className={`p-2 rounded-lg ${dark ? 'bg-slate-700 text-yellow-400' : 'bg-slate-100 text-slate-700'} transition-all`}>
                            {dark ? '☀️' : '🌙'}
                        </button>
                        <button onClick={() => navigate('/queue-tv')} className="px-3 py-2 rounded-lg bg-indigo-500/20 text-indigo-400 text-sm hover:bg-indigo-500/30 transition-all">📺 TV</button>
                        <button onClick={() => navigate('/analytics')} className="px-3 py-2 rounded-lg bg-purple-500/20 text-purple-400 text-sm hover:bg-purple-500/30 transition-all">📊</button>
                        <button onClick={() => navigate('/doctor')} className="px-3 py-2 rounded-lg bg-blue-500/20 text-blue-400 text-sm hover:bg-blue-500/30 transition-all">👨‍⚕️</button>
                        <button onClick={() => navigate('/login')} className="px-3 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30 transition-all">Logout</button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
                {/* Action Buttons */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <button onClick={() => navigate('/book')} className="glass-card p-4 text-center hover:border-indigo-500/50 transition-all group">
                        <span className="text-2xl block mb-1 group-hover:scale-110 transition-transform">📅</span>
                        <span className={`text-sm ${dark ? 'text-slate-300' : 'text-slate-700'}`}>Book Appointment</span>
                    </button>
                    <button onClick={() => setShowWalkIn(true)} className="glass-card p-4 text-center hover:border-emerald-500/50 transition-all group">
                        <span className="text-2xl block mb-1 group-hover:scale-110 transition-transform">🚶</span>
                        <span className={`text-sm ${dark ? 'text-slate-300' : 'text-slate-700'}`}>Walk-In Patient</span>
                    </button>
                    <button onClick={() => setShowEmergency(true)} className="glass-card p-4 text-center hover:border-red-500/50 transition-all group">
                        <span className="text-2xl block mb-1 group-hover:scale-110 transition-transform">🚨</span>
                        <span className={`text-sm ${dark ? 'text-slate-300' : 'text-slate-700'}`}>Emergency</span>
                    </button>
                    <button onClick={handleSimulate} disabled={simulating} className="glass-card p-4 text-center hover:border-amber-500/50 transition-all group disabled:opacity-50">
                        <span className="text-2xl block mb-1 group-hover:scale-110 transition-transform">{simulating ? '⏳' : '🎮'}</span>
                        <span className={`text-sm ${dark ? 'text-slate-300' : 'text-slate-700'}`}>{simulating ? 'Simulating...' : 'Demo Mode'}</span>
                    </button>
                    <button onClick={handleResetDemo} className="glass-card p-4 text-center hover:border-slate-500/50 transition-all group">
                        <span className="text-2xl block mb-1 group-hover:scale-110 transition-transform">🔄</span>
                        <span className={`text-sm ${dark ? 'text-slate-300' : 'text-slate-700'}`}>Reset Demo</span>
                    </button>
                </div>

                {/* Triage Result Banner */}
                {triageResult && (
                    <div className={`glass-card p-4 border-l-4 ${triageResult.urgency === 'emergency' ? 'border-l-red-500' : triageResult.urgency === 'high' ? 'border-l-amber-500' : 'border-l-emerald-500'} animate-slide-up`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="font-bold">AI Triage Result:</span>
                                <span className={`ml-2 priority-badge ${triageResult.urgency}`}>{triageResult.urgency}</span>
                                <span className="ml-3 text-sm text-slate-400">Score: {triageResult.triage_score}/10</span>
                            </div>
                            <button onClick={() => setTriageResult(null)} className="text-slate-400 hover:text-white">✕</button>
                        </div>
                        <p className="text-sm text-slate-400 mt-1">{triageResult.reasoning}</p>
                    </div>
                )}

                {/* Queue by Doctor */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {doctors.map(doc => (
                        <div key={doc.id} className="glass-card overflow-hidden">
                            <div className={`p-4 ${dark ? 'bg-slate-700/50' : 'bg-slate-100'} flex items-center justify-between`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full gradient-accent flex items-center justify-center text-white font-bold">
                                        {doc.name[4]}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">{doc.name}</h3>
                                        <p className="text-xs text-slate-400">{doc.specialty}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className={`status-dot ${doc.status}`} />
                                    <button onClick={() => handleCallNext(doc.id)} className="px-3 py-1 rounded-lg bg-indigo-500 text-white text-xs hover:bg-indigo-600 transition-all">
                                        Next ▶
                                    </button>
                                </div>
                            </div>
                            <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
                                {(queueByDoctor[doc.id] || []).length === 0 ? (
                                    <p className="text-center text-slate-500 py-8">No patients in queue</p>
                                ) : (
                                    (queueByDoctor[doc.id] || []).map((entry, idx) => (
                                        <div key={entry.id} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${entry.status === 'in_consultation' ? (dark ? 'bg-indigo-500/20 border border-indigo-500/30' : 'bg-indigo-50 border border-indigo-200') :
                                                (dark ? 'bg-slate-700/30 border border-slate-600/30' : 'bg-slate-50 border border-slate-200')
                                            }`}>
                                            <span className="text-lg font-bold text-slate-500 w-8">#{entry.position}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium truncate">{entry.patient_name}</span>
                                                    <span className={`priority-badge ${entry.priority}`}>{entry.priority}</span>
                                                </div>
                                                <p className="text-xs text-slate-400 truncate">{entry.symptoms || 'No symptoms listed'}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className={`text-xs ${getStatusColor(entry.status)}`}>{getStatusLabel(entry.status)}</span>
                                                <p className="text-xs text-slate-500">{entry.estimated_wait_mins}min wait</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Today's Appointments */}
                <div className="glass-card overflow-hidden">
                    <div className={`p-4 ${dark ? 'bg-slate-700/50' : 'bg-slate-100'} flex items-center justify-between`}>
                        <h2 className="font-bold text-lg">📋 Today's Appointments</h2>
                        <span className="text-sm text-slate-400">{appointments.length} total</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'} uppercase`}>
                                    <th className="text-left p-3">Patient</th>
                                    <th className="text-left p-3">Doctor</th>
                                    <th className="text-left p-3">Time</th>
                                    <th className="text-left p-3">Urgency</th>
                                    <th className="text-left p-3">Duration</th>
                                    <th className="text-left p-3">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {appointments.slice(0, 15).map(appt => (
                                    <tr key={appt.id} className={`${dark ? 'border-slate-700/50 hover:bg-slate-700/30' : 'border-slate-100 hover:bg-slate-50'} border-t transition-colors`}>
                                        <td className="p-3 font-medium">{appt.patient_name}</td>
                                        <td className="p-3 text-sm text-slate-400">{appt.doctor_name}</td>
                                        <td className="p-3 text-sm">{formatTime(appt.scheduled_time)}</td>
                                        <td className="p-3"><span className={`priority-badge ${appt.urgency_level}`}>{appt.urgency_level}</span></td>
                                        <td className="p-3 text-sm">{appt.estimated_duration}min</td>
                                        <td className="p-3"><span className={`text-sm ${getStatusColor(appt.status)}`}>{getStatusLabel(appt.status)}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Walk-In Modal */}
            {(showWalkIn || showEmergency) && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setShowWalkIn(false); setShowEmergency(false); }}>
                    <div className="glass-card p-6 w-full max-w-md animate-slide-up" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold mb-4">{showEmergency ? '🚨 Emergency Patient' : '🚶 Walk-In Patient'}</h2>
                        <form onSubmit={showEmergency ? handleEmergency : handleWalkIn} className="space-y-4">
                            <input type="text" placeholder="Patient Name" required value={walkInForm.patient_name}
                                onChange={e => setWalkInForm({ ...walkInForm, patient_name: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500" />
                            <div className="grid grid-cols-2 gap-3">
                                <input type="number" placeholder="Age" value={walkInForm.patient_age}
                                    onChange={e => setWalkInForm({ ...walkInForm, patient_age: e.target.value })}
                                    className="px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500" />
                                <input type="text" placeholder="Phone" value={walkInForm.patient_phone}
                                    onChange={e => setWalkInForm({ ...walkInForm, patient_phone: e.target.value })}
                                    className="px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500" />
                            </div>
                            <textarea placeholder="Symptoms (e.g., Fever, Headache, Cough)" required value={walkInForm.symptoms}
                                onChange={e => setWalkInForm({ ...walkInForm, symptoms: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 h-24 resize-none" />
                            <select required value={walkInForm.doctor_id}
                                onChange={e => setWalkInForm({ ...walkInForm, doctor_id: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-indigo-500">
                                <option value="">Select Doctor</option>
                                {doctors.map(d => <option key={d.id} value={d.id}>{d.name} — {d.specialty}</option>)}
                            </select>
                            <div className="flex gap-3">
                                <button type="submit" className={`flex-1 py-3 rounded-xl font-semibold text-white ${showEmergency ? 'gradient-emergency' : 'gradient-accent'} hover:opacity-90 transition-all`}>
                                    {showEmergency ? '🚨 Add Emergency' : '✅ Add to Queue'}
                                </button>
                                <button type="button" onClick={() => { setShowWalkIn(false); setShowEmergency(false); }} className="px-4 py-3 rounded-xl bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Chatbot */}
            <button onClick={() => setShowChat(!showChat)}
                className="fixed bottom-6 right-6 w-14 h-14 rounded-full gradient-accent shadow-lg shadow-indigo-500/30 flex items-center justify-center text-2xl hover:scale-110 transition-transform z-40">
                🤖
            </button>
            {showChat && (
                <div className="fixed bottom-24 right-6 glass-card w-80 h-96 flex flex-col z-40 animate-slide-up overflow-hidden">
                    <div className="p-3 bg-indigo-600 text-white font-semibold flex justify-between items-center">
                        <span>🤖 MediQueue AI Chat</span>
                        <button onClick={() => setShowChat(false)} className="hover:opacity-70">✕</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {chatMessages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-2 rounded-xl text-sm ${msg.role === 'user' ? 'bg-indigo-500 text-white' : (dark ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-800')
                                    }`}>{msg.text}</div>
                            </div>
                        ))}
                    </div>
                    <div className="p-3 border-t border-slate-700 flex gap-2">
                        <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleChat()}
                            placeholder="Ask me anything..."
                            className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-400 focus:outline-none focus:border-indigo-500" />
                        <button onClick={handleChat} className="px-3 py-2 rounded-lg bg-indigo-500 text-white text-sm hover:bg-indigo-600">▶</button>
                    </div>
                </div>
            )}
        </div>
    );
}
