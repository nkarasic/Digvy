// Vercel serverless entry: every /api/* request is rewritten here (see
// vercel.json) and req.url keeps the original path, so the Express app's
// full /api/... routes match unchanged.
import app from '../server/app.js';

export default app;
