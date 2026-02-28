import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    async function handleLogin(e) {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.login({ username: username || 'reception1', password: password || 'password123' });
            localStorage.setItem('mediqueue_token', res.token);
            localStorage.setItem('mediqueue_user', JSON.stringify(res.user));
            if (res.user.role === 'doctor') navigate('/doctor');
            else navigate('/reception');
        } catch (err) {
            alert('Login failed');
        }
        setLoading(false);
    }

    function quickLogin(role) {
        const creds = {
            receptionist: { username: 'reception1', password: 'password123' },
            doctor: { username: 'doctor1', password: 'password123' },
            admin: { username: 'admin', password: 'password123' },
        };
        setUsername(creds[role].username);
        setPassword(creds[role].password);
    }

    return (
        <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-20 left-20 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl float-animation" />
                <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl float-animation" style={{ animationDelay: '1.5s' }} />
                <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl float-animation" style={{ animationDelay: '3s' }} />
            </div>

            <div className="glass-card p-8 w-full max-w-md animate-slide-up relative z-10">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-accent mb-4 shadow-lg shadow-indigo-500/30">
                        <span className="text-3xl">🏥</span>
                    </div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                        MediQueue AI
                    </h1>
                    <p className="text-slate-400 mt-2">Intelligent Patient Queue System</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Username</label>
                        <input
                            type="text" value={username} onChange={e => setUsername(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                            placeholder="Enter username"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                        <input
                            type="password" value={password} onChange={e => setPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                            placeholder="Enter password"
                        />
                    </div>
                    <button
                        type="submit" disabled={loading}
                        className="w-full py-3 rounded-xl font-semibold text-white gradient-accent hover:opacity-90 transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-50"
                    >
                        {loading ? '⏳ Signing in...' : '🔐 Sign In'}
                    </button>
                </form>

                {/* Quick Access */}
                <div className="mt-6 pt-6 border-t border-slate-700">
                    <p className="text-xs text-slate-400 text-center mb-3">⚡ Quick Demo Access</p>
                    <div className="grid grid-cols-3 gap-2">
                        <button onClick={() => quickLogin('receptionist')} className="py-2 px-3 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-medium hover:bg-emerald-500/30 transition-all border border-emerald-500/20">
                            👩‍💼 Reception
                        </button>
                        <button onClick={() => quickLogin('doctor')} className="py-2 px-3 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-medium hover:bg-blue-500/30 transition-all border border-blue-500/20">
                            👨‍⚕️ Doctor
                        </button>
                        <button onClick={() => quickLogin('admin')} className="py-2 px-3 rounded-lg bg-purple-500/20 text-purple-400 text-xs font-medium hover:bg-purple-500/30 transition-all border border-purple-500/20">
                            🔑 Admin
                        </button>
                    </div>
                </div>

                {/* Nav Links */}
                <div className="mt-4 flex justify-center gap-4 text-xs text-slate-500">
                    <a href="/queue-tv" className="hover:text-indigo-400 transition-colors">📺 TV Display</a>
                    <a href="/book" className="hover:text-indigo-400 transition-colors">📅 Book Appointment</a>
                    <a href="/analytics" className="hover:text-indigo-400 transition-colors">📊 Analytics</a>
                </div>
            </div>
        </div>
    );
}
