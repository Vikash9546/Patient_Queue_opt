import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ProfilePage() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('mediqueue_user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        } else {
            navigate('/login');
        }
    }, [navigate]);

    function handleLogout() {
        localStorage.removeItem('mediqueue_token');
        localStorage.removeItem('mediqueue_user');
        navigate('/login');
    }

    if (!user) return null;

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
            {/* Top Navigation */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
                <div className="max-w-[1440px] mx-auto px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate(user.role === 'doctor' ? '/doctor' : '/reception')}>
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                                <span className="text-white text-sm font-bold">M</span>
                            </div>
                            <span className="font-bold text-slate-800 text-lg">MediQueue AI</span>
                        </div>
                    </div>
                    <button onClick={() => navigate(-1)} className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">
                        ← Back to Panel
                    </button>
                </div>
            </header>

            <main className="flex-1 flex items-center justify-center px-4 py-12">
                <div className="w-full max-w-xl">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden relative">
                        {/* Header Background */}
                        <div className="h-32 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>

                        {/* Profile Info Container */}
                        <div className="px-8 pb-8 flex flex-col items-center">
                            {/* Avatar */}
                            <div className="w-24 h-24 rounded-full bg-white p-1.5 -mt-12 shadow-lg mb-4 relative">
                                <div className="w-full h-full rounded-full bg-gradient-to-br from-[#0ea5e9] to-[#6366f1] flex items-center justify-center text-white text-3xl font-bold">
                                    {user.name ? user.name.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
                                </div>
                            </div>

                            {/* Info */}
                            <h2 className="text-2xl font-bold text-slate-800 text-center">{user.name || user.username}</h2>
                            <p className="text-slate-500 font-medium text-[15px] mb-2">@{user.username}</p>
                            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-8 bg-blue-50 text-blue-600 border border-blue-200">
                                {user.role}
                            </span>

                            {/* Details Grid */}
                            <div className="w-full grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Status</p>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                        <p className="text-sm font-semibold text-slate-700">Active Session</p>
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Access Level</p>
                                    <p className="text-sm font-semibold text-slate-700 capitalize">{user.role} Privileges</p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="w-full border-t border-slate-100 pt-6">
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 transition-all focus:outline-none focus:ring-2 focus:ring-red-500/20"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                    Sign Out securely
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="text-center mt-6">
                        <p className="text-xs text-slate-400">Authenticated via MediQueue encrypted portal.</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
