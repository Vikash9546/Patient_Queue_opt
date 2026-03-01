import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueueContext } from '../context/QueueContext';

export default function QueueTVScreen() {
    const { queue, doctors } = useQueueContext();
    const [currentTime, setCurrentTime] = useState(new Date());
    const location = useLocation();
    const navigate = useNavigate();

    const specificDoctorId = location.state?.doctorId || null;
    const displayDoctors = specificDoctorId ? doctors.filter(d => (d._id || d.id) === specificDoctorId) : doctors;

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const queueByDoctor = {};
    queue.forEach(q => { if (!queueByDoctor[q.doctor_id]) queueByDoctor[q.doctor_id] = []; queueByDoctor[q.doctor_id].push(q); });

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                        <span className="text-2xl">🏥</span>
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">MediQueue AI</h1>
                        <p className="text-slate-400 text-sm">Patient Queue Display</p>
                    </div>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                    {specificDoctorId && (
                        <button onClick={() => navigate('/queue-tv', { replace: true, state: {} })} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-semibold text-slate-300 transition-colors">
                            ← Back to Full Clinic View
                        </button>
                    )}
                    <div>
                        <p className="text-4xl font-bold text-white font-mono">
                            {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-slate-400 text-sm">{currentTime.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                </div>
            </div>

            {/* Queue Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {displayDoctors.map(doc => {
                    const docQueue = queueByDoctor[doc._id || doc.id] || [];
                    const currentP = docQueue.find(q => q.status === 'in_consultation');
                    const nextP = docQueue.filter(q => q.status === 'waiting').slice(0, 5);

                    return (
                        <div key={doc._id || doc.id} className="bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden shadow-xl">
                            {/* Doctor Header */}
                            <div className="px-6 py-4 bg-gradient-to-r from-slate-700/80 to-slate-800/80 flex items-center justify-between border-b border-slate-700/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg">
                                        {doc.name.charAt(4)}
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-white">{doc.name}</h2>
                                        <p className="text-xs text-slate-400">{doc.specialty}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`w-3 h-3 rounded-full ${doc.status === 'available' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}
                                        style={{ boxShadow: doc.status === 'available' ? '0 0 12px rgba(52, 211, 153, 0.5)' : '0 0 12px rgba(251, 191, 36, 0.5)' }}></span>
                                    <span className="text-xs text-slate-300 uppercase font-medium">{doc.status}</span>
                                </div>
                            </div>

                            {/* Current Patient */}
                            {currentP && (
                                <div className="mx-4 mt-4 p-4 rounded-xl bg-indigo-500/15 border border-indigo-400/30" style={{ boxShadow: '0 0 25px rgba(99, 102, 241, 0.15)' }}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs text-indigo-300 font-bold uppercase tracking-wider flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                                            Now Consulting
                                        </span>
                                        <span className="text-xs text-indigo-300">~{currentP.estimated_duration || 15} min</span>
                                    </div>
                                    <p className="text-xl font-bold text-white">{currentP.patient_name}</p>
                                    <p className="text-sm text-slate-400 mt-0.5">{currentP.symptoms || 'General Consultation'}</p>
                                </div>
                            )}

                            {/* Waiting Queue */}
                            <div className="p-4 space-y-2">
                                {nextP.length === 0 && !currentP && (
                                    <p className="text-center text-slate-500 py-6">No patients in queue</p>
                                )}
                                {nextP.map((entry, idx) => (
                                    <div key={entry.id || entry._id} className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-500 ${entry.priority === 'emergency' ? 'bg-red-500/10 border border-red-500/20' :
                                        'bg-slate-700/30 border border-slate-600/20'
                                        }`} style={{ animation: `slideIn 0.5s ease-out ${idx * 100}ms both` }}>
                                        <span className="text-2xl font-bold text-slate-500 w-10 text-center">{entry.position}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-white truncate">{entry.patient_name}</p>
                                            <p className="text-xs text-slate-400 truncate">{entry.symptoms || 'Walk-in'}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-1 w-max ml-auto ${entry.priority === 'emergency' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                                entry.priority === 'high' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                                    entry.priority === 'medium' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                                        'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                }`}>{entry.priority} <span className="opacity-60 text-[10px]">⭐ {Math.round(entry.priority_score || 0)}</span></span>
                                            <p className="text-xs text-slate-500 mt-1">{entry.estimated_wait_mins}m wait</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="mt-8 text-center">
                <p className="text-slate-500 text-sm">🤖 Powered by MediQueue AI — Queue is auto-optimized in real-time</p>
            </div>

            <style>{`
                @keyframes slideIn { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
            `}</style>
        </div>
    );
}
