import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { testConnection, initDatabase } from './config/db.js';

// Route imports
import authRoutes from './routes/auth.js';
import watchlistRoutes from './routes/watchlist.js';
import historyRoutes from './routes/history.js';
import animeRoutes from './routes/anime.js';
import movieRoutes from './routes/movies.js';

dotenv.config();

if (!process.env.JWT_SECRET) {
  console.error('FATAL: process.env.JWT_SECRET is missing. Server will not start without a secure secret.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Trust reverse proxy (Railway, Render, Vercel) for accurate client IP rate limiting
app.set('trust proxy', 1);

// 1. Security Headers via Helmet (configured to allow external anime CDN images & player embeds)
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// 2. Strict CORS Restrictions (locked down to authorized clients only)
const allowedOrigins = [
  process.env.CLIENT_URL,
  'https://aniflex-beta.vercel.app',
  'https://aniflex.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (tools, curl) with no origin header
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Reject untrusted origins cleanly without throwing a 500 error
    return callback(null, false);
  },
  credentials: true,
}));

// 3. Body Parsing with safe size limit
app.use(express.json({ limit: '50kb' }));

// Middleware to catch malformed JSON and payload-too-large errors with 400/413 instead of 500
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Malformed JSON payload' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Payload too large. Maximum size is 50KB.' });
  }
  next(err);
});

// 4. General API Rate Limiter (Max 300 requests per 15 mins per IP across all endpoints)
const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP. Please try again after 15 minutes.' },
});
app.use('/api', generalApiLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/anime', animeRoutes);
app.use('/api/movies', movieRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'OmniFlex API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start Server
app.listen(PORT, async () => {
  console.log(`OmniFlex Backend running on http://localhost:${PORT}`);
  const connected = await testConnection();
  if (connected) {
    await initDatabase();
  }
});
