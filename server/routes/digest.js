import { Router } from 'express';
import { runDigest } from '../services/digestService.js';

const router = Router();

// Vercel Cron calls GET with `Authorization: Bearer ${CRON_SECRET}` when the
// CRON_SECRET env var is set. Fail closed if it isn't configured.
function requireCronSecret(req, res, next) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'CRON_SECRET is not configured' });
  }
  if (req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

async function handleRun(req, res) {
  try {
    const dryRun = req.query.dry === '1';
    const result = await runDigest({ dryRun });
    res.json({
      ok: true,
      dryRun,
      sent: result.sent.length,
      skipped: result.skipped.length,
      errors: result.errors,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET for Vercel Cron; POST for manual curl triggers
router.get('/run', requireCronSecret, handleRun);
router.post('/run', requireCronSecret, handleRun);

export default router;
