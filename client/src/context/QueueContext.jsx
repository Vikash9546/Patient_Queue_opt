import { createContext, useContext, useState, useEffect } from 'react';
import { wsService } from '../services/websocket';
import api from '../services/api';

const QueueContext = createContext();

export function QueueProvider({ children }) {
    const [queue, setQueue] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [wsConnected, setWsConnected] = useState(false);

    useEffect(() => {
        wsService.connect();
        const unsub1 = wsService.on('queue_update', (data) => {
            if (Array.isArray(data)) setQueue(data);
        });
        const unsub2 = wsService.on('connection', ({ connected }) => setWsConnected(connected));
        const unsub3 = wsService.on('emergency', (data) => {
            // Could show notification toast
            console.log('🚨 Emergency:', data);
        });

        fetchDoctors();
        fetchQueue();

        return () => { unsub1(); unsub2(); unsub3(); wsService.disconnect(); };
    }, []);

    async function fetchQueue(doctorId) {
        try {
            const res = await api.getQueue(doctorId);
            setQueue(res.data);
        } catch (e) { console.error('Queue fetch error:', e); }
    }

    async function fetchDoctors() {
        try {
            const res = await api.getDoctors();
            setDoctors(res.data);
        } catch (e) { console.error('Doctors fetch error:', e); }
    }

    return (
        <QueueContext.Provider value={{ queue, doctors, loading, wsConnected, fetchQueue, fetchDoctors, setQueue }}>
            {children}
        </QueueContext.Provider>
    );
}

export function useQueueContext() {
    return useContext(QueueContext);
}
