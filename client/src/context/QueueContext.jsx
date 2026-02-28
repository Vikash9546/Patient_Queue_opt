import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { wsService } from '../services/websocket';
import api from '../services/api';

const QueueContext = createContext();

export function QueueProvider({ children }) {
    const [queue, setQueue] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [wsConnected, setWsConnected] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const mountedRef = useRef(true);

    const fetchQueue = useCallback(async (doctorId) => {
        try {
            const res = await api.getQueue(doctorId);
            if (mountedRef.current) setQueue(res.data);
        } catch (e) { console.error('Queue fetch error:', e); }
    }, []);

    const fetchDoctors = useCallback(async () => {
        try {
            const res = await api.getDoctors();
            if (mountedRef.current) setDoctors(res.data);
        } catch (e) { console.error('Doctors fetch error:', e); }
    }, []);

    const addNotification = useCallback((notification) => {
        const id = Date.now();
        const item = { id, ...notification, timestamp: new Date() };
        setNotifications(prev => [item, ...prev].slice(0, 20));
        // Auto-dismiss after 8 seconds
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 8000);
    }, []);

    useEffect(() => {
        mountedRef.current = true;

        wsService.connect();

        // Listen: queue updates (live data)
        const unsub1 = wsService.on('queue_update', (data) => {
            if (mountedRef.current && Array.isArray(data)) {
                setQueue(data);
            }
        });

        // Listen: connection state
        const unsub2 = wsService.on('connection', ({ connected }) => {
            if (mountedRef.current) {
                setWsConnected(connected);
                // Refetch fresh data when reconnected
                if (connected) {
                    fetchQueue();
                    fetchDoctors();
                }
            }
        });

        // Listen: emergency alerts
        const unsub3 = wsService.on('emergency', (data) => {
            if (mountedRef.current) {
                addNotification({
                    type: 'emergency',
                    title: '🚨 Emergency Patient',
                    message: `${data.patient_name} assigned to doctor. Queue rebalanced.`,
                    data
                });
            }
        });

        // Listen: patient called
        const unsub4 = wsService.on('patient_called', (data) => {
            if (mountedRef.current) {
                addNotification({
                    type: 'info',
                    title: '📢 Patient Called',
                    message: `${data.patient_name || 'Next patient'} has been called.`,
                    data
                });
            }
        });

        // Listen: consultation complete
        const unsub5 = wsService.on('consultation_complete', (data) => {
            if (mountedRef.current) {
                addNotification({
                    type: 'success',
                    title: '✅ Consultation Complete',
                    message: `Session for ${data.patient_name || 'patient'} completed.`,
                    data
                });
                // Refetch queue and doctors
                fetchQueue();
                fetchDoctors();
            }
        });

        // Listen: simulation progress
        const unsub6 = wsService.on('simulation_progress', (data) => {
            if (mountedRef.current) {
                console.log(`⏳ Simulation: ${data.current}/${data.total}`);
            }
        });

        // Listen: simulation complete
        const unsub7 = wsService.on('simulation_complete', () => {
            if (mountedRef.current) {
                addNotification({
                    type: 'success',
                    title: '🎲 Simulation Complete',
                    message: 'Demo data generated successfully.'
                });
                fetchQueue();
                fetchDoctors();
            }
        });

        // Listen: doctor status update
        const unsub8 = wsService.on('doctor_status', (data) => {
            if (mountedRef.current) {
                setDoctors(prev => prev.map(d =>
                    (d._id === data.doctor_id || d.id === data.doctor_id)
                        ? { ...d, status: data.status }
                        : d
                ));
            }
        });

        // Initial data fetch
        fetchQueue();
        fetchDoctors();

        return () => {
            mountedRef.current = false;
            unsub1(); unsub2(); unsub3(); unsub4();
            unsub5(); unsub6(); unsub7(); unsub8();
            wsService.disconnect();
        };
    }, [fetchQueue, fetchDoctors, addNotification]);

    const clearNotifications = useCallback(() => setNotifications([]), []);

    return (
        <QueueContext.Provider value={{
            queue, doctors, loading, wsConnected,
            notifications, clearNotifications,
            fetchQueue, fetchDoctors, setQueue, setDoctors
        }}>
            {children}
        </QueueContext.Provider>
    );
}

export function useQueueContext() {
    return useContext(QueueContext);
}
