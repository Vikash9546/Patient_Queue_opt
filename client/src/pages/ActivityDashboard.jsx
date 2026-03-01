import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function ActivityDashboard() {
    const navigate = useNavigate();
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        loadActivities(page);
    }, [page]);

    async function loadActivities(p) {
        try {
            setLoading(true);
            const res = await api.getActivityLogs(p, 50); // Fetch 50 items per page
            setActivities(res.data);
            setTotalPages(res.meta.pages);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

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
                            <button onClick={() => navigate('/doctor')} className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-all">Live Queue</button>
                            <button onClick={() => navigate('/patient-history')} className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-all">Patient History</button>
                            <button onClick={() => navigate('/analytics')} className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-all">Analytics</button>
                            <button className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg">Activity Logs</button>
                        </nav>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <svg className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            <input placeholder="Search activities..." className="w-48 pl-9 pr-3 py-[7px] bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-all" />
                        </div>
                        <button onClick={() => navigate('/profile')} className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-md hover:shadow-lg transition-all">
                            A
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-[1440px] mx-auto px-6 py-8">
                <div className="mb-8 flex items-end justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-800 mb-2">User Activity Tracker</h1>
                        <p className="text-slate-500 text-[15px]">A complete chronological history of meaningful database events and system actions</p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50/50">
                                    <th className="px-6 py-4 text-[13px] font-bold text-slate-500 uppercase tracking-wider w-40">Timestamp</th>
                                    <th className="px-6 py-4 text-[13px] font-bold text-slate-500 uppercase tracking-wider w-36">User ID</th>
                                    <th className="px-6 py-4 text-[13px] font-bold text-slate-500 uppercase tracking-wider w-32">Method</th>
                                    <th className="px-6 py-4 text-[13px] font-bold text-slate-500 uppercase tracking-wider w-48">Path</th>
                                    <th className="px-6 py-4 text-[13px] font-bold text-slate-500 uppercase tracking-wider w-80">Payload</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-slate-400 animate-pulse">Loading logs...</td>
                                    </tr>
                                ) : activities.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-slate-400">No activity logs found.</td>
                                    </tr>
                                ) : (
                                    activities.map((act) => (
                                        <tr key={act._id} className="border-b border-slate-100 hover:bg-slate-50/75 transition-colors group">
                                            <td className="px-6 py-4 text-[13.5px] whitespace-nowrap">
                                                <div className="text-slate-700 font-medium">
                                                    {new Date(act.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                                <div className="text-slate-400 text-xs mt-0.5">
                                                    {new Date(act.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-[13.5px]">
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 font-mono text-xs border border-slate-200 group-hover:bg-white transition-colors">
                                                    {act.user_id}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold uppercase ${act.method === 'POST' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                                                    act.method === 'PUT' || act.method === 'PATCH' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                                                        act.method === 'DELETE' ? 'bg-red-50 text-red-600 border border-red-200' :
                                                            'bg-blue-50 text-blue-600 border border-blue-200'
                                                    }`}>
                                                    {act.method}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-[13.5px] text-slate-600 font-medium font-mono truncate max-w-[200px]" title={act.path}>
                                                {act.path}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-[12px] font-mono text-slate-500 bg-slate-50 rounded-lg p-2.5 border border-slate-100 max-h-24 overflow-y-auto w-full group-hover:bg-white group-hover:shadow-sm transition-all" style={{ wordBreak: 'break-all' }}>
                                                    {act.payload || <span className="text-slate-300 italic">null</span>}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                            <span className="text-sm text-slate-500">
                                Page <span className="font-semibold text-slate-700">{page}</span> of <span className="font-semibold text-slate-700">{totalPages}</span>
                            </span>
                            <div className="flex gap-2">
                                <button
                                    disabled={page === 1}
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    Previous
                                </button>
                                <button
                                    disabled={page === totalPages}
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
