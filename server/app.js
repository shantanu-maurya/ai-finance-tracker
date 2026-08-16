import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/authRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import budgetRoutes from './routes/budgetRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import reportRoutes from './routes/reportRoutes.js';

/**
 * Connects Mongoose to MongoDB. The error is rethrown rather than swallowed so
 * the bootstrap in server.js can exit the process - the app is useless without
 * a database, and a server that answers requests with 500s is worse than one
 * that refuses to start.
 */
export const connectDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-finance-tracker'
    );
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    throw err;
  }
};

const app = express();

// ---- Security & parsing ---------------------------------------------------
app.use(helmet());

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000'
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // No Origin header => curl, Postman, same-origin, or a server-to-server
      // call. Those are allowed; browsers always send one.
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// 300 requests per 15-minute rolling window, applied to the API surface only
// so the health check stays reachable for uptime monitors.
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many requests from this IP. Please try again in a few minutes.'
    }
  })
);

// ---- Routes ---------------------------------------------------------------
app.get('/health', (req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];

  res.status(200).json({
    success: true,
    status: 'ok',
    database: states[mongoose.connection.readyState] || 'unknown',
    aiProvider: process.env.OPENAI_API_KEY?.startsWith('sk-') &&
      process.env.OPENAI_API_KEY !== 'sk-your_openai_api_key_here'
      ? 'openai'
      : 'heuristic',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);

// ---- 404 + error handler --------------------------------------------------
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);

  const status = err.message?.includes('CORS') ? 403 : err.status || 500;

  res.status(status).json({
    success: false,
    message: status === 403 ? err.message : 'Something went wrong on the server'
  });
});

export default app;
