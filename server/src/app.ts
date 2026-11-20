import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import { Server as SocketIOServer } from 'socket.io';
import { ENV } from './config/env';
import apiRoutes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { setupSignaling } from './sockets/signaling';

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: [ENV.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  },
  pingTimeout: 30000,
  pingInterval: 10000,
});

// Setup WebRTC and Meeting Signaling
setupSignaling(io);

// Middleware
app.use(
  cors({
    origin: [ENV.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  })
);
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Static file hosting for uploads (with video range caching headers)
const uploadsPath = path.resolve(__dirname, '../../storage/uploads');
app.use('/uploads', express.static(uploadsPath, {
  maxAge: '1d',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.mp4') || filePath.endsWith('.webm')) {
      res.setHeader('Accept-Ranges', 'bytes');
    }
  },
}));

// API Routes
app.use('/api/v1', apiRoutes);
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    platform: 'LIVE',
    tagline: 'Everything happens live.',
    timestamp: new Date().toISOString(),
  });
});

// Centralized error handler
app.use(errorHandler);

// Start server when executed directly as entrypoint
if (require.main === module) {
  server.listen(ENV.PORT, () => {
    console.log(`\n======================================================`);
    console.log(`  LIVE Server is active`);
    console.log(`  Port: http://localhost:${ENV.PORT}`);
    console.log(`  Client Allowed: ${ENV.CLIENT_URL}`);
    console.log(`  Database: ${ENV.DATABASE_URL}`);
    console.log(`  Environment: ${ENV.NODE_ENV}`);
    console.log(`======================================================\n`);
  });
}

export { app, server, io };
