import express from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import itemRoutes from './routes/items.js';
import logRoutes from './routes/logs.js';
import categoryRoutes from './routes/categories.js';
import searchRoutes from './routes/search.js';
import importRoutes from './routes/import.js';
import statsRoutes from './routes/stats.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// API routes
app.use('/api/items', itemRoutes);
app.use('/api/items', logRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/import', importRoutes);
app.use('/api/stats', statsRoutes);

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
