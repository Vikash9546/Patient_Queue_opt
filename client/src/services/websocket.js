class WebSocketService {
    constructor() {
        this.ws = null;
        this.listeners = new Map();
        this.reconnectInterval = 3000;
        this.isConnected = false;
    }

    connect() {
        const wsUrl = `ws://${window.location.hostname}:5050`;
        this.ws = new WebSocket(wsUrl);

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
                console.error('WS parse error:', e);
            }
        };

        this.ws.onclose = () => {
            this.isConnected = false;
            console.log('🔌 WebSocket disconnected, reconnecting...');
            this.emit('connection', { connected: false });
            setTimeout(() => this.connect(), this.reconnectInterval);
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
        return () => {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) callbacks.splice(index, 1);
        };
    }

    emit(event, data) {
        const callbacks = this.listeners.get(event) || [];
        callbacks.forEach(cb => cb(data));
    }

    send(type, data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type, data }));
        }
    }

    disconnect() {
        if (this.ws) this.ws.close();
    }
}

export const wsService = new WebSocketService();
export default wsService;
