import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueueContext } from '../context/QueueContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';

export default function PatientBookingPage() {
    const { doctors } = useQueueContext();
    const { dark } = useTheme();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        patient_name: '', patient_age: '', patient_phone: '', symptoms: '',
        medical_history: '', doctor_id: '', urgency_level: 'low', scheduled_time: ''
    });
    const [slots, setSlots] = useState([]);
    const [aiInsights, setAiInsights] = useState(null);
    const [booking, setBooking] = useState(false);
    const [success, setSuccess] = useState(null);
    const [voiceActive, setVoiceActive] = useState(false);

    useEffect(() => {
        if (form.doctor_id) loadSlots();
    }, [form.doctor_id]);

    async function loadSlots() {
        try {
            const res = await api.getDoctorSlots(form.doctor_id);
            setSlots(res.data.slice(0, 12));
        } catch (e) { }
    }

    async function handleBook(e) {
        e.preventDefault();
        setBooking(true);
        try {
            const res = await api.bookAppointment(form);
            setAiInsights(res.data.ai_insights);
            setSuccess(res.data.appointment);
        } catch (e) { alert(e.message); }
        setBooking(false);
    }

    function startVoice() {
        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            alert('Speech recognition not supported in this browser');
            return;
        }
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-IN';
        recognition.continuous = false;
        recognition.interimResults = false;
        setVoiceActive(true);
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setForm(prev => ({ ...prev, symptoms: prev.symptoms ? prev.symptoms + ', ' + transcript : transcript }));
            setVoiceActive(false);
        };
        recognition.onerror = () => setVoiceActive(false);
        recognition.onend = () => setVoiceActive(false);
        recognition.start();
    }

    if (success) {
        return (
            <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
                <div className="glass-card p-8 max-w-md text-center animate-slide-up">
                    <span className="text-6xl block mb-4">✅</span>
                    <h2 className="text-2xl font-bold mb-2">Appointment Booked!</h2>
                    <p className="text-slate-400 mb-4">Your appointment has been confirmed.</p>
                    {aiInsights && (
                        <div className={`p-4 rounded-xl ${dark ? 'bg-slate-700/50' : 'bg-slate-100'} text-left mb-4`}>
                            <p className="text-sm font-medium mb-2">🤖 AI Insights</p>
                            <p className="text-xs text-slate-400">Est. Duration: <span className="text-indigo-400 font-bold">{aiInsights.estimated_duration} min</span></p>
                            <p className="text-xs text-slate-400">No-Show Risk: <span className={`font-bold ${aiInsights.no_show_risk === 'low' ? 'text-emerald-400' : 'text-amber-400'}`}>{aiInsights.no_show_risk}</span></p>
                            <p className="text-xs text-slate-400 mt-1">{aiInsights.duration_reasoning}</p>
                        </div>
                    )}
                    <div className="flex gap-3">
                        <button onClick={() => { setSuccess(null); setForm({ patient_name: '', patient_age: '', patient_phone: '', symptoms: '', medical_history: '', doctor_id: '', urgency_level: 'low', scheduled_time: '' }); }}
                            className="flex-1 py-3 rounded-xl gradient-accent text-white font-semibold hover:opacity-90">Book Another</button>
                        <button onClick={() => navigate('/reception')} className="flex-1 py-3 rounded-xl bg-slate-700 text-white font-semibold hover:bg-slate-600">Dashboard</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen ${dark ? 'bg-slate-900' : 'bg-slate-50'}`}>
            <header className={`${dark ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-slate-200'} border-b backdrop-blur-xl sticky top-0 z-50`}>
                <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">📅</span>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Book Appointment</h1>
                    </div>
                    <button onClick={() => navigate('/reception')} className="px-3 py-2 rounded-lg bg-indigo-500/20 text-indigo-400 text-sm">← Back</button>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-8">
                <form onSubmit={handleBook} className="glass-card p-6 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Patient Name *</label>
                            <input type="text" required value={form.patient_name}
                                onChange={e => setForm({ ...form, patient_name: e.target.value })}
                                className={`w-full px-4 py-3 ${dark ? 'bg-slate-700/50 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'} border rounded-xl focus:outline-none focus:border-indigo-500`}
                                placeholder="Enter name" />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Age</label>
                            <input type="number" value={form.patient_age}
                                onChange={e => setForm({ ...form, patient_age: e.target.value })}
                                className={`w-full px-4 py-3 ${dark ? 'bg-slate-700/50 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'} border rounded-xl focus:outline-none focus:border-indigo-500`}
                                placeholder="Age" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Phone</label>
                        <input type="text" value={form.patient_phone}
                            onChange={e => setForm({ ...form, patient_phone: e.target.value })}
                            className={`w-full px-4 py-3 ${dark ? 'bg-slate-700/50 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'} border rounded-xl focus:outline-none focus:border-indigo-500`}
                            placeholder="Phone number" />
                    </div>
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Symptoms * <button type="button" onClick={startVoice} className={`ml-2 px-2 py-1 rounded-lg text-xs ${voiceActive ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-indigo-500/20 text-indigo-400'}`}>
                            {voiceActive ? '🎤 Listening...' : '🎙️ Voice Input'}
                        </button></label>
                        <textarea required value={form.symptoms}
                            onChange={e => setForm({ ...form, symptoms: e.target.value })}
                            className={`w-full px-4 py-3 ${dark ? 'bg-slate-700/50 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'} border rounded-xl focus:outline-none focus:border-indigo-500 h-24 resize-none`}
                            placeholder="Describe symptoms (or use voice input)" />
                    </div>
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Past Medical History</label>
                        <input type="text" value={form.medical_history}
                            onChange={e => setForm({ ...form, medical_history: e.target.value })}
                            className={`w-full px-4 py-3 ${dark ? 'bg-slate-700/50 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'} border rounded-xl focus:outline-none focus:border-indigo-500`}
                            placeholder="e.g., Diabetes, Hypertension" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Select Doctor *</label>
                            <select required value={form.doctor_id}
                                onChange={e => setForm({ ...form, doctor_id: e.target.value })}
                                className={`w-full px-4 py-3 ${dark ? 'bg-slate-700/50 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'} border rounded-xl focus:outline-none focus:border-indigo-500`}>
                                <option value="">Choose doctor</option>
                                {doctors.map(d => <option key={d.id} value={d.id}>{d.name} — {d.specialty}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Urgency Level</label>
                            <select value={form.urgency_level}
                                onChange={e => setForm({ ...form, urgency_level: e.target.value })}
                                className={`w-full px-4 py-3 ${dark ? 'bg-slate-700/50 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'} border rounded-xl focus:outline-none focus:border-indigo-500`}>
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="emergency">Emergency</option>
                            </select>
                        </div>
                    </div>
                    {/* Time Slots */}
                    {slots.length > 0 && (
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">Available Time Slots</label>
                            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                                {slots.map((slot, i) => {
                                    const time = new Date(slot);
                                    const label = time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                                    return (
                                        <button key={i} type="button" onClick={() => setForm({ ...form, scheduled_time: slot })}
                                            className={`py-2 px-3 rounded-lg text-sm transition-all ${form.scheduled_time === slot ? 'gradient-accent text-white' : (dark ? 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 border border-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200')
                                                }`}>{label}</button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    <button type="submit" disabled={booking}
                        className="w-full py-3 rounded-xl font-semibold text-white gradient-accent hover:opacity-90 transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-50">
                        {booking ? '⏳ Booking...' : '📅 Book Appointment'}
                    </button>
                </form>
            </main>
        </div>
    );
}
