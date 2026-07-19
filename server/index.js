import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { requireAuth } from './middleware/auth.js';
import itemRoutes from './routes/items.js';
import logRoutes from './routes/logs.js';
import categoryRoutes from './routes/categories.js';
import searchRoutes from './routes/search.js';
import importRoutes from './routes/import.js';
import statsRoutes from './routes/stats.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// CSP disabled: the SPA is served from the same origin and Vite manages assets
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '1mb' }));

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

// Production static serving
if (process.env.NODE_ENV === 'production') {
  const clientDist = join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(join(clientDist, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Digvy server running on http://localhost:${PORT}`);
});
