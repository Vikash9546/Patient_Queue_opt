import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

export default function AnalyticsPage() {
    const { dark, toggle } = useTheme();
    const navigate = useNavigate();
    const [waitTimes, setWaitTimes] = useState([]);
    const [utilization, setUtilization] = useState([]);
    const [peakHours, setPeakHours] = useState([]);
    const [beforeAfter, setBeforeAfter] = useState(null);

    useEffect(() => { loadAll(); }, []);

    async function loadAll() {
        try {
            const [wt, ut, ph, ba] = await Promise.all([
                api.getWaitTimes(7), api.getUtilization(7), api.getPeakHours(), api.getBeforeAfter()
            ]);
            setWaitTimes(wt.data); setUtilization(ut.data); setPeakHours(ph.data); setBeforeAfter(ba.data);
        } catch (e) { console.error(e); }
    }

    return (
        <div className={`min-h-screen ${dark ? 'bg-slate-900' : 'bg-slate-50'}`}>
            <header className={`${dark ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-slate-200'} border-b backdrop-blur-xl sticky top-0 z-50`}>
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">📊</span>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Analytics Dashboard</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={toggle} className={`p-2 rounded-lg ${dark ? 'bg-slate-700 text-yellow-400' : 'bg-slate-100'}`}>{dark ? '☀️' : '🌙'}</button>
                        <button onClick={() => navigate('/reception')} className="px-3 py-2 rounded-lg bg-indigo-500/20 text-indigo-400 text-sm">← Back</button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
                {/* Before vs After */}
                {beforeAfter && (
                    <div className="glass-card p-6">
                        <h2 className="text-lg font-bold mb-4">📈 Before vs After MediQueue AI</h2>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            {[
                                { label: 'Avg Wait Time', before: `${beforeAfter.before.avg_wait_time}m`, after: `${beforeAfter.after.avg_wait_time}m`, improvement: beforeAfter.improvement.wait_time_reduction, color: 'indigo' },
                                { label: 'Patient Satisfaction', before: `${beforeAfter.before.patient_satisfaction}%`, after: `${beforeAfter.after.patient_satisfaction}%`, improvement: beforeAfter.improvement.satisfaction_increase, color: 'emerald' },
                                { label: 'Doctor Utilization', before: `${beforeAfter.before.doctor_utilization}%`, after: `${beforeAfter.after.doctor_utilization}%`, improvement: beforeAfter.improvement.utilization_increase, color: 'blue' },
                                { label: 'No-Show Impact', before: `${beforeAfter.before.no_show_impact}%`, after: `${beforeAfter.after.no_show_impact}%`, improvement: beforeAfter.improvement.no_show_reduction, color: 'amber' },
                                { label: 'Daily Patients', before: beforeAfter.before.daily_patients, after: beforeAfter.after.daily_patients, improvement: beforeAfter.improvement.throughput_increase, color: 'purple' },
                            ].map((item, i) => (
                                <div key={i} className={`p-4 rounded-xl ${dark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                                    <p className="text-xs text-slate-400 uppercase">{item.label}</p>
                                    <div className="flex items-end justify-between mt-2">
                                        <div>
                                            <p className="text-xs text-red-400 line-through">{item.before}</p>
                                            <p className={`text-xl font-bold text-${item.color}-400`}>{item.after}</p>
                                        </div>
                                        <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-lg">↓{item.improvement}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Wait Time Trend */}
                    <div className="glass-card p-6">
                        <h3 className="text-sm text-slate-400 uppercase tracking-wider mb-4">⏱ Average Wait Time (7 days)</h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={waitTimes}>
                                <CartesianGrid strokeDasharray="3 3" stroke={dark ? '#334155' : '#e2e8f0'} />
                                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <Tooltip contentStyle={{ background: dark ? '#1e293b' : '#fff', border: '1px solid #334155', borderRadius: 12 }} />
                                <Line type="monotone" dataKey="avgWait" stroke="#6366f1" strokeWidth={3} dot={{ fill: '#6366f1' }} name="Wait (min)" />
                                <Line type="monotone" dataKey="avgConsult" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} name="Consult (min)" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Peak Hours */}
                    <div className="glass-card p-6">
                        <h3 className="text-sm text-slate-400 uppercase tracking-wider mb-4">🕐 Peak Hours</h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={peakHours}>
                                <CartesianGrid strokeDasharray="3 3" stroke={dark ? '#334155' : '#e2e8f0'} />
                                <XAxis dataKey="hour" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <Tooltip contentStyle={{ background: dark ? '#1e293b' : '#fff', border: '1px solid #334155', borderRadius: 12 }} />
                                <Bar dataKey="patients" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Doctor Utilization */}
                    <div className="glass-card p-6">
                        <h3 className="text-sm text-slate-400 uppercase tracking-wider mb-4">👨‍⚕️ Doctor Utilization</h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={utilization} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke={dark ? '#334155' : '#e2e8f0'} />
                                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <YAxis dataKey="name" type="category" tick={{ fill: '#94a3b8', fontSize: 11 }} width={120} />
                                <Tooltip contentStyle={{ background: dark ? '#1e293b' : '#fff', border: '1px solid #334155', borderRadius: 12 }} />
                                <Bar dataKey="avg_utilization" fill="#06b6d4" radius={[0, 6, 6, 0]} name="Utilization %" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Utilization Pie */}
                    <div className="glass-card p-6">
                        <h3 className="text-sm text-slate-400 uppercase tracking-wider mb-4">📊 Patient Distribution</h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie data={utilization.map(u => ({ name: u.name, value: u.total_patients || 1 }))} dataKey="value" nameKey="name"
                                    cx="50%" cy="50%" outerRadius={90} label>
                                    {utilization.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={{ background: dark ? '#1e293b' : '#fff', border: '1px solid #334155', borderRadius: 12 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </main>
        </div>
    );
}
