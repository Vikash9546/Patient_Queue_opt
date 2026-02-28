require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { initializeDatabase } = require('./config/database');
const { createWSServer } = require('./websocket/wsServer');
const { initAI } = require('./services/aiService');
const errorHandler = require('./middleware/errorHandler');
const authMiddleware = require('./middleware/auth');
const activityLogger = require('./middleware/activityLogger');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Initialize AI
initAI();

// Create WebSocket server
createWSServer(server);

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/patients', authMiddleware, activityLogger, require('./routes/patients'));
app.use('/api/doctors', authMiddleware, activityLogger, require('./routes/doctors'));
app.use('/api/appointments', authMiddleware, activityLogger, require('./routes/appointments'));
app.use('/api/queue', authMiddleware, activityLogger, require('./routes/queue'));
app.use('/api/analytics', authMiddleware, activityLogger, require('./routes/analytics'));
app.use('/api/ai', authMiddleware, activityLogger, require('./routes/ai'));
app.use('/api/demo', authMiddleware, activityLogger, require('./routes/demo'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'MediQueue AI Server', version: '1.0.0' });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Start server after connecting to MongoDB
async function startServer() {
  try {
    await initializeDatabase();
    server.listen(PORT, () => {
      console.log(`
  🏥 ═══════════════════════════════════════════
  ║   MediQueue AI Server Running!             ║
  ║   REST API: http://localhost:${PORT}          ║
  ║   WebSocket: ws://localhost:${PORT}           ║
  ║   Database: MongoDB                        ║
  ═══════════════════════════════════════════════
  `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
