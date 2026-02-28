import { useState, useEffect } from 'react';
import { useQueueContext } from '../context/QueueContext';

export default function QueueTVScreen() {
    const { queue, doctors } = useQueueContext();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [selectedDoctor, setSelectedDoctor] = useState('');

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (doctors.length > 0 && !selectedDoctor) setSelectedDoctor(doctors[0].id);
    }, [doctors]);

    const doctorQueue = selectedDoctor
        ? queue.filter(q => q.doctor_id === selectedDoctor)
        : queue;
    const currentPatient = doctorQueue.find(q => q.status === 'in_consultation');
    const waitingPatients = doctorQueue.filter(q => q.status === 'waiting').slice(0, 5);
    const doctor = doctors.find(d => d.id === selectedDoctor);

    return (
        <div className="tv-screen text-white p-8 relative overflow-hidden">
            {/* Animated background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 animate-pulse" />
                <div className="absolute w-[500px] h-[500px] -top-48 -right-48 bg-indigo-500/5 rounded-full blur-3xl" />
                <div className="absolute w-[500px] h-[500px] -bottom-48 -left-48 bg-purple-500/5 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl gradient-accent flex items-center justify-center shadow-lg shadow-indigo-500/30">
                            <span className="text-3xl">🏥</span>
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                                MediQueue AI
                            </h1>
                            <p className="text-slate-400 text-lg">Smart Patient Queue System</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-5xl font-bold tabular-nums">
                            {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </p>
                        <p className="text-slate-400 text-lg">
                            {currentTime.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                    </div>
                </div>

                {/* Doctor Selector */}
                <div className="flex gap-3 mb-8 flex-wrap">
                    {doctors.map(d => (
                        <button key={d.id} onClick={() => setSelectedDoctor(d.id)}
                            className={`px-6 py-3 rounded-xl text-lg font-medium transition-all ${selectedDoctor === d.id
                                    ? 'gradient-accent text-white shadow-lg shadow-indigo-500/30'
                                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
                                }`}>
                            {d.name} — {d.specialty}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-3 gap-8">
                    {/* Current Patient */}
                    <div className="col-span-1">
                        <h2 className="text-xl font-bold text-slate-400 uppercase tracking-wider mb-4">
                            🩺 Now Consulting
                        </h2>
                        {currentPatient ? (
                            <div className="tv-current tv-patient-card p-8 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 gradient-accent" />
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-16 h-16 rounded-2xl gradient-accent flex items-center justify-center text-3xl font-bold shadow-lg">
                                        {currentPatient.patient_name?.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-3xl font-bold">{currentPatient.patient_name}</p>
                                        <p className="text-indigo-400 text-lg">Age: {currentPatient.patient_age}</p>
                                    </div>
                                </div>
                                <div className="space-y-2 text-lg">
                                    <p><span className="text-slate-400">Symptoms: </span>{currentPatient.symptoms}</p>
                                    <p><span className="text-slate-400">Duration: </span>
                                        <span className="text-indigo-400 font-bold">~{currentPatient.estimated_duration}min</span>
                                    </p>
                                </div>
                                <div className="mt-6">
                                    <div className="progress-bar h-3">
                                        <div className="progress-bar-fill animate-pulse" style={{ width: '60%' }} />
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1 text-right">In progress...</p>
                                </div>
                            </div>
                        ) : (
                            <div className="tv-next tv-patient-card p-8 text-center">
                                <span className="text-6xl block mb-4">✅</span>
                                <p className="text-2xl text-slate-400">No patient currently</p>
                            </div>
                        )}
                    </div>

                    {/* Upcoming Patients */}
                    <div className="col-span-2">
                        <h2 className="text-xl font-bold text-slate-400 uppercase tracking-wider mb-4">
                            📋 Upcoming Patients
                        </h2>
                        <div className="space-y-3">
                            {waitingPatients.length === 0 ? (
                                <div className="tv-next tv-patient-card p-8 text-center">
                                    <span className="text-4xl block mb-2">🎉</span>
                                    <p className="text-xl text-slate-400">No patients waiting</p>
                                </div>
                            ) : (
                                waitingPatients.map((entry, idx) => (
                                    <div key={entry.id}
                                        className={`tv-next tv-patient-card flex items-center gap-6 ${idx === 0 ? 'border-indigo-500/30 bg-indigo-500/10' : ''
                                            }`}
                                        style={{ animationDelay: `${idx * 0.1}s` }}>
                                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold ${idx === 0 ? 'gradient-accent' : 'bg-slate-700'
                                            }`}>
                                            #{entry.position}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xl font-semibold">{entry.patient_name}</p>
                                            <p className="text-slate-400">{entry.symptoms || 'General consultation'}</p>
                                        </div>
                                        <div className={`priority-badge ${entry.priority} text-sm`}>
                                            {entry.priority}
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-bold text-indigo-400">{entry.estimated_wait_mins}</p>
                                            <p className="text-sm text-slate-400">min wait</p>
                                        </div>
                                        <div className="w-32">
                                            <div className="progress-bar">
                                                <div className="progress-bar-fill"
                                                    style={{ width: `${Math.max(100 - entry.estimated_wait_mins * 2, 10)}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 flex items-center justify-between text-slate-500 text-sm">
                    <p>👨‍⚕️ {doctor?.name} — {doctor?.specialty}</p>
                    <p className="animate-pulse">🔄 Auto-updating in real-time</p>
                    <p>🏥 Powered by MediQueue AI</p>
                </div>
            </div>
        </div>
    );
}
