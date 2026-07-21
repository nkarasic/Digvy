import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { requireAuth } from './middleware/auth.js';
import { requireAdmin } from './middleware/requireAdmin.js';
import itemRoutes from './routes/items.js';
import logRoutes from './routes/logs.js';
import categoryRoutes from './routes/categories.js';
import searchRoutes from './routes/search.js';
import importRoutes from './routes/import.js';
import statsRoutes from './routes/stats.js';
import digestRoutes from './routes/digest.js';
import emailRoutes from './routes/email.js';
import adminRoutes from './routes/admin/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

// One trusted hop (Vercel's proxy) so rate limiting keys by real client IP
app.set('trust proxy', 1);

// CSP disabled: the SPA is served from the same origin and Vite manages assets
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '1mb' }));

// In-memory store: per-instance on serverless, so this is best-effort there
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

// All API routes require a valid Supabase JWT (auth itself is handled
// client-side by supabase-js: signup, login, refresh, password reset)
app.use('/api/items', requireAuth, itemRoutes);
app.use('/api/items', requireAuth, logRoutes);
app.use('/api/categories', requireAuth, categoryRoutes);
app.use('/api/search', requireAuth, searchRoutes);
app.use('/api/import', requireAuth, importRoutes);
app.use('/api/stats', requireAuth, statsRoutes);

// Operator console. requireAuth verifies the JWT; requireAdmin() enforces at
// least the 'support' role. Destructive routes inside re-gate for 'admin'.
app.use('/api/admin', requireAuth, requireAdmin(), adminRoutes);

// These manage their own auth: CRON_SECRET for the digest trigger,
// unsubscribe token or per-route JWT for email preferences
app.use('/api/digest', digestRoutes);
app.use('/api/email', emailRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Production static serving — not on Vercel, where the CDN serves client/dist
// and only /api/* is rewritten to this app
if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
  const clientDist = join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(join(clientDist, 'index.html'));
  });
}

export default app;
