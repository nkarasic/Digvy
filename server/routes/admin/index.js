import { Router } from 'express';
import * as adminService from '../../services/adminService.js';
import { validate } from '../../middleware/validate.js';
import { emailPreferencesSchema } from '../../schemas.js';

const router = Router();

// Mounted behind requireAuth + requireAdmin('support') in app.js, so every
// route here already has a verified JWT (req.userId) and an operator role
// (req.adminRole). Individual destructive routes re-gate with
// requireAdmin('admin').

// Returns the calling operator's identity and role. The client uses this to
// decide whether to render the console; it's also the simplest way to verify
// the gate with curl.
router.get('/whoami', (req, res) => {
  res.json({ userId: req.userId, role: req.adminRole });
});

// Fleet-wide totals for the dashboard.
router.get('/metrics', async (req, res) => {
  try {
    res.json(await adminService.getMetrics());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// User search/list. Optional ?q= filters by email substring.
router.get('/users', async (req, res) => {
  try {
    res.json(await adminService.listUsers(req.query.q));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Full detail for one user.
router.get('/users/:id', async (req, res) => {
  try {
    const detail = await adminService.getUserDetail(req.params.id);
    if (!detail) return res.status(404).json({ error: 'User not found' });
    res.json(detail);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// A user's items (read-only, enriched).
router.get('/users/:id/items', async (req, res) => {
  try {
    res.json(await adminService.getUserItems(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// A user's recent logs.
router.get('/users/:id/logs', async (req, res) => {
  try {
    res.json(await adminService.getUserLogs(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Recent audit entries.
router.get('/audit', async (req, res) => {
  try {
    res.json(await adminService.listAudit({}));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Recent digest runs (email ops).
router.get('/digest-runs', async (req, res) => {
  try {
    res.json(await adminService.listDigestRuns());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Safe mutating actions (support tier; each writes an audit row) ---

// Resend the digest to a user. Body { dryRun } renders a preview without sending.
router.post('/users/:id/digest', async (req, res) => {
  try {
    const dryRun = req.body?.dryRun === true;
    const results = await adminService.resendDigest({
      actorId: req.userId,
      userId: req.params.id,
      dryRun,
    });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle a user's daily-digest preference on their behalf.
router.patch('/users/:id/preferences', validate(emailPreferencesSchema), async (req, res) => {
  try {
    const result = await adminService.setUserDigestEnabled({
      actorId: req.userId,
      userId: req.params.id,
      enabled: req.body.digest_enabled,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger a password-reset email to a user.
router.post('/users/:id/password-reset', async (req, res) => {
  try {
    const result = await adminService.sendPasswordReset({
      actorId: req.userId,
      userId: req.params.id,
    });
    if (!result) return res.status(404).json({ error: 'User not found' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
