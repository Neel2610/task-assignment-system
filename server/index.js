const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

const app = express();
const serverStartTime = new Date();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Activity log system (in-memory, max 100 entries)
let activityLog = [];

// Helper: Format uptime into human readable string (e.g., "2h 30m 15s")
const formatUptime = (seconds) => {
  const totalSeconds = Math.floor(seconds);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);

  return parts.join(' ');
};

// Request logger middleware (runs on every request)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${req.ip}`);
  next();
});

// API Routes

// 1. GET /api/health
app.get('/api/health', (req, res) => {
  const uptime = process.uptime();
  res.json({
    status: 'OK',
    app: process.env.APP_NAME,
    version: process.env.APP_VERSION,
    uptime: uptime,
    uptimeFormatted: formatUptime(uptime),
    timestamp: new Date().toISOString(),
    server: 'TaskFlow Node.js Server',
    port: process.env.PORT || 3001
  });
});

// 2. GET /api/app-info
app.get('/api/app-info', (req, res) => {
  res.json({
    name: process.env.APP_NAME,
    version: process.env.APP_VERSION,
    description: 'Project Management and Task Assignment System',
    author: process.env.APP_AUTHOR,
    college: process.env.COLLEGE,
    university: process.env.UNIVERSITY,
    techStack: {
      frontend: 'React + Vite + Tailwind CSS',
      backend: 'Node.js + Express',
      database: 'PostgreSQL via Supabase',
      auth: 'Supabase Auth',
      deployment: 'Local'
    },
    features: [
      'Role-based access control',
      'Kanban board with drag and drop',
      'Real-time project management',
      'Task assignment and tracking',
      'Team collaboration',
      'Activity logging'
    ]
  });
});

// 3. POST /api/log
app.post('/api/log', (req, res) => {
  const { action, user, page, details } = req.body;
  const timestamp = new Date().toISOString();

  const logEntry = {
    id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
    timestamp,
    method: req.method,
    url: req.url,
    user: user || 'Anonymous',
    action: action || 'Unknown Action',
    page: page || 'Unknown Page',
    details: details || '',
    ip: req.ip
  };

  activityLog.push(logEntry);

  // Keep max 100 entries, remove oldest when full
  if (activityLog.length > 100) {
    activityLog.shift();
  }

  console.log(`[ACTIVITY LOG] [${logEntry.timestamp}] ${logEntry.user} - ${logEntry.action} on ${logEntry.page}`);

  res.status(201).json({
    logged: true,
    timestamp
  });
});

// 4. GET /api/logs
app.get('/api/logs', (req, res) => {
  res.json({
    logs: activityLog.slice(-50),
    total: activityLog.length
  });
});

// 5. DELETE /api/logs
app.delete('/api/logs', (req, res) => {
  activityLog = [];
  res.json({
    cleared: true,
    message: 'Activity log cleared'
  });
});

// 6. GET /api/stats
app.get('/api/stats', (req, res) => {
  const memoryUsageMB = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
  res.json({
    totalLogsRecorded: activityLog.length,
    serverStartTime: serverStartTime.toISOString(),
    uptime: process.uptime(),
    nodeVersion: process.version,
    platform: process.platform,
    memoryUsage: `${memoryUsageMB} MB`
  });
});

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    availableRoutes: [
      'GET /api/health',
      'GET /api/app-info',
      'POST /api/log',
      'GET /api/logs',
      'DELETE /api/logs',
      'GET /api/stats'
    ]
  });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log('================================');
  console.log('  TaskFlow Node.js Server');
  console.log('================================');
  console.log(`  Status  : Running`);
  console.log(`  Port    : ${PORT}`);
  console.log(`  App     : ${process.env.APP_NAME}`);
  console.log(`  Version : ${process.env.APP_VERSION}`);
  console.log('================================');
  console.log('  Available endpoints:');
  console.log(`  http://localhost:${PORT}/api/health`);
  console.log(`  http://localhost:${PORT}/api/app-info`);
  console.log(`  http://localhost:${PORT}/api/logs`);
  console.log(`  http://localhost:${PORT}/api/stats`);
  console.log('================================');
});
