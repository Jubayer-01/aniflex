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
    return callback(new Error(`CORS blocked: Origin ${origin} not permitted.`));
  },
  credentials: true,
}));

// 3. Body Parsing
app.use(express.json());

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
