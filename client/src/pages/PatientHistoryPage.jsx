import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueueContext } from '../context/QueueContext';
import api from '../services/api';

export default function PatientHistoryPage() {
    const navigate = useNavigate();
    const { doctors } = useQueueContext();
    const [patients, setPatients] = useState([]);
    const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 0 });
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('recent');
    const [expandedId, setExpandedId] = useState(null);
    const [loading, setLoading] = useState(false);

    // Filters
    const [visitRange, setVisitRange] = useState('');
    const [urgencyFilters, setUrgencyFilters] = useState({ high: false, medium: false, standard: false });
    const [doctorSearch, setDoctorSearch] = useState('');
    const [selectedDoctors, setSelectedDoctors] = useState([]);

    useEffect(() => { loadPatients(1); }, []);

    async function loadPatients(page) {
        setLoading(true);
        try {
            const activeUrgency = Object.entries(urgencyFilters).filter(([, v]) => v).map(([k]) => k).join(',');
            const res = await api.getPatientHistory({
                page, limit: 10, q: searchQuery, urgency: activeUrgency,
                visit_range: visitRange, sort: sortBy
            });
            setPatients(res.data);
            setPagination(res.pagination);
        } catch (e) { console.error(e); }
        setLoading(false);
    }

    function handleSearch(e) {
        e.preventDefault();
        loadPatients(1);
    }

    function handleApplyFilters() {
        loadPatients(1);
    }

    function handleClearFilters() {
        setVisitRange('');
        setUrgencyFilters({ high: false, medium: false, standard: false });
        setSelectedDoctors([]);
        setDoctorSearch('');
        setSearchQuery('');
        setTimeout(() => loadPatients(1), 0);
    }

    function toggleUrgency(key) {
        setUrgencyFilters(prev => ({ ...prev, [key]: !prev[key] }));
    }

    function addDoctor(docName) {
        if (!selectedDoctors.includes(docName)) {
            setSelectedDoctors(prev => [...prev, docName]);
            setDoctorSearch('');
        }
    }

    function removeDoctor(docName) {
        setSelectedDoctors(prev => prev.filter(d => d !== docName));
    }

    function getTimeSince(dateStr) {
        if (!dateStr) return 'Never';
        const diff = Date.now() - new Date(dateStr).getTime();
        const days = Math.floor(diff / 86400000);
        if (days === 0) return 'Today';
        if (days === 1) return '1 day ago';
        if (days < 7) return `${days} days ago`;
        if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
        if (days < 365) return `${Math.floor(days / 30)} months ago`;
        return `${Math.floor(days / 365)} years ago`;
    }

    function getPriorityColor(score) {
        if (score >= 7) return 'text-red-500';
        if (score >= 4) return 'text-amber-500';
        return 'text-emerald-500';
    }

    function getTimelineBarColor(priority) {
        const colors = { emergency: '#ef4444', high: '#f59e0b', medium: '#3b82f6', low: '#10b981', normal: '#94a3b8' };
        return colors[priority] || colors.normal;
    }

    const filteredDoctors = doctors.filter(d =>
        d.name.toLowerCase().includes(doctorSearch.toLowerCase()) && !selectedDoctors.includes(d.name)
    );

    const user = JSON.parse(localStorage.getItem('mediqueue_user') || '{}');

    return (
        <div className="min-h-screen bg-[#f0f4f8]" style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
            {/* ========= TOP NAVIGATION ========= */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-[1400px] mx-auto px-5 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-[#0ea5e9] to-[#2563eb] flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838l-2.727 1.17 1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0z" /></svg>
                            </div>
                            <span className="font-bold text-[#1e293b] text-[15px] tracking-tight">MediQueue AI</span>
                        </div>
                        <nav className="flex items-center gap-1 text-[13px]">
                            <button onClick={() => navigate('/doctor')} className="px-3 py-1.5 font-medium text-slate-500 hover:text-slate-700 transition-colors">Live Queue</button>
                            <button className="px-3 py-1.5 font-semibold text-[#0ea5e9] border-b-2 border-[#0ea5e9]">Patient History</button>
                            <button onClick={() => navigate('/reception')} className="px-3 py-1.5 font-medium text-slate-500 hover:text-slate-700 transition-colors">Schedules</button>
                            <button onClick={() => navigate('/analytics')} className="px-3 py-1.5 font-medium text-slate-500 hover:text-slate-700 transition-colors">Analytics</button>
                        </nav>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <svg className="absolute left-3 top-[9px] w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            <input placeholder="Search patients..." className="w-48 pl-8 pr-3 py-[7px] bg-[#f1f5f9] border border-slate-200 rounded-lg text-[13px] text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9]/20 transition-all" />
                        </div>
                        <button className="relative p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </button>
                        <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
                            <div className="text-right">
                                <p className="text-[12px] font-semibold text-[#1e293b]">{user.username || 'Admin'}</p>
                                <p className="text-[10px] text-slate-400">Administrator</p>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0ea5e9] to-[#6366f1] flex items-center justify-center text-white text-xs font-bold ring-2 ring-white shadow">
                                {(user.username || 'A').charAt(0).toUpperCase()}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-[1400px] mx-auto px-5 py-5 flex gap-5">
                {/* ========= LEFT SIDEBAR — FILTERS ========= */}
                <aside className="w-[220px] flex-shrink-0">
                    <p className="text-[10px] text-[#0ea5e9] uppercase font-bold tracking-[0.12em] mb-4">Database Filters</p>

                    {/* Last Visit Date */}
                    <div className="mb-5">
                        <div className="flex items-center gap-1.5 mb-2">
                            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            <span className="text-[12px] font-semibold text-[#1e293b]">Last Visit Date</span>
                        </div>
                        <select value={visitRange} onChange={e => setVisitRange(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[12px] text-slate-700 focus:outline-none focus:border-[#0ea5e9] shadow-sm">
                            <option value="">All Time</option>
                            <option value="7d">Last 7 days</option>
                            <option value="30d">Last 30 days</option>
                            <option value="90d">Last 90 days</option>
                        </select>
                    </div>

                    {/* Triage Urgency */}
                    <div className="mb-5">
                        <div className="flex items-center gap-1.5 mb-2">
                            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span className="text-[12px] font-semibold text-[#1e293b]">Triage Urgency</span>
                        </div>
                        {[
                            { key: 'high', label: 'High Priority', color: 'text-red-500 border-red-300 bg-red-50' },
                            { key: 'medium', label: 'Medium Priority', color: 'text-amber-600 border-amber-300 bg-amber-50' },
                            { key: 'standard', label: 'Standard', color: 'text-slate-500 border-slate-200 bg-white' },
                        ].map(f => (
                            <label key={f.key} className="flex items-center gap-2.5 py-1.5 cursor-pointer">
                                <input type="checkbox" checked={urgencyFilters[f.key]} onChange={() => toggleUrgency(f.key)}
                                    className="w-4 h-4 rounded border-slate-300 text-[#0ea5e9] focus:ring-[#0ea5e9]/20" />
                                <span className="text-[12px] text-[#1e293b]">{f.label}</span>
                            </label>
                        ))}
                    </div>

                    {/* Assigned Doctor */}
                    <div className="mb-6">
                        <div className="flex items-center gap-1.5 mb-2">
                            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            <span className="text-[12px] font-semibold text-[#1e293b]">Assigned Doctor</span>
                        </div>
                        <div className="relative mb-2">
                            <svg className="absolute left-2.5 top-[8px] w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            <input value={doctorSearch} onChange={e => setDoctorSearch(e.target.value)}
                                placeholder="Search doctor..."
                                className="w-full pl-8 pr-3 py-[7px] bg-white border border-slate-200 rounded-lg text-[12px] text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#0ea5e9] shadow-sm" />
                        </div>
                        {doctorSearch && filteredDoctors.length > 0 && (
                            <div className="bg-white border border-slate-200 rounded-lg shadow-lg max-h-32 overflow-y-auto mb-2">
                                {filteredDoctors.map(d => (
                                    <button key={d._id || d.id} onClick={() => addDoctor(d.name)}
                                        className="w-full text-left px-3 py-1.5 text-[11px] text-slate-700 hover:bg-slate-50 transition-colors">
                                        {d.name}
                                    </button>
                                ))}
                            </div>
                        )}
                        <div className="flex flex-wrap gap-1">
                            {selectedDoctors.map(name => (
                                <span key={name} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#e0f2fe] text-[#0ea5e9] text-[10px] font-medium rounded-full">
                                    {name.split(' ').pop()}
                                    <button onClick={() => removeDoctor(name)} className="hover:text-red-500 text-xs">×</button>
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Apply / Clear */}
                    <button onClick={handleApplyFilters}
                        className="w-full py-2.5 bg-[#0ea5e9] text-white rounded-xl text-[13px] font-semibold hover:bg-[#0891d4] transition-all shadow-md shadow-[#0ea5e9]/20 mb-2">
                        Apply Filters
                    </button>
                    <button onClick={handleClearFilters}
                        className="w-full py-1.5 text-[12px] text-slate-500 hover:text-slate-700 transition-colors font-medium">
                        Clear All
                    </button>
                </aside>

                {/* ========= MAIN CONTENT ========= */}
                <main className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-5">
                        <div>
                            <h1 className="text-[24px] font-bold text-[#1e293b] leading-tight">Patient History Database</h1>
                            <p className="text-[13px] text-slate-400 mt-0.5">Access historical clinical logs and consultation metrics.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-medium text-[#1e293b] hover:bg-slate-50 transition-all shadow-sm">
                                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                Export CSV
                            </button>
                            <button onClick={() => navigate('/reception')}
                                className="flex items-center gap-2 px-4 py-2.5 bg-[#0ea5e9] text-white rounded-xl text-[13px] font-semibold hover:bg-[#0891d4] transition-all shadow-md shadow-[#0ea5e9]/20">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                                Add Record
                            </button>
                        </div>
                    </div>

                    {/* Search + Sort */}
                    <div className="flex items-center gap-4 mb-5">
                        <form onSubmit={handleSearch} className="flex-1 relative">
                            <svg className="absolute left-4 top-[11px] w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search by Patient ID, Name, or Clinical Condition..."
                                className="w-full pl-11 pr-4 py-[10px] bg-white border border-slate-200 rounded-xl text-[13px] text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#0ea5e9] focus:ring-2 focus:ring-[#0ea5e9]/10 shadow-sm transition-all" />
                        </form>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
                            <span className="text-[12px] text-slate-400">Sorted by:</span>
                            <select value={sortBy} onChange={e => { setSortBy(e.target.value); loadPatients(1); }}
                                className="bg-transparent text-[13px] font-semibold text-[#1e293b] focus:outline-none cursor-pointer appearance-none pr-4"
                                style={{ backgroundImage: 'none' }}>
                                <option value="recent">Most Recent</option>
                                <option value="name">Name</option>
                                <option value="visits">Most Visits</option>
                            </select>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        {/* Table Header */}
                        <div className="grid grid-cols-[80px_1fr_1fr_120px_100px] gap-4 px-6 py-3 text-[10px] text-slate-400 uppercase font-bold tracking-[0.1em] border-b border-slate-100">
                            <span>ID</span>
                            <span>Patient Name</span>
                            <span>Common Reasons</span>
                            <span>Avg. Priority</span>
                            <span className="text-right">Wait Timeline</span>
                        </div>

                        {/* Loading */}
                        {loading && (
                            <div className="py-12 text-center text-slate-400 text-[13px]">Loading patients...</div>
                        )}

                        {/* Rows */}
                        {!loading && patients.map(patient => {
                            const isExpanded = expandedId === patient.id;
                            return (
                                <div key={patient.id}>
                                    {/* Row */}
                                    <div
                                        onClick={() => setExpandedId(isExpanded ? null : patient.id)}
                                        className={`grid grid-cols-[80px_1fr_1fr_120px_100px] gap-4 px-6 py-4 items-center cursor-pointer transition-all hover:bg-slate-50 ${isExpanded ? 'bg-[#f8fafc] border-l-[3px] border-l-[#0ea5e9]' : 'border-b border-slate-50'}`}>
                                        {/* ID */}
                                        <span className="text-[13px] font-bold text-[#0ea5e9]">#{patient.id?.slice(-4)}</span>

                                        {/* Patient Name */}
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[11px] font-bold text-slate-500 flex-shrink-0">
                                                {patient.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-[13px] font-semibold text-[#1e293b]">{patient.name}</p>
                                                <p className="text-[10px] text-slate-400">
                                                    {patient.gender?.charAt(0)?.toUpperCase() || '?'}, {patient.age || '?'} yrs • Last: {getTimeSince(patient.last_visit)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Common Reasons */}
                                        <div className="flex gap-1.5 flex-wrap">
                                            {patient.common_reasons?.length > 0 ? (
                                                patient.common_reasons.map((r, i) => (
                                                    <span key={i} className="px-2 py-0.5 bg-slate-50 border border-slate-100 rounded text-[11px] text-slate-600">{r}</span>
                                                ))
                                            ) : (
                                                <span className="text-[11px] text-slate-400 italic">No records</span>
                                            )}
                                        </div>

                                        {/* Avg Priority */}
                                        <div className="flex items-center gap-1.5">
                                            <span className={`w-2 h-2 rounded-full ${patient.avg_priority >= 7 ? 'bg-red-500' : patient.avg_priority >= 4 ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                                            <span className={`text-[13px] font-bold ${getPriorityColor(patient.avg_priority)}`}>{patient.avg_priority} / 10</span>
                                        </div>

                                        {/* Wait Timeline */}
                                        <div className="flex items-center gap-1 justify-end">
                                            {patient.priority_timeline?.length > 0 ? (
                                                patient.priority_timeline.map((p, i) => (
                                                    <div key={i} className="w-2.5 rounded-sm" style={{
                                                        height: `${12 + (p === 'emergency' ? 14 : p === 'high' ? 10 : p === 'medium' ? 6 : 3)}px`,
                                                        backgroundColor: getTimelineBarColor(p)
                                                    }} />
                                                ))
                                            ) : (
                                                <div className="flex gap-1">{[8, 12, 10, 14, 8].map((h, i) => (
                                                    <div key={i} className="w-2.5 bg-slate-200 rounded-sm" style={{ height: `${h}px` }} />
                                                ))}</div>
                                            )}
                                            {/* Expand chevron */}
                                            <svg className={`w-4 h-4 text-slate-300 ml-2 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                        </div>
                                    </div>

                                    {/* Expanded Content */}
                                    {isExpanded && (
                                        <div className="px-6 pb-5 bg-[#f8fafc] border-b border-slate-100 border-l-[3px] border-l-[#0ea5e9]">
                                            <div className="grid grid-cols-2 gap-5 mt-1">
                                                {/* AI-Summarized Clinical Notes */}
                                                <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <span className="text-sm">✨</span>
                                                        <span className="text-[12px] font-bold text-[#1e293b]">AI-Summarized Clinical Notes</span>
                                                    </div>
                                                    <p className="text-[12px] text-slate-500 italic leading-relaxed">
                                                        {patient.ai_notes
                                                            ? `"${patient.ai_notes}"`
                                                            : patient.common_reasons?.length > 0
                                                                ? `"Patient has visited ${patient.total_visits} time(s). Common presentation includes ${patient.common_reasons.join(', ')}. ${patient.avg_priority >= 7 ? 'Consistent priority escalation noted. Recommended specialized referral.' : 'Standard treatment protocols followed with positive outcomes.'} ${patient.no_show_count > 0 ? `Note: ${patient.no_show_count} no-show(s) recorded.` : ''}"`
                                                                : '"No detailed clinical history available for this patient. First-time visitor or limited records."'}
                                                    </p>
                                                </div>

                                                {/* Details Panel */}
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                                                        <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wide">Historical Priority Score</span>
                                                        <div className="flex gap-1">
                                                            {(patient.priority_timeline?.length > 0 ? patient.priority_timeline : ['normal', 'normal', 'normal']).map((p, i) => (
                                                                <div key={i} className="w-6 h-2.5 rounded-sm" style={{ backgroundColor: getTimelineBarColor(p) }} />
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                                                        <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wide">Assigned Room Lead</span>
                                                        <span className="text-[13px] font-medium text-[#1e293b]">{patient.assigned_doctor || 'Unassigned'}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                                                        <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wide">Total Visits</span>
                                                        <span className="text-[13px] font-medium text-[#1e293b]">{patient.total_visits}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4 pt-1">
                                                        <button className="text-[11px] font-bold text-[#0ea5e9] uppercase tracking-wide hover:text-[#0891d4] transition-colors">View Full Logs</button>
                                                        <button className="text-[11px] font-bold text-[#0ea5e9] uppercase tracking-wide hover:text-[#0891d4] transition-colors">Edit Record</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Empty State */}
                        {!loading && patients.length === 0 && (
                            <div className="py-16 text-center">
                                <p className="text-slate-400 text-[14px]">No patients found</p>
                                <p className="text-slate-300 text-[12px] mt-1">Try adjusting your filters or search query</p>
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {pagination.totalPages > 0 && (
                        <div className="flex items-center justify-between mt-4">
                            <span className="text-[12px] text-slate-400">
                                Showing {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} patients
                            </span>
                            <div className="flex items-center gap-1">
                                <button onClick={() => loadPatients(pagination.page - 1)} disabled={pagination.page <= 1}
                                    className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 disabled:opacity-30 transition-all">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                                    let page;
                                    if (pagination.totalPages <= 5) {
                                        page = i + 1;
                                    } else if (pagination.page <= 3) {
                                        page = i + 1;
                                    } else if (pagination.page >= pagination.totalPages - 2) {
                                        page = pagination.totalPages - 4 + i;
                                    } else {
                                        page = pagination.page - 2 + i;
                                    }
                                    return (
                                        <button key={page} onClick={() => loadPatients(page)}
                                            className={`w-8 h-8 rounded-lg text-[12px] font-semibold transition-all ${pagination.page === page ? 'bg-[#0ea5e9] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 border border-slate-200'}`}>
                                            {page}
                                        </button>
                                    );
                                })}
                                {pagination.totalPages > 5 && (
                                    <>
                                        <span className="text-slate-400 text-[12px] px-1">...</span>
                                        <button onClick={() => loadPatients(pagination.totalPages)}
                                            className={`w-8 h-8 rounded-lg text-[12px] font-semibold transition-all ${pagination.page === pagination.totalPages ? 'bg-[#0ea5e9] text-white' : 'text-slate-500 hover:bg-slate-50 border border-slate-200'}`}>
                                            {pagination.totalPages}
                                        </button>
                                    </>
                                )}
                                <button onClick={() => loadPatients(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}
                                    className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 disabled:opacity-30 transition-all">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </button>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
