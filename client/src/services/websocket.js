class WebSocketService {
    constructor() {
        this.ws = null;
        this.listeners = new Map();
        this.reconnectInterval = 3000;
        this.reconnectTimer = null;
        this.isConnected = false;
        this.shouldReconnect = true;
    }

    connect() {
        // Clear any pending reconnect
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        // Close existing connection cleanly
        if (this.ws) {
            this.ws.onclose = null;
            this.ws.onerror = null;
            this.ws.onmessage = null;
            this.ws.onopen = null;
            if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
                this.ws.close();
            }
            this.ws = null;
        }

        this.shouldReconnect = true;

        try {
            const wsUrl = import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:5050`;
            this.ws = new WebSocket(wsUrl);
        } catch (e) {
            this.scheduleReconnect();
            return;
        }

        this.ws.onopen = () => {
            this.isConnected = true;
            console.log('🔌 WebSocket connected');
            this.emit('connection', { connected: true });
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.emit(data.type, data.data || data);
            } catch (e) {
                // ignore parse errors
            }
        };

        this.ws.onclose = () => {
            this.isConnected = false;
            this.emit('connection', { connected: false });
            if (this.shouldReconnect) {
                this.scheduleReconnect();
            }
        };

        this.ws.onerror = () => {
            // Error will trigger onclose, no need to log separately
        };
    }

    scheduleReconnect() {
        if (this.reconnectTimer) return;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            if (this.shouldReconnect) {
                this.connect();
            }
        }, this.reconnectInterval);
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
        return () => {
            const callbacks = this.listeners.get(event);
            if (callbacks) {
                const index = callbacks.indexOf(callback);
                if (index > -1) callbacks.splice(index, 1);
            }
        };
    }

    emit(event, data) {
        const callbacks = this.listeners.get(event) || [];
        callbacks.forEach(cb => {
            try { cb(data); } catch (e) { /* ignore */ }
        });
    }

    send(type, data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type, data }));
        }
    }

    disconnect() {
        this.shouldReconnect = false;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.ws) {
            this.ws.onclose = null;
            this.ws.onerror = null;
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
    }
}

export const wsService = new WebSocketService();
export default wsService;
