import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

export default function AnalyticsPage() {
    const navigate = useNavigate();
    const [waitTimes, setWaitTimes] = useState([]);
    const [utilization, setUtilization] = useState([]);
    const [peakHours, setPeakHours] = useState([]);
    const [beforeAfter, setBeforeAfter] = useState(null);
    const [activeRange, setActiveRange] = useState('7d');

    useEffect(() => { loadAll(); }, []);

    async function loadAll() {
        try {
            const [wt, ut, ph, ba] = await Promise.all([
                api.getWaitTimes(7), api.getUtilization(7), api.getPeakHours(), api.getBeforeAfter()
            ]);
            setWaitTimes(wt.data); setUtilization(ut.data); setPeakHours(ph.data); setBeforeAfter(ba.data);
        } catch (e) { console.error(e); }
    }

    const tooltipStyle = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 12 };

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
                            <button onClick={() => navigate('/doctor')} className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-all">Live Queue</button>
                            <button onClick={() => navigate('/patient-history')} className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-all">Patient History</button>
                            <button className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg">Analytics</button>
                        </nav>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <svg className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            <input placeholder="Search patients..." className="w-48 pl-9 pr-3 py-[7px] bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-all" />
                        </div>
                        <button className="relative p-2 rounded-lg hover:bg-slate-100 transition-all text-slate-500">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                        </button>
                        <button className="p-2 rounded-lg hover:bg-slate-100 transition-all text-slate-500">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </button>
                        <button onClick={() => navigate('/login')} className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-md hover:shadow-lg transition-all">
                            A
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-[1440px] mx-auto px-6 py-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Analytics Dashboard</h1>
                        <p className="text-sm text-slate-500 mt-1">Performance metrics and optimization insights</p>
                    </div>
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                        {['7d', '30d', '90d'].map(r => (
                            <button key={r} onClick={() => setActiveRange(r)}
                                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeRange === r ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
                                {r}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Before vs After */}
                {beforeAfter && (
                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm mb-6">
                        <h2 className="font-bold text-slate-800 text-lg mb-4">📈 Before vs After MediQueue AI</h2>
                        <div className="grid grid-cols-5 gap-4">
                            {[
                                { label: 'Avg Wait Time', before: `${beforeAfter.before.avg_wait_time}m`, after: `${beforeAfter.after.avg_wait_time}m`, improvement: beforeAfter.improvement.wait_time_reduction, color: 'blue', icon: '⏱' },
                                { label: 'Patient Satisfaction', before: `${beforeAfter.before.patient_satisfaction}%`, after: `${beforeAfter.after.patient_satisfaction}%`, improvement: beforeAfter.improvement.satisfaction_increase, color: 'emerald', icon: '😊' },
                                { label: 'Doctor Utilization', before: `${beforeAfter.before.doctor_utilization}%`, after: `${beforeAfter.after.doctor_utilization}%`, improvement: beforeAfter.improvement.utilization_increase, color: 'indigo', icon: '👨‍⚕️' },
                                { label: 'No-Show Impact', before: `${beforeAfter.before.no_show_impact}%`, after: `${beforeAfter.after.no_show_impact}%`, improvement: beforeAfter.improvement.no_show_reduction, color: 'amber', icon: '👻' },
                                { label: 'Daily Patients', before: beforeAfter.before.daily_patients, after: beforeAfter.after.daily_patients, improvement: beforeAfter.improvement.throughput_increase, color: 'purple', icon: '📊' },
                            ].map((item, i) => (
                                <div key={i} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                    <p className="text-xs text-slate-400 uppercase font-semibold flex items-center gap-1"> {item.icon} {item.label}</p>
                                    <div className="mt-3">
                                        <p className="text-xs text-red-400 line-through">{item.before}</p>
                                        <p className="text-2xl font-bold text-slate-800">{item.after}</p>
                                    </div>
                                    <span className="inline-block mt-2 text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-medium border border-emerald-100">↓{item.improvement}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-6 mb-6">
                    {/* Wait Time Trend */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">⏱ Average Wait Time <span className="text-xs text-slate-400 font-normal">(7 days)</span></h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <AreaChart data={waitTimes}>
                                <defs>
                                    <linearGradient id="waitGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} />
                                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} />
                                <Tooltip contentStyle={tooltipStyle} />
                                <Area type="monotone" dataKey="avgWait" stroke="#3b82f6" strokeWidth={2.5} fill="url(#waitGrad)" name="Wait (min)" />
                                <Line type="monotone" dataKey="avgConsult" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} name="Consult (min)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Peak Hours */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">🕐 Peak Hours</h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={peakHours}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="hour" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} />
                                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} />
                                <Tooltip contentStyle={tooltipStyle} />
                                <Bar dataKey="patients" radius={[6, 6, 0, 0]}>
                                    {peakHours.map((entry, i) => (
                                        <Cell key={i} fill={entry.patients > 3 ? '#ef4444' : entry.patients > 1 ? '#3b82f6' : '#cbd5e1'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Doctor Utilization */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">👨‍⚕️ Doctor Utilization</h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={utilization} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} />
                                <YAxis dataKey="name" type="category" tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }} width={120} axisLine={false} />
                                <Tooltip contentStyle={tooltipStyle} />
                                <Bar dataKey="avg_utilization" radius={[0, 6, 6, 0]} name="Utilization %">
                                    {utilization.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Patient Distribution */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">📊 Patient Distribution</h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie data={utilization.map(u => ({ name: u.name, value: u.total_patients || 1 }))} dataKey="value" nameKey="name"
                                    cx="50%" cy="50%" outerRadius={90} innerRadius={50} label={{ fill: '#475569', fontSize: 11 }}>
                                    {utilization.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={tooltipStyle} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </main>
        </div>
    );
}
