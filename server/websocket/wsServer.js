const WebSocket = require('ws');

function createWSServer(server) {
    const wss = new WebSocket.Server({ server });
    const clients = new Set();

    wss.on('connection', (ws) => {
        clients.add(ws);
        console.log(`🔌 WebSocket client connected (${clients.size} total)`);

        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message);
                console.log('📨 WS Message:', data.type);
            } catch (e) {
                // ignore
            }
        });

        ws.on('close', () => {
            clients.delete(ws);
            console.log(`🔌 WebSocket client disconnected (${clients.size} total)`);
        });

        // Send welcome
        ws.send(JSON.stringify({ type: 'connected', message: 'Connected to MediQueue AI' }));
    });

    // Global broadcast function
    global.broadcast = (data) => {
        const message = JSON.stringify(data);
        clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    };

    return wss;
}

module.exports = { createWSServer };
