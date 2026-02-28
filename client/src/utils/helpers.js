export function formatTime(dateStr) {
    if (!dateStr) return '--:--';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function getUrgencyColor(urgency) {
    const colors = {
        emergency: 'text-red-400 bg-red-500/20 border-red-500/30',
        high: 'text-amber-400 bg-amber-500/20 border-amber-500/30',
        medium: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
        low: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30',
        normal: 'text-slate-400 bg-slate-500/20 border-slate-500/30',
    };
    return colors[urgency] || colors.normal;
}

export function getStatusColor(status) {
    const colors = {
        waiting: 'text-amber-400',
        in_consultation: 'text-indigo-400',
        completed: 'text-emerald-400',
        cancelled: 'text-red-400',
        no_show: 'text-slate-500',
        scheduled: 'text-blue-400',
        checked_in: 'text-cyan-400',
    };
    return colors[status] || 'text-slate-400';
}

export function getStatusLabel(status) {
    const labels = {
        waiting: '⏳ Waiting',
        in_consultation: '🩺 In Consultation',
        completed: '✅ Completed',
        cancelled: '❌ Cancelled',
        no_show: '👻 No Show',
        scheduled: '📅 Scheduled',
        checked_in: '✔️ Checked In',
    };
    return labels[status] || status;
}

export function getTodayISO() {
    return new Date().toISOString().split('T')[0];
}
